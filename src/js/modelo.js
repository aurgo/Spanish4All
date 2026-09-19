/*!
 * modelo.js — El modelo de lenguaje integrado en el navegador (opcional).
 *
 * Chrome incorpora un modelo pequeño en el propio navegador (Gemini Nano) a
 * través de la Prompt API. Cuando está disponible, lo usamos para UNA cosa
 * concreta: convertir la puntuación en un comentario de maestro, con el tono
 * de alguien que anima en vez de corregir.
 *
 * Es un extra, nunca un requisito:
 *   - Hoy sólo existe en Chrome de escritorio reciente, y necesita descargar
 *     el modelo (varios GB) la primera vez. En tableta o móvil no habrá nada.
 *   - Si no está, evaluar.js ya da un diagnóstico propio y bastante fino
 *     (erre fuerte, sílaba comida, vocal cambiada…). La app no pierde nada.
 *
 * Todo va envuelto en try/catch y con límite de tiempo: si el modelo tarda o
 * falla, el niño ve igualmente su comentario al instante.
 *
 * Sólo le pedimos el texto en español. La versión china sale de nuestras
 * propias cadenas, que están revisadas; un modelo pequeño mezclaría con
 * facilidad chino tradicional y simplificado.
 */
(function (global) {
  'use strict';

  var sesion = null;
  var estado = 'sin-comprobar';
  var comprobando = null;

  var SISTEMA =
    'Eres un maestro de lectura paciente y alegre que ayuda a un niño de siete ' +
    'años a aprender a leer en español. El niño ya habla español pero está ' +
    'aprendiendo a descifrar las letras. Responde SIEMPRE con una sola frase ' +
    'corta, en español sencillo, en segunda persona y con tono de ánimo. ' +
    'Si hay un error, di en qué sonido concreto está, sin regañar. ' +
    'No uses listas, ni comillas, ni emoji.';

  /* Las dos formas en que los navegadores han expuesto esta API. */
  function apiNueva() {
    return (typeof global.LanguageModel !== 'undefined') ? global.LanguageModel : null;
  }
  function apiAntigua() {
    return (global.ai && global.ai.languageModel) ? global.ai.languageModel : null;
  }

  function conLimite(promesa, ms, porDefecto) {
    return Promise.race([
      promesa,
      new Promise(function (r) { setTimeout(function () { r(porDefecto); }, ms); })
    ]);
  }

  /* ¿Hay modelo? Devuelve 'no-existe' | 'descargable' | 'listo' | 'error'. */
  function comprobar() {
    if (comprobando) return comprobando;
    comprobando = new Promise(function (resolver) {
      var nueva = apiNueva();
      var antigua = apiAntigua();
      if (!nueva && !antigua) { estado = 'no-existe'; return resolver(estado); }

      try {
        if (nueva && typeof nueva.availability === 'function') {
          Promise.resolve(nueva.availability()).then(function (d) {
            estado = d === 'available' ? 'listo'
              : (d === 'downloadable' || d === 'downloading') ? 'descargable' : 'no-existe';
            resolver(estado);
          }).catch(function () { estado = 'error'; resolver(estado); });
          return;
        }
        if (antigua && typeof antigua.capabilities === 'function') {
          Promise.resolve(antigua.capabilities()).then(function (c) {
            var d = c && c.available;
            estado = d === 'readily' ? 'listo'
              : d === 'after-download' ? 'descargable' : 'no-existe';
            resolver(estado);
          }).catch(function () { estado = 'error'; resolver(estado); });
          return;
        }
      } catch (e) {}
      estado = 'error';
      resolver(estado);
    });
    return comprobando;
  }

  /*
   * Abre la sesión la primera vez que hace falta. Se llama desde un gesto del
   * niño (el botón del micrófono), que es lo que Chrome exige para autorizar
   * la descarga del modelo.
   */
  function abrir() {
    if (sesion) return Promise.resolve(sesion);
    var nueva = apiNueva();
    var antigua = apiAntigua();
    try {
      if (nueva && typeof nueva.create === 'function') {
        return Promise.resolve(nueva.create({
          initialPrompts: [{ role: 'system', content: SISTEMA }]
        })).then(function (s) { sesion = s; return s; }).catch(function () { return null; });
      }
      if (antigua && typeof antigua.create === 'function') {
        return Promise.resolve(antigua.create({ systemPrompt: SISTEMA }))
          .then(function (s) { sesion = s; return s; }).catch(function () { return null; });
      }
    } catch (e) {}
    return Promise.resolve(null);
  }

  /*
   * Un comentario sobre la lectura. Devuelve null si no hay modelo, si tarda
   * demasiado o si responde algo raro: quien llama ya tiene su alternativa.
   */
  function comentar(datos) {
    return comprobar().then(function (e) {
      if (e !== 'listo' && e !== 'descargable') return null;
      return abrir();
    }).then(function (s) {
      if (!s) return null;

      var partes = [
        'El niño tenía que leer en voz alta: "' + datos.objetivo + '".',
        datos.oido ? 'El micrófono ha entendido: "' + datos.oido + '".'
                   : 'El micrófono no ha entendido nada.',
        'Puntuación: ' + datos.nota + ' sobre 100.'
      ];
      if (datos.pista) partes.push('Pista detectada: ' + datos.pista);
      partes.push('Escribe una sola frase corta para el niño.');

      var peticion;
      try { peticion = Promise.resolve(s.prompt(partes.join(' '))); }
      catch (err) { return null; }

      return conLimite(peticion, 6000, null).then(function (texto) {
        if (!texto || typeof texto !== 'string') return null;
        var limpio = texto.trim().replace(/^["'«»\s]+|["'«»\s]+$/g, '').split('\n')[0];
        /* Una frase larguísima sería del modelo desviándose: mejor descartarla. */
        if (!limpio || limpio.length > 220) return null;
        return limpio;
      }).catch(function () { return null; });
    }).catch(function () { return null; });
  }

  global.Modelo = {
    comprobar: comprobar,
    estado: function () { return estado; },
    existe: function () { return !!(apiNueva() || apiAntigua()); },
    comentar: comentar,
    cerrar: function () {
      try { if (sesion && sesion.destroy) sesion.destroy(); } catch (e) {}
      sesion = null;
    }
  };
})(window);
