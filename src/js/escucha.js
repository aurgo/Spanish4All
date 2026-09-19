/*!
 * escucha.js — El micrófono del navegador (Web Speech API, reconocimiento).
 *
 * Permite que el niño lea en voz alta y la app compruebe qué ha dicho, sin
 * instalar nada. Envuelve SpeechRecognition, que es una API con bastantes
 * asperezas:
 *
 *   - Se llama webkitSpeechRecognition en casi todos los navegadores.
 *   - Exige contexto seguro (https o localhost). Desde file:// suele fallar.
 *   - start() lanza excepción si ya estaba escuchando.
 *   - A veces termina sin devolver nada y sin dar error.
 *   - Chrome puede procesar el audio en sus servidores; si el navegador sabe
 *     hacerlo en el dispositivo, se lo pedimos (processLocally).
 *
 * Pedimos varias alternativas a propósito: el niño puede pronunciar bien y el
 * reconocedor escribir un homófono ("baca" por "vaca"). Puntuamos la mejor de
 * todas, que es lo justo.
 */
(function (global) {
  'use strict';

  var SR = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  var soportado = !!SR;
  var rec = null;
  var activo = false;
  var detener = null;   // cierra la escucha en curso y devuelve lo oído
  var permiso = 'desconocido';   // desconocido | concedido | denegado
  var enDispositivo = false;

  /* ¿Sabe este navegador reconocer sin mandar el audio fuera? */
  function comprobarLocal() {
    if (!soportado || typeof SR.availableOnDevice !== 'function') return;
    try {
      Promise.resolve(SR.availableOnDevice('es-ES')).then(function (r) {
        enDispositivo = (r === 'available' || r === true);
      }).catch(function () {});
    } catch (e) {}
  }
  comprobarLocal();

  function seguro() {
    return global.isSecureContext !== false;
  }

  function parar() {
    activo = false;
    if (!rec) return;
    try { rec.abort(); } catch (e) {}
    rec = null;
  }

  /*
   * Escucha una frase y devuelve lo que ha entendido.
   * Resuelve siempre — nunca rechaza — con { ok, textos[], error }.
   *
   *   onParcial(texto)  se llama mientras habla, para dar señal de vida
   *   maxMs             corta solo si el reconocedor se queda colgado
   */
  function escuchar(opciones) {
    opciones = opciones || {};
    if (!soportado) return Promise.resolve({ ok: false, textos: [], error: 'no-soportado' });
    if (!seguro()) return Promise.resolve({ ok: false, textos: [], error: 'no-seguro' });
    if (activo) parar();

    return new Promise(function (resolver) {
      var terminado = false;
      var textos = [];
      var seguido = '';          // lo acumulado en modo continuo
      var errorFinal = null;
      var arranque = 0;

      function acabar(err) {
        if (terminado) return;
        terminado = true;
        activo = false;
        detener = null;
        clearTimeout(guarda);
        try { if (rec) rec.stop(); } catch (e) {}
        rec = null;
        var segundos = arranque ? (Date.now() - arranque) / 1000 : 0;
        if (seguido) textos = [seguido];
        if (textos.length) {
          permiso = 'concedido';
          resolver({ ok: true, textos: textos, error: null, segundos: segundos });
        } else {
          resolver({ ok: false, textos: [], error: err || errorFinal || 'sin-voz', segundos: segundos });
        }
      }

      try {
        rec = new SR();
      } catch (e) {
        return resolver({ ok: false, textos: [], error: 'no-soportado' });
      }

      rec.lang = opciones.idioma || 'es-ES';
      rec.interimResults = true;
      /*
       * Para una palabra o una frase basta con parar en la primera pausa.
       * Para un cuento no: un niño que empieza se para entre línea y línea, y
       * el reconocedor lo tomaría por final. En modo continuo seguimos
       * escuchando hasta que él dice que ha terminado.
       */
      rec.continuous = !!opciones.continuo;
      rec.maxAlternatives = opciones.continuo ? 1 : 5;
      /* Si el navegador sabe hacerlo en local, que no salga el audio. */
      try { if (enDispositivo) rec.processLocally = true; } catch (e) {}

      rec.onresult = function (ev) {
        var parcial = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var r = ev.results[i];
          if (r.isFinal) {
            if (opciones.continuo) {
              /* Un texto largo llega a trozos: se van encadenando. */
              seguido += (seguido ? ' ' : '') + (r[0].transcript || '').trim();
            } else {
              for (var j = 0; j < r.length; j++) {
                var t = (r[j].transcript || '').trim();
                if (t && textos.indexOf(t) === -1) textos.push(t);
              }
            }
          } else {
            parcial += r[0].transcript;
          }
        }
        if (opciones.onParcial) {
          opciones.onParcial(((seguido ? seguido + ' ' : '') + parcial).trim() || textos[0] || '');
        }
      };

      rec.onerror = function (ev) {
        errorFinal = ev.error || 'error';
        if (errorFinal === 'not-allowed' || errorFinal === 'service-not-allowed') {
          permiso = 'denegado';
        }
        acabar(errorFinal);
      };

      rec.onend = function () { acabar(null); };

      var guarda = setTimeout(function () { acabar('tiempo'); },
        opciones.maxMs || 9000);

      try {
        activo = true;
        arranque = Date.now();
        detener = function () { acabar(null); };
        rec.start();
        if (opciones.alEmpezar) opciones.alEmpezar();
      } catch (e) {
        acabar('no-arranca');
      }
    });
  }

  /*
   * Cada fallo, en español y en chino tradicional. Estos mensajes los lee el
   * niño en pantalla, y si sólo estuvieran en español no se enteraría de por
   * qué no funciona el micrófono.
   */
  var MENSAJES = {
    'no-soportado': ['Este navegador no puede escuchar. Prueba con Chrome, Edge o Safari.',
                     '這個瀏覽器不能聽。請用 Chrome、Edge 或 Safari。'],
    'no-seguro': ['El micrófono necesita una página segura (https).',
                  '麥克風需要安全網頁（https）。'],
    'not-allowed': ['No me has dado permiso para usar el micrófono.',
                    '你還沒有允許我使用麥克風。'],
    'service-not-allowed': ['El navegador ha bloqueado el micrófono.', '瀏覽器擋住了麥克風。'],
    'audio-capture': ['No encuentro ningún micrófono.', '找不到麥克風。'],
    'no-speech': ['No he oído nada. Acércate y prueba otra vez.', '我沒聽到。靠近一點再試一次。'],
    'sin-voz': ['No he oído nada. Acércate y prueba otra vez.', '我沒聽到。靠近一點再試一次。'],
    'network': ['El micrófono necesita internet en este navegador.', '這個瀏覽器的麥克風需要網路。'],
    'aborted': ['Se ha cortado la escucha.', '收聽中斷了。'],
    'tiempo': ['He esperado mucho. Prueba otra vez.', '等太久了。再試一次。'],
    'no-arranca': ['No he podido encender el micrófono.', '我無法開啟麥克風。']
  };

  /* ¿Hay que enseñar también el chino? Lo decide el ajuste del niño. */
  function conChino() {
    try { return !!(global.Textos && global.Textos.usarChino()); } catch (e) { return false; }
  }

  global.Escucha = {
    soportado: soportado,
    disponible: function () { return soportado && seguro() && permiso !== 'denegado'; },
    contextoSeguro: seguro,
    enDispositivo: function () { return enDispositivo; },
    permiso: function () { return permiso; },
    escuchar: escuchar,
    /* En modo continuo, el niño decide cuándo ha terminado de leer. */
    terminar: function () { if (detener) detener(); },
    parar: parar,
    /* Para mostrar: las dos lenguas. Para hablar: sólo español. */
    mensaje: function (codigo) {
      var m = MENSAJES[codigo] || ['Algo no ha ido bien con el micrófono.', '麥克風出了點問題。'];
      return conChino() && m[1] ? m[0] + '\n' + m[1] : m[0];
    },
    mensajeEs: function (codigo) {
      var m = MENSAJES[codigo] || ['Algo no ha ido bien con el micrófono.'];
      return m[0];
    }
  };
})(window);
