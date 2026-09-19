/*!
 * El código para pasar el progreso de un dispositivo a otro.
 *
 * Lo que de verdad importa aquí no es que el código funcione cuando todo va
 * bien, sino que un código MAL COPIADO se rechace. Restaurar en silencio un
 * progreso equivocado sería peor que no tener la función: el niño se
 * encontraría unidades cerradas que ya había hecho, o abiertas sin haberlas
 * hecho, sin que nadie entienda por qué.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* progress.js está escrito para el navegador: le damos un localStorage falso. */
function cargar() {
  const almacen = {};
  const ventana = {
    localStorage: {
      getItem: k => (k in almacen ? almacen[k] : null),
      setItem: (k, v) => { almacen[k] = String(v); },
      removeItem: k => { delete almacen[k]; }
    }
  };
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'progress.js'), 'utf8');
  new Function('window', src)(ventana);
  return ventana.Progreso;
}

const UNIDADES = Array.from({ length: 37 }, (_, i) => ({ id: 'u' + i }));

module.exports = function () {
  const fallos = [];
  let total = 0;

  /* --- ida y vuelta: lo que sale es lo que entra --- */
  [[], [0], [0, 1, 2], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
   Array.from({ length: 37 }, (_, i) => i)].forEach(hechas => {
    total++;
    const A = cargar();
    hechas.forEach(i => A.completarUnidad(UNIDADES[i].id));
    for (let k = 0; k < hechas.length * 3; k++) A.completarPaso(UNIDADES[0].id, 'p' + k, 1);
    const codigo = A.exportarCodigo(UNIDADES);
    const estrellas = A.datos().estrellas;

    const B = cargar();
    const r = B.importarCodigo(codigo, UNIDADES);
    if (!r.ok) { fallos.push(`  ${hechas.length} unidades: el código no se pudo leer (${r.error})`); return; }

    const recuperadas = UNIDADES.filter(u => B.unidadCompleta(u.id)).map(u => UNIDADES.indexOf(u));
    if (JSON.stringify(recuperadas) !== JSON.stringify(hechas)) {
      fallos.push(`  ${hechas.length} unidades: se esperaban [${hechas}] y llegaron [${recuperadas}]`);
    }
    if (B.datos().estrellas !== estrellas) {
      fallos.push(`  ${hechas.length} unidades: ${estrellas} estrellas → ${B.datos().estrellas}`);
    }
  });

  /* --- el código es corto y se puede dictar --- */
  total++;
  const A = cargar();
  UNIDADES.forEach(u => A.completarUnidad(u.id));
  const codigo = A.exportarCodigo(UNIDADES);
  if (codigo.replace(/-/g, '').length > 16) {
    fallos.push(`  el código es demasiado largo para dictarlo: "${codigo}"`);
  }
  if (/[ILOU]/.test(codigo)) {
    fallos.push(`  el código usa letras confundibles (I, L, O, U): "${codigo}"`);
  }

  /* --- un código mal copiado NO debe colar --- */
  const bueno = cargar();
  [3, 7, 11].forEach(i => bueno.completarUnidad(UNIDADES[i].id));
  const original = bueno.exportarCodigo(UNIDADES);

  const ROTOS = [
    ['', 'vacío'],
    ['XXXX-XXXX-XXXX-XX', 'inventado'],
    [original.slice(0, -1), 'le falta un carácter'],
    [original.replace(/-/g, '').split('').reverse().join(''), 'del revés']
  ];
  ROTOS.forEach(([malo, nota]) => {
    total++;
    if (cargar().importarCodigo(malo, UNIDADES).ok) {
      fallos.push(`  se aceptó un código ${nota}: "${malo}"`);
    }
  });

  /* Cambiar UN carácter cualquiera tiene que detectarse casi siempre. */
  const plano = original.replace(/-/g, '');
  const ALF = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let colados = 0, probados = 0;
  for (let i = 0; i < plano.length; i++) {
    for (const c of ALF) {
      if (c === plano[i]) continue;
      probados++;
      const roto = plano.slice(0, i) + c + plano.slice(i + 1);
      const r = cargar().importarCodigo(roto, UNIDADES);
      /* Aceptar es sólo un problema si además cambia el progreso. */
      if (r.ok && r.unidades !== 3) colados++;
    }
  }
  total++;
  const tasa = colados / probados;
  if (tasa > 0.02) {
    fallos.push(`  ${(tasa * 100).toFixed(1)}% de los códigos con una letra cambiada colaron con progreso distinto (${colados}/${probados})`);
  }

  /* --- los ajustes del aparato no se pisan --- */
  total++;
  const destino = cargar();
  destino.ajuste('velocidad', 0.6);
  destino.ajuste('chino', true);
  destino.importarCodigo(original, UNIDADES);
  if (destino.ajuste('velocidad') !== 0.6 || destino.ajuste('chino') !== true) {
    fallos.push('  importar pisó los ajustes de este dispositivo');
  }

  return { nombre: 'Código de progreso', total: total, fallos: fallos };
};
