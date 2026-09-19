/*!
 * Puntuación de la lectura en voz alta.
 *
 * Lo importante aquí no es la nota exacta sino dos cosas que sí son
 * pedagógicamente decisivas:
 *   - que NO se penalice una pronunciación correcta escrita de otra forma
 *     (vaca/baca, casa/caza, pollo/poyo, hola/ola), y
 *   - que SÍ se detecten los errores de lectura de verdad (pero/perro).
 */
'use strict';
const fs = require('fs');
const path = require('path');

function cargar() {
  const ventana = {};
  ventana.Silabas = require('../js/syllabify.js');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'evaluar.js'), 'utf8');
  new Function('window', src)(ventana);
  return ventana.Evaluar;
}

/* Grafías distintas que suenan igual: leerlas así es CORRECTO. */
const HOMOFONOS = [
  ['vaca', 'baca'], ['casa', 'caza'], ['pollo', 'poyo'], ['hola', 'ola'],
  ['hombre', 'ombre'], ['zapato', 'sapato'], ['queso', 'keso'],
  ['gente', 'jente'], ['yo', 'llo'], ['cielo', 'sielo'], ['bien', 'vien']
];

/* Diferencias que SÍ son errores de lectura. */
const DISTINTOS = [
  ['pero', 'perro'], ['caro', 'carro'], ['pato', 'pito'], ['casa', 'cama'],
  ['plato', 'pato'], ['gato', 'gata'], ['cana', 'caña'], ['peine', 'pene']
];

module.exports = function () {
  const E = cargar();
  const fallos = [];
  let total = 0;

  HOMOFONOS.forEach(([a, b]) => {
    total++;
    if (E.fonetica(a) !== E.fonetica(b)) {
      fallos.push(`  "${a}" y "${b}" suenan igual pero dan ${E.fonetica(a)} / ${E.fonetica(b)}`);
    }
  });

  DISTINTOS.forEach(([a, b]) => {
    total++;
    if (E.fonetica(a) === E.fonetica(b)) {
      fallos.push(`  "${a}" y "${b}" suenan distinto pero dan lo mismo: ${E.fonetica(a)}`);
    }
  });

  /* Casos completos: texto esperado, lo que oyó el micrófono, estrellas. */
  const LECTURAS = [
    ['El perro corre.', ['el perro corre'], 3, 'lectura perfecta'],
    ['La vaca come uva.', ['la baca come uva'], 3, 'homófono, no es error'],
    ['El perro corre.', ['el pero corre'], 2, 'confunde erre fuerte con suave'],
    ['El perro corre.', ['el perro'], 1, 'se salta una palabra'],
    ['El perro corre.', ['la casa azul'], 0, 'lee otra cosa'],
    ['plátano', ['patano', 'plátano'], 3, 'acierta en la segunda alternativa'],
    ['mariposa', ['maiposa'], 2, 'se come una sílaba']
  ];

  LECTURAS.forEach(([objetivo, oido, esperadas, nota]) => {
    total++;
    const r = E.puntuar(objetivo, oido);
    if (r.estrellas !== esperadas) {
      fallos.push(`  ${nota}: "${objetivo}" ← ${JSON.stringify(oido)} → ${r.estrellas}★, se esperaban ${esperadas}★ (nota ${r.nota})`);
    }
  });

  /* Un error de erre tiene que producir la pista de la erre. */
  total++;
  const pista = E.puntuar('El perro corre.', ['el pero corre']).pista;
  if (!pista || pista.clave !== 'rr') {
    fallos.push(`  la confusión pero/perro debería dar la pista "rr", dio "${pista && pista.clave}"`);
  }

  /* Sin voz no puede salir aprobado. */
  total++;
  if (E.puntuar('casa', []).estrellas !== 0) fallos.push('  sin transcripción debería dar 0 estrellas');

  return { nombre: 'Lectura en voz alta', total: total, fallos: fallos };
};
