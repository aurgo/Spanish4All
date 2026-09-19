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
      var errorFinal = null;

      function acabar(err) {
        if (terminado) return;
        terminado = true;
        activo = false;
        clearTimeout(guarda);
        try { if (rec) rec.stop(); } catch (e) {}
        rec = null;
        if (textos.length) { permiso = 'concedido'; resolver({ ok: true, textos: textos, error: null }); }
        else resolver({ ok: false, textos: [], error: err || errorFinal || 'sin-voz' });
      }

      try {
        rec = new SR();
      } catch (e) {
        return resolver({ ok: false, textos: [], error: 'no-soportado' });
      }

      rec.lang = opciones.idioma || 'es-ES';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 5;
      /* Si el navegador sabe hacerlo en local, que no salga el audio. */
      try { if (enDispositivo) rec.processLocally = true; } catch (e) {}

      rec.onresult = function (ev) {
        var parcial = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var r = ev.results[i];
          if (r.isFinal) {
            for (var j = 0; j < r.length; j++) {
              var t = (r[j].transcript || '').trim();
              if (t && textos.indexOf(t) === -1) textos.push(t);
            }
          } else {
            parcial += r[0].transcript;
          }
        }
        if (parcial && opciones.onParcial) opciones.onParcial(parcial.trim());
        if (textos.length && opciones.onParcial) opciones.onParcial(textos[0]);
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
        rec.start();
        if (opciones.alEmpezar) opciones.alEmpezar();
      } catch (e) {
        acabar('no-arranca');
      }
    });
  }

  /* Mensajes en español para cada fallo posible. */
  var MENSAJES = {
    'no-soportado': 'Este navegador no tiene micrófono para leer en voz alta. Prueba con Chrome, Edge o Safari.',
    'no-seguro': 'El micrófono necesita una página segura (https). Abre la app desde un enlace https o desde un servidor local.',
    'not-allowed': 'No me has dado permiso para usar el micrófono. Puedes darlo en el candado de la barra de direcciones.',
    'service-not-allowed': 'El navegador ha bloqueado el micrófono. Revisa los permisos del sitio.',
    'audio-capture': 'No encuentro ningún micrófono conectado.',
    'no-speech': 'No he oído nada. Acerca el micrófono y prueba otra vez.',
    'sin-voz': 'No he oído nada. Acerca el micrófono y prueba otra vez.',
    'network': 'El reconocimiento necesita conexión a internet en este navegador.',
    'aborted': 'Se ha cortado la escucha.',
    'tiempo': 'He esperado mucho. Prueba otra vez.',
    'no-arranca': 'No he podido encender el micrófono. Prueba otra vez.'
  };

  global.Escucha = {
    soportado: soportado,
    disponible: function () { return soportado && seguro() && permiso !== 'denegado'; },
    contextoSeguro: seguro,
    enDispositivo: function () { return enDispositivo; },
    permiso: function () { return permiso; },
    escuchar: escuchar,
    parar: parar,
    mensaje: function (codigo) { return MENSAJES[codigo] || 'Algo no ha ido bien con el micrófono.'; }
  };
})(window);
