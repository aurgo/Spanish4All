/*!
 * silabeador.js — División silábica del español.
 *
 * Implementa las reglas ortográficas de la RAE con el detalle suficiente para
 * cubrir el vocabulario infantil y, en general, cualquier palabra en español:
 *
 *   - Dígrafos indivisibles: ch, ll, rr, qu, gu (ante e/i)
 *   - Grupos consonánticos inseparables: bl cl fl gl kl pl / br cr dr fr gr kr pr tr
 *   - Diptongos, triptongos e hiatos (incluida la tilde en vocal débil)
 *   - "y" con valor vocálico a final de sílaba (rey, muy, hoy)
 *   - "ü" como vocal débil (pingüino, cigüeña)
 *   - Repartos de 2, 3 y 4 consonantes intervocálicas (car-ta, ins-tru-men-to, obs-truir)
 *
 * Además calcula la sílaba tónica, que la app usa para resaltarla.
 *
 * Sin dependencias. Funciona como <script> clásico (window.Silabas) y en Node.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Silabas = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STRONG = 'aeoáéó';
  var WEAK = 'iuü';
  var WEAK_ACCENTED = 'íú';
  var VOWELS = STRONG + WEAK + WEAK_ACCENTED;
  var FRONT = 'eiéí';

  /* Letras que pueden formar parte de una palabra española. */
  var LETTER_RE = /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/;

  var L_CLUSTER = { b: 1, c: 1, f: 1, g: 1, k: 1, p: 1 };   // bl, cl, fl, gl, kl, pl (no dl, no tl)
  var R_CLUSTER = { b: 1, c: 1, d: 1, f: 1, g: 1, k: 1, p: 1, t: 1 }; // br, cr, dr, fr, gr, kr, pr, tr

  function isVowel(ch) { return !!ch && VOWELS.indexOf(ch) !== -1; }
  function isStrong(ch) { return STRONG.indexOf(ch) !== -1; }
  function isWeakAccented(ch) { return WEAK_ACCENTED.indexOf(ch) !== -1; }
  function isFront(ch) { return !!ch && FRONT.indexOf(ch) !== -1; }
  function isLetter(ch) { return !!ch && LETTER_RE.test(ch); }

  /* Un par de consonantes que jamás se separa: consonante + l/r. */
  function inseparable(a, b) {
    if (a.length !== 1 || b.length !== 1) return false; // los dígrafos no forman grupo
    if (b === 'l') return L_CLUSTER[a] === 1;
    if (b === 'r') return R_CLUSTER[a] === 1;
    return false;
  }

  /*
   * Divide la palabra en unidades: cada unidad es una vocal o una consonante,
   * donde los dígrafos (ch, ll, rr, qu, gu) cuentan como UNA consonante.
   * Guarda los índices sobre la cadena original para poder reconstruirla con
   * su acentuación y mayúsculas intactas.
   */
  function toUnits(lower) {
    var out = [];
    var i = 0;
    var n = lower.length;
    while (i < n) {
      var c = lower[i], c2 = lower[i + 1], c3 = lower[i + 2];

      if (isVowel(c)) { out.push({ t: 'V', s: i, e: i + 1, v: c }); i += 1; continue; }

      // "y" es vocal (semivocal) cuando cierra sílaba: rey, muy, hoy, y.
      if (c === 'y' && !isVowel(c2)) { out.push({ t: 'V', s: i, e: i + 1, v: 'i' }); i += 1; continue; }

      if (c === 'c' && c2 === 'h') { out.push({ t: 'C', s: i, e: i + 2, v: 'ch' }); i += 2; continue; }
      if (c === 'l' && c2 === 'l') { out.push({ t: 'C', s: i, e: i + 2, v: 'll' }); i += 2; continue; }
      if (c === 'r' && c2 === 'r') { out.push({ t: 'C', s: i, e: i + 2, v: 'rr' }); i += 2; continue; }
      // qu / gu con "u" muda: sólo ante e, i.
      if (c === 'q' && c2 === 'u' && isFront(c3)) { out.push({ t: 'C', s: i, e: i + 2, v: 'qu' }); i += 2; continue; }
      if (c === 'g' && c2 === 'u' && isFront(c3)) { out.push({ t: 'C', s: i, e: i + 2, v: 'gu' }); i += 2; continue; }

      out.push({ t: 'C', s: i, e: i + 1, v: c });
      i += 1;
    }
    return out;
  }

  /* ¿Se unen estas dos vocales en el mismo núcleo (diptongo) o hay hiato? */
  function joinsWith(prev, next) {
    if (isStrong(prev) && isStrong(next)) return false;   // le-ón, te-a-tro
    if (isWeakAccented(next)) return false;               // pa-ís, ba-úl
    if (isWeakAccented(prev)) return false;               // rí-o, dú-o
    return true;                                          // ai, ua, ie, ui...
  }

  /*
   * Agrupa las unidades en núcleos vocálicos con sus consonantes intermedias.
   * Devuelve { onset, nuclei[], codas[] } en forma de lista de sílabas.
   */
  function splitUnits(units) {
    var groups = [];   // núcleos: cada uno es una lista de unidades vocálicas
    var runs = [];     // consonantes previas a cada núcleo
    var pending = [];  // consonantes acumuladas

    var i = 0;
    while (i < units.length) {
      if (units[i].t === 'C') { pending.push(units[i]); i += 1; continue; }

      // Serie de vocales consecutivas → uno o más núcleos.
      var vowels = [];
      while (i < units.length && units[i].t === 'V') { vowels.push(units[i]); i += 1; }

      var j = 0;
      while (j < vowels.length) {
        var nucleus = [vowels[j]];
        j += 1;
        while (
          j < vowels.length &&
          nucleus.length < 3 &&
          joinsWith(nucleus[nucleus.length - 1].v, vowels[j].v)
        ) {
          nucleus.push(vowels[j]);
          j += 1;
        }
        groups.push(nucleus);
        runs.push(pending);
        pending = [];
      }
    }

    return { groups: groups, runs: runs, tail: pending };
  }

  /*
   * Reparte un grupo de consonantes entre la coda de la sílaba anterior y el
   * ataque de la siguiente, según el número de consonantes.
   */
  function shareConsonants(run) {
    var L = run.length;
    if (L === 0) return { coda: [], onset: [] };
    if (L === 1) return { coda: [], onset: run };                       // ca-sa
    if (L === 2) {
      return inseparable(run[0].v, run[1].v)
        ? { coda: [], onset: run }                                      // ha-blar
        : { coda: [run[0]], onset: [run[1]] };                          // car-ta
    }
    if (L === 3) {
      return inseparable(run[1].v, run[2].v)
        ? { coda: [run[0]], onset: [run[1], run[2]] }                   // ins-tru-...
        : { coda: [run[0], run[1]], onset: [run[2]] };                  // cons-tan-te
    }
    // 4 o más: el grupo inseparable final se lleva el ataque.
    return inseparable(run[L - 2].v, run[L - 1].v)
      ? { coda: run.slice(0, L - 2), onset: run.slice(L - 2) }          // obs-truir
      : { coda: run.slice(0, L - 1), onset: run.slice(L - 1) };
  }

  /* Divide UNA palabra (sólo letras) en sílabas. */
  function syllabifyWord(word) {
    if (!word) return [];
    var lower = word.toLowerCase();
    var units = toUnits(lower);
    if (!units.length) return [word];

    var split = splitUnits(units);
    var groups = split.groups;
    if (!groups.length) return [word];   // p. ej. una sigla sin vocales

    // Frontera inicial de cada sílaba, como índice sobre la palabra original.
    var starts = [0];
    for (var k = 1; k < groups.length; k++) {
      var share = shareConsonants(split.runs[k]);
      var start = share.onset.length ? share.onset[0].s : groups[k][0].s;
      starts.push(start);
    }

    var out = [];
    for (var m = 0; m < starts.length; m++) {
      var end = m + 1 < starts.length ? starts[m + 1] : word.length;
      out.push(word.slice(starts[m], end));
    }
    return out.filter(function (s) { return s.length > 0; });
  }

  /*
   * Índice de la sílaba tónica.
   *   - Con tilde: la sílaba que la lleva.
   *   - Sin tilde y acabada en vocal, -n o -s: penúltima (llana).
   *   - En los demás casos: última (aguda).
   */
  function stressIndex(syllables) {
    if (!syllables.length) return -1;
    for (var i = 0; i < syllables.length; i++) {
      if (/[áéíóú]/i.test(syllables[i])) return i;
    }
    if (syllables.length === 1) return 0;
    var last = syllables[syllables.length - 1].toLowerCase();
    var lastChar = last[last.length - 1];
    if (isVowel(lastChar) || lastChar === 'n' || lastChar === 's' || lastChar === 'y') {
      return syllables.length - 2;
    }
    return syllables.length - 1;
  }

  /*
   * Trocea un texto en piezas: { type: 'word' | 'other', text, syllables }.
   * Conserva espacios y puntuación para poder pintar el texto tal cual.
   */
  function tokenize(text) {
    var tokens = [];
    var buffer = '';
    var isWordBuffer = false;

    function flush() {
      if (!buffer) return;
      tokens.push(isWordBuffer
        ? { type: 'word', text: buffer, syllables: syllabifyWord(buffer) }
        : { type: 'other', text: buffer });
      buffer = '';
    }

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var wordish = isLetter(ch);
      if (wordish !== isWordBuffer) { flush(); isWordBuffer = wordish; }
      buffer += ch;
    }
    flush();
    return tokens;
  }

  /* Sólo las palabras de un texto, ya silabeadas. */
  function words(text) {
    return tokenize(text).filter(function (t) { return t.type === 'word'; });
  }

  return {
    syllabify: syllabifyWord,
    stressIndex: stressIndex,
    tokenize: tokenize,
    words: words,
    isVowel: isVowel
  };
});
