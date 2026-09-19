/*!
 * La regla de oro del currículo: una palabra no puede usar una letra que aún
 * no se haya enseñado. Sin esto el niño adivina en vez de leer.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* curriculum.js se escribió para el navegador; lo cargamos con un window falso. */
function cargarCurriculo() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'curriculum.js'), 'utf8');
  const ventana = {};
  new Function('window', src)(ventana);
  return ventana.Curriculo;
}

/* Letras que estrena cada unidad. Las que no estrenan ninguna van vacías. */
const NUEVAS = {
  vocales: 'aeiou', m: 'm', p: 'p', l: 'l', s: 's', t: 't', n: 'n', d: 'd',
  'c-fuerte': 'c', b: 'b', v: 'v', f: 'f', 'r-suave': 'r', rr: 'r', j: 'j',
  'g-fuerte': 'g', 'gue-gui': '', 'ge-gi': '', h: 'h', 'ñ': 'ñ', ll: '', ch: '',
  y: 'y', qu: 'q', 'z-ce-ci': 'z', 'gue-dieresis': 'ü', 'k-w-x': 'kwx',
  'bl-br': '', 'cl-cr': '', 'fl-fr': '', 'gl-gr': '', 'pl-pr': '', 'tr-dr': '',
  inversas: '', diptongos: '', tildes: '', lectura: '',
  /* Nivel avanzado: no estrenan letras, trabajan lo ya aprendido. */
  inventadas: '', pares: '', dictado: '', ingles: ''
};

const SIN_TILDE = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
const normalizar = p => p.toLowerCase().split('').map(c => SIN_TILDE[c] || c).join('');

module.exports = function () {
  const C = cargarCurriculo();
  const fallos = [];
  const vistas = new Set();
  let permiteCeCi = false;
  let permiteGeGi = false;
  let revisadas = 0;

  C.unidades.forEach(u => {
    if (NUEVAS[u.id] === undefined) {
      fallos.push(`  la unidad "${u.id}" no está en el mapa de letras del test`);
      return;
    }
    for (const c of NUEVAS[u.id]) vistas.add(c);
    if (u.id === 'z-ce-ci') permiteCeCi = true;
    if (u.id === 'ge-gi') permiteGeGi = true;

    const textos = []
      .concat((u.palabras || []).map(p => p[0]))
      .concat(u.frases || [])
      .concat((u.textos || []).reduce((a, t) => a.concat(t.lineas), []));

    textos.forEach(texto => {
      texto.split(/[^a-záéíóúüñ]+/i).filter(Boolean).forEach(palabra => {
        revisadas++;
        const n = normalizar(palabra);
        for (const c of n) {
          if (!vistas.has(c)) {
            fallos.push(`  ${u.id}: "${palabra}" usa «${c}», que aún no se ha enseñado`);
            break;
          }
        }
        if (!permiteCeCi && /c[ei]/.test(n)) fallos.push(`  ${u.id}: "${palabra}" adelanta ce/ci`);
        if (!permiteGeGi && /g[ei]/.test(n) && !/gu[ei]/.test(n)) fallos.push(`  ${u.id}: "${palabra}" adelanta ge/gi`);
      });
    });

    /* Cada unidad de letra tiene que traer con qué practicar. */
    if (u.tipo === 'letra' && !(u.silabas || []).length) fallos.push(`  ${u.id}: sin sílabas`);
    if (u.tipo === 'letra' && !u.truco) fallos.push(`  ${u.id}: sin truco de pronunciación`);
  });

  return { nombre: 'Currículo', total: revisadas, fallos: fallos };
};
