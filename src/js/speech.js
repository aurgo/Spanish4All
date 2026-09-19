/*!
 * voz.js — Envoltorio sobre la API SpeechSynthesis del navegador.
 *
 * Toda la aplicación habla: el niño todavía no sabe leer, así que ninguna
 * instrucción puede depender de que la lea. Este módulo se encarga de:
 *
 *   - elegir la mejor voz española disponible (prioriza es-ES, luego es-*)
 *   - esperar a que el navegador cargue la lista de voces (llega tarde)
 *   - hablar en secuencia con pausas (sílaba… sílaba… palabra entera)
 *   - sortear las rarezas conocidas: el gesto inicial obligatorio en iOS y
 *     el sintetizador que se "duerme" en Chrome de escritorio
 */
(function (global) {
  'use strict';

  var synth = global.speechSynthesis;
  var supported = !!synth && typeof global.SpeechSynthesisUtterance === 'function';

  var voices = [];
  var chosen = null;
  var preferredURI = null;
  var listeners = [];
  var primed = false;
  var keepAlive = null;
  var currentToken = 0;

  /* Ritmos por defecto. Un lector principiante necesita ir MUY despacio. */
  var RATES = { letra: 0.65, silaba: 0.7, palabra: 0.8, frase: 0.95, voz: 1 };
  var rateScale = 1;   // el ajuste global de velocidad multiplica los anteriores

  function isSpanish(v) { return /^es(\b|[-_])/i.test(v.lang || ''); }
  function isEnglish(v) { return /^en(\b|[-_])/i.test(v.lang || ''); }

  /*
   * Voces que estropean el español sin que se note.
   *
   * El portugués, el catalán y el gallego cierran la "o" final en "u": leen
   * "pato" como "patu" y "lobo" como "lobu". Si el aparato no trae voz
   * española y la app coge "la que haya" — que es lo que hacía —, el niño
   * aprende la vocal que no es y encima nadie se entera, porque suena a
   * idioma parecido. Con el inglés o el chino el destrozo es evidente; con
   * estos tres, no.
   */
  function estropeaVocales(v) {
    return /^(pt|ca|gl|oc|fr|en|zh|yue|ja|ko|th|vi|nl|de|da|sv|nb|no)(\b|[-_])/i.test(v.lang || '');
  }

  /*
   * Lenguas que no son español pero tienen sus mismas cinco vocales y no las
   * cierran al final. Si no hay más remedio, un italiano lee "pato" bastante
   * mejor que un portugués.
   */
  function apaña(v) { return /^(it|eu|id|ms|sw|fi|ro|tr|cs|sk|pl)(\b|[-_])/i.test(v.lang || ''); }

  var hayEspanol = false;
  var motorDecide = false;   // sin voz española, que elija el motor por idioma

  /*
   * Para enseñar los falsos amigos del alfabeto hace falta decir la misma
   * letra en inglés y en español, una detrás de otra. Guardamos aparte una
   * voz inglesa; si el aparato no tiene ninguna, quien llama se entera y
   * enseña sólo el lado español en vez de pronunciarlo con acento español.
   */
  var vozInglesa = null;

  /* Puntuación de una voz: preferimos español de España y voces locales. */
  function score(v) {
    var s = 0;
    var lang = (v.lang || '').toLowerCase().replace('_', '-');
    if (lang.indexOf('es-es') === 0) s += 100;
    else if (lang.indexOf('es') === 0) s += 60;
    if (v.localService) s += 10;
    if (/google/i.test(v.name)) s += 8;      // suelen ser las más naturales
    if (/microsoft|helena|elvira|pablo|alvaro|álvaro/i.test(v.name)) s += 6;
    if (v.default) s += 2;
    return s;
  }

  function mejorDe(lista) {
    return lista.slice().sort(function (a, b) { return score(b) - score(a); })[0] || null;
  }

  function loadVoices() {
    if (!supported) return;
    var all = synth.getVoices() || [];
    if (!all.length) return;

    var espanolas = all.filter(isSpanish);
    hayEspanol = espanolas.length > 0;

    /* En los ajustes se ofrecen todas, pero las españolas primero. */
    voices = espanolas.concat(all.filter(function (v) { return !isSpanish(v); }));

    /* Una voz elegida a mano se respeta, salvo que sea de las que cierran
       las vocales habiendo española disponible: eso fue un despiste. */
    var saved = preferredURI && all.filter(function (v) { return v.voiceURI === preferredURI; })[0];
    if (saved && (isSpanish(saved) || !hayEspanol)) {
      chosen = saved;
      motorDecide = false;
    } else if (hayEspanol) {
      chosen = mejorDe(espanolas);
      motorDecide = false;
    } else {
      /*
       * Sin voz española: primero que lo intente el motor pidiéndole es-ES
       * sin imponerle voz; muchos aparatos tienen una remota aunque no
       * aparezca en la lista. Si falla, se usa la suplente menos mala.
       */
      motorDecide = true;
      var suplentes = all.filter(apaña);
      chosen = mejorDe(suplentes.length ? suplentes : all.filter(function (v) { return !estropeaVocales(v); }))
               || mejorDe(all);
    }

    var inglesas = all.filter(isEnglish);
    vozInglesa = inglesas.filter(function (v) { return v.localService; })[0] || inglesas[0] || null;

    listeners.forEach(function (fn) { try { fn(voices, chosen); } catch (e) {} });
  }

  if (supported) {
    loadVoices();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
    // Algunos navegadores tardan en poblar la lista aunque no emitan el evento.
    var tries = 0;
    var poll = setInterval(function () {
      if (chosen || tries++ > 20) { clearInterval(poll); return; }
      loadVoices();
    }, 250);
  }

  /*
   * Chrome de escritorio detiene el sintetizador tras unos segundos si nadie
   * lo "despierta". Un resume() periódico mientras hablamos lo evita.
   */
  function startKeepAlive() {
    if (keepAlive || !supported) return;
    keepAlive = setInterval(function () {
      if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); }
      else stopKeepAlive();
    }, 5000);
  }
  function stopKeepAlive() {
    if (keepAlive) { clearInterval(keepAlive); keepAlive = null; }
  }

  function cancel() {
    currentToken++;
    stopKeepAlive();
    if (supported) { try { synth.cancel(); } catch (e) {} }
  }

  /*
   * Pronuncia un texto. Devuelve una promesa que se resuelve al terminar
   * (o al cancelarse), para poder encadenar sílabas cómodamente.
   */
  function say(text, opts) {
    opts = opts || {};
    if (!supported || !text) return Promise.resolve(false);

    if (opts.interrupt !== false) cancel();
    var token = currentToken;

    return new Promise(function (resolve) {
      var u = new global.SpeechSynthesisUtterance(String(text));
      var base = typeof opts.rate === 'number' ? opts.rate : (RATES[opts.tipo] || RATES.palabra);
      u.rate = Math.max(0.1, Math.min(2, base * rateScale));
      u.pitch = typeof opts.pitch === 'number' ? opts.pitch : 1.05;   // algo agudo: suena más amable
      u.volume = 1;
      /*
       * El idioma es siempre español. Sólo se impone una voz concreta si es
       * española o si ya sabemos que el motor no sabe hacerlo solo: poner una
       * voz portuguesa aquí es decirle al motor "léelo en portugués".
       */
      u.lang = 'es-ES';
      if (chosen && isSpanish(chosen)) { u.voice = chosen; u.lang = chosen.lang; }
      else if (chosen && !motorDecide) { u.voice = chosen; }

      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        clearTimeout(guard);
        stopKeepAlive();
        resolve(ok);
      }
      u.onend = function () { finish(true); };
      u.onerror = function (ev) {
        /* El motor no sabe español por su cuenta: a partir de ahora, suplente. */
        var causa = (ev && ev.error) || '';
        if (motorDecide && /language|voice|not-allowed|synthesis/i.test(causa)) {
          motorDecide = false;
          if (chosen) {
            try {
              var r = new global.SpeechSynthesisUtterance(String(text));
              r.rate = u.rate; r.pitch = u.pitch; r.volume = 1;
              r.voice = chosen; r.lang = chosen.lang;
              r.onend = function () { finish(true); };
              r.onerror = function () { finish(false); };
              synth.speak(r);
              return;
            } catch (e) {}
          }
        }
        finish(false);
      };

      // Red de seguridad: si el motor nunca contesta, no bloqueamos la actividad.
      var guard = setTimeout(function () { finish(false); },
        2500 + String(text).length * 220 / Math.max(0.3, u.rate));

      try {
        synth.speak(u);
        startKeepAlive();
      } catch (e) { finish(false); }

      // Si alguien cancela mientras hablábamos, liberamos la promesa.
      var watch = setInterval(function () {
        if (token !== currentToken) { clearInterval(watch); finish(false); }
        else if (done) clearInterval(watch);
      }, 120);
    });
  }

  /*
   * Encadena varios textos con pausas entre ellos.
   * partes: [{ text, tipo, pausa, antes(), despues() }]
   */
  function sequence(parts, opts) {
    opts = opts || {};
    cancel();
    var token = currentToken;
    var i = 0;

    function step() {
      if (token !== currentToken || i >= parts.length) return Promise.resolve(token === currentToken);
      var part = parts[i++];
      if (typeof part === 'string') part = { text: part };
      if (part.antes) part.antes(part);
      return say(part.text, { tipo: part.tipo || opts.tipo, rate: part.rate, interrupt: false })
        .then(function () {
          if (part.despues) part.despues(part);
          var pausa = typeof part.pausa === 'number' ? part.pausa : (opts.pausa || 260);
          return new Promise(function (r) { setTimeout(r, pausa); });
        })
        .then(step);
    }
    return step();
  }

  /*
   * iOS y algunos Android exigen que la primera locución nazca de un gesto del
   * usuario. Lanzamos una locución vacía en el primer toque para desbloquear.
   */
  function prime() {
    if (primed || !supported) return;
    primed = true;
    try {
      var u = new global.SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'es-ES';
      synth.speak(u);
    } catch (e) {}
    loadVoices();
  }

  /* Pronuncia algo CON VOZ INGLESA. Devuelve false si no hay ninguna. */
  function sayEnglish(text, opts) {
    opts = opts || {};
    if (!supported || !vozInglesa || !text) return Promise.resolve(false);
    if (opts.interrupt !== false) cancel();
    return new Promise(function (resolve) {
      var u = new global.SpeechSynthesisUtterance(String(text));
      u.voice = vozInglesa;
      u.lang = vozInglesa.lang;
      u.rate = Math.max(0.1, Math.min(2, (opts.rate || 0.75) * rateScale));
      u.pitch = 1;
      var listo = false;
      function fin() { if (!listo) { listo = true; clearTimeout(guarda); resolve(true); } }
      u.onend = fin; u.onerror = fin;
      var guarda = setTimeout(fin, 4000 + String(text).length * 120);
      try { synth.speak(u); startKeepAlive(); } catch (e) { fin(); }
    });
  }

  global.Voz = {
    soportado: supported,
    hablar: say,
    hablarEnIngles: sayEnglish,
    hayVozInglesa: function () { return !!vozInglesa; },
    secuencia: sequence,
    parar: cancel,
    preparar: prime,
    voces: function () { return voices.slice(); },
    vozActual: function () { return chosen; },
    /*
     * "aMano" distingue al adulto eligiendo en los ajustes de la app
     * restaurando lo que había guardado. Lo segundo se filtra: si un día no
     * había voz española y quedó apuntada una portuguesa, el día que se
     * instale la española tiene que ganar la española, sin que nadie tenga
     * que acordarse de volver a los ajustes.
     */
    elegirVoz: function (uri, aMano) {
      var v = voices.filter(function (x) { return x.voiceURI === uri; })[0];
      if (v && !aMano && hayEspanol && !isSpanish(v)) { loadVoices(); return chosen; }
      preferredURI = uri || null;
      if (v) { chosen = v; motorDecide = false; } else loadVoices();
      return chosen;
    },
    velocidad: function (v) {
      if (typeof v === 'number') rateScale = Math.max(0.4, Math.min(1.8, v));
      return rateScale;
    },
    alCargarVoces: function (fn) {
      listeners.push(fn);
      if (chosen) fn(voices, chosen);
    },
    hayVozEspanola: function () { return hayEspanol; },

    /* Lo que hace falta para poder avisar al adulto con detalle: sin esto,
       un aparato sin español suena raro y nadie sabe por qué. */
    estado: function () {
      var todas = (supported && synth.getVoices && synth.getVoices()) || [];
      return {
        soportado: supported,
        hayEspanol: hayEspanol,
        motorDecide: motorDecide,
        cuantas: todas.length,
        usando: chosen ? { nombre: chosen.name, lang: chosen.lang, espanol: isSpanish(chosen) } : null
      };
    },
    esEspanola: function (v) { return !!v && isSpanish(v); }
  };
})(window);
