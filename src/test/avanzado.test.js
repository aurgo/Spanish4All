/*!
 * El material del nivel avanzado.
 *
 * Lo que más importa aquí es la seguridad del contenido: las palabras
 * inventadas se generan combinando sílabas, y una combinación desafortunada
 * pondría una palabrota delante de un niño. Eso se comprueba, no se confía.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function cargar(archivo) {
  const ventana = {};
  new Function('window', fs.readFileSync(path.join(__dirname, '..', 'js', archivo), 'utf8'))(ventana);
  return ventana;
}

/* Fragmentos que no deben aparecer dentro de ninguna palabra inventada. */
const PROHIBIDO = ['culo', 'cul', 'put', 'put', 'coñ', 'con̄', 'joder', 'jode', 'mierd', 'caca',
                   'cag', 'pedo', 'teta', 'tet', 'pich', 'poll', 'pija', 'pijo', 'zorra',
                   'puta', 'mear', 'mea', 'follar', 'foll', 'sexo', 'sex', 'pene', 'culi'];

module.exports = function () {
  const A = cargar('avanzado.js').Avanzado;
  const Silabas = require('../js/syllabify.js');
  const curri = cargar('curriculum.js').Curriculo;
  const fallos = [];
  let total = 0;

  const reales = new Set(
    curri.unidades.flatMap(u => (u.palabras || []).map(p => p[0].toLowerCase()))
  );

  /* --- palabras inventadas --- */
  const todas = A.inventadas.flatMap(n => n.lista);
  todas.forEach(palabra => {
    total++;
    const p = palabra.toLowerCase();
    const sucio = PROHIBIDO.find(m => p.indexOf(m) !== -1);
    if (sucio) fallos.push(`  "${palabra}" contiene "${sucio}": no puede ponerse delante de un niño`);
    if (reales.has(p)) fallos.push(`  "${palabra}" es una palabra real del currículo, no vale como inventada`);
    if (!/^[a-záéíóúüñ]+$/.test(p)) fallos.push(`  "${palabra}" tiene caracteres raros`);
    /* Tiene que poder silabearse: si no, no es pronunciable en español. */
    const silabas = Silabas.syllabify(p);
    if (!silabas.length || silabas.join('') !== p) {
      fallos.push(`  "${palabra}" no se silabea bien: ${silabas.join('-')}`);
    }
  });
  total++;
  if (new Set(todas).size !== todas.length) fallos.push('  hay palabras inventadas repetidas');

  /* --- pares mínimos: tienen que diferenciarse en UNA cosa --- */
  A.pares.forEach(par => {
    total++;
    const a = par.a[0].toLowerCase(), b = par.b[0].toLowerCase();
    if (a === b) { fallos.push(`  el par "${a}" es la misma palabra dos veces`); return; }
    const mismasLetras = a.split('').sort().join('') === b.split('').sort().join('');
    const distancia = (function (x, y) {
      const f = [];
      for (let j = 0; j <= y.length; j++) f[j] = j;
      for (let i = 1; i <= x.length; i++) {
        let prev = f[0]; f[0] = i;
        for (let j = 1; j <= y.length; j++) {
          const t = f[j];
          f[j] = Math.min(f[j] + 1, f[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
          prev = t;
        }
      }
      return f[y.length];
    })(a, b);
    /* O cambian una letra, o son las mismas letras en otro orden. */
    if (distancia > 1 && !mismasLetras) {
      fallos.push(`  "${a}" y "${b}" se diferencian demasiado (distancia ${distancia}): no es un par mínimo`);
    }
    if (!par.diferencia) fallos.push(`  el par "${a}/${b}" no explica en qué se diferencian`);
  });

  /* --- cuentos: moraleja y pregunta bien formadas --- */
  A.cuentos.forEach(c => {
    total++;
    if (!c.moraleja) fallos.push(`  el cuento "${c.id}" no tiene moraleja`);
    if (!c.lineas || c.lineas.length < 3) fallos.push(`  el cuento "${c.id}" es demasiado corto`);
    const p = c.pregunta;
    if (!p || !p.texto) { fallos.push(`  el cuento "${c.id}" no tiene pregunta`); return; }
    if (!p.opciones || p.opciones.length !== 3) {
      fallos.push(`  el cuento "${c.id}": la pregunta debe tener 3 respuestas`);
    }
    if (typeof p.correcta !== 'number' || !p.opciones[p.correcta]) {
      fallos.push(`  el cuento "${c.id}": la respuesta correcta apunta a nada`);
    }
    if (new Set(p.opciones).size !== p.opciones.length) {
      fallos.push(`  el cuento "${c.id}": hay respuestas repetidas`);
    }
    /* Los niveles tienen que crecer: nivel 1 más corto que nivel 3. */
    const palabras = c.lineas.join(' ').split(/\s+/).length;
    if (c.nivel === 1 && palabras > 60) fallos.push(`  "${c.id}" es de nivel 1 pero tiene ${palabras} palabras`);
    if (c.nivel === 3 && palabras < 50) fallos.push(`  "${c.id}" es de nivel 3 pero sólo tiene ${palabras} palabras`);
  });

  /* --- falsos amigos --- */
  A.ingles.forEach(f => {
    total++;
    if (!f.muestraEn || !f.muestraEs || !f.nota) {
      fallos.push(`  el falso amigo "${f.letra}" está incompleto`);
    }
  });

  /* --- dictado: todo palabras reales y escribibles --- */
  A.dictado.forEach(n => {
    n.lista.forEach(palabra => {
      total++;
      if (!/^[a-záéíóúüñ]+$/.test(palabra)) fallos.push(`  dictado: "${palabra}" tiene caracteres raros`);
    });
  });

  return { nombre: 'Nivel avanzado', total: total, fallos: fallos };
};
