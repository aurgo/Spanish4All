/*!
 * Qué voz coge la app, y en qué idioma habla.
 *
 * El fallo que motivó estas pruebas: en un aparato sin voz española la app
 * cogía "la que hubiera". Con una voz portuguesa, catalana o gallega, "pato"
 * suena "patu" y "lobo" suena "lobu" — el niño aprende la vocal que no es y
 * suena lo bastante parecido como para que nadie lo note en días.
 *
 * Aquí se monta un aparato de mentira con las voces que se quiera y se mira
 * qué acaba pidiéndole la app al sintetizador.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function voz(name, lang, local) {
  return { voiceURI: name + '|' + lang, name, lang, localService: local !== false, default: false };
}

/* Un navegador de mentira: guarda todo lo que se le manda decir. */
function aparato(vocesDisponibles, opciones) {
  opciones = opciones || {};
  const dichas = [];
  const ventana = {
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    speechSynthesis: {
      speaking: false, paused: false,
      getVoices: () => vocesDisponibles,
      addEventListener() {}, removeEventListener() {},
      speak(u) {
        dichas.push({ texto: u.text, lang: u.lang, voz: u.voice ? u.voice.name : null,
                      vozLang: u.voice ? u.voice.lang : null });
        /* Un motor que no sabe el idioma que le piden avisa con un error. */
        if (opciones.falla && !u.voice) {
          setTimeout(() => u.onerror && u.onerror({ error: 'language-unavailable' }), 1);
        } else {
          setTimeout(() => u.onend && u.onend(), 1);
        }
      },
      cancel() {}, pause() {}, resume() {}
    },
    SpeechSynthesisUtterance: function (t) { this.text = t; this.rate = 1; this.voice = null; },
    setTimeout, clearTimeout, setInterval, clearInterval
  };
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'speech.js'), 'utf8');
  new Function('window', src)(ventana);
  return { Voz: ventana.Voz, dichas };
}

const espera = ms => new Promise(r => setTimeout(r, ms));

module.exports = async function () {
  const fallos = [];
  let total = 0;
  const comprobar = (ok, q) => { total++; if (!ok) fallos.push('  ✗ ' + q); };

  const ES = voz('Mónica', 'es-ES');
  const MX = voz('Paulina', 'es-MX');
  const PT = voz('Luciana', 'pt-BR');
  const CA = voz('Montse', 'ca-ES');
  const GL = voz('Carmela', 'gl-ES');
  const EN = voz('Samantha', 'en-US');
  const IT = voz('Alice', 'it-IT');
  const ZH = voz('Mei-Jia', 'zh-TW');

  /* --- 1. con voz española, se usa la española --- */
  {
    const a = aparato([EN, PT, ES, ZH]);
    a.Voz.hablar('pato');
    comprobar(a.dichas.length === 1, 'se dice algo');
    comprobar(a.dichas[0].vozLang === 'es-ES',
      `con española disponible debería usarla, y usa ${a.dichas[0].vozLang}`);
    comprobar(a.Voz.hayVozEspanola() === true, 'y sabe que la tiene');
  }

  /* --- 2. el fallo de verdad: sin española, NUNCA una que cierre las vocales --- */
  [PT, CA, GL].forEach(mala => {
    const a = aparato([mala, ZH]);
    a.Voz.hablar('pato');
    const d = a.dichas[0];
    comprobar(d.voz === null,
      `sin voz española no puede imponer ${mala.lang} (impuso ${d.voz})`);
    comprobar(/^es/.test(d.lang),
      `y tiene que pedir español de todos modos, no ${d.lang}`);
    comprobar(a.Voz.hayVozEspanola() === false, `sabe que no hay española (${mala.lang})`);
  });

  /* --- 3. si el motor no sabe español solo, reintenta con la suplente --- */
  {
    const a = aparato([PT, IT, ZH], { falla: true });
    a.Voz.hablar('pato');
    await espera(30);
    comprobar(a.dichas.length === 2,
      `debería reintentar cuando el motor dice que no sabe el idioma (intentos: ${a.dichas.length})`);
    const segundo = a.dichas[1] || {};
    comprobar(segundo.vozLang === 'it-IT',
      `y el reintento va con la suplente italiana, no con ${segundo.vozLang}`);
  }

  /* --- 4. español siempre, venga la voz que venga --- */
  {
    const a = aparato([EN]);
    a.Voz.hablar('mesa');
    comprobar(/^es/.test(a.dichas[0].lang),
      `el idioma pedido tiene que ser español, no ${a.dichas[0].lang}`);
  }

  /* --- 5. la suplente elegida no puede ser de las que estropean --- */
  {
    const a = aparato([PT, IT, EN, ZH]);
    const e = a.Voz.estado();
    comprobar(e.usando && /^it/.test(e.usando.lang),
      `entre portuguesa, italiana, inglesa y china la suplente debería ser la italiana, y es ${e.usando && e.usando.lang}`);
    comprobar(e.hayEspanol === false, 'y sigue avisando de que no hay española');
  }

  /* --- 6. una voz elegida a mano se respeta si es española --- */
  {
    const a = aparato([ES, MX, PT]);
    a.Voz.elegirVoz(MX.voiceURI);
    a.Voz.hablar('pato');
    comprobar(a.dichas[0].voz === 'Paulina', 'la voz elegida a mano manda');
  }

  /* --- 7. ...pero una guardada de cuando no había española, no --- */
  {
    /* Así arranca la app: restaura lo apuntado en los ajustes. */
    const a = aparato([ES, PT]);
    a.Voz.elegirVoz(PT.voiceURI);          /* sin "aMano": es una restauración */
    a.Voz.hablar('pato');
    comprobar(a.dichas[0].vozLang !== 'pt-BR',
      `una portuguesa apuntada de antes no debería ganarle a la española (usó ${a.dichas[0].vozLang})`);
    comprobar(a.dichas[0].vozLang === 'es-ES', 'sino que gana la española');
  }

  /* --- 7b. si el adulto la elige a mano en los ajustes, manda él --- */
  {
    const a = aparato([ES, PT]);
    a.Voz.elegirVoz(PT.voiceURI, true);
    a.Voz.hablar('pato');
    comprobar(a.dichas[0].vozLang === 'pt-BR',
      'lo elegido a mano en los ajustes se respeta');
  }

  /* --- 8. sin ninguna voz, la app no se rompe --- */
  {
    const a = aparato([]);
    let ok = true;
    try { a.Voz.hablar('hola'); } catch (e) { ok = false; }
    comprobar(ok, 'sin voces instaladas no puede petar');
  }

  return { nombre: 'Voz y pronunciación', total, fallos };
};
