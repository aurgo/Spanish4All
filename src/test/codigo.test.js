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
    btoa: global.btoa, atob: global.atob,      // el enlace completo va en base64
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

const UNIDADES = Array.from({ length: 41 }, (_, i) => ({ id: 'u' + i }));
const CUENTOS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];

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
    const codigo = A.exportarCodigo(UNIDADES, CUENTOS);
    const estrellas = A.datos().estrellas;

    const B = cargar();
    const r = B.importarCodigo(codigo, UNIDADES, CUENTOS);
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
  const codigo = A.exportarCodigo(UNIDADES, CUENTOS);
  if (codigo.replace(/-/g, '').length > 20) {
    fallos.push(`  el código es demasiado largo para dictarlo: "${codigo}"`);
  }
  if (/[ILOU]/.test(codigo)) {
    fallos.push(`  el código usa letras confundibles (I, L, O, U): "${codigo}"`);
  }

  /* --- un código mal copiado NO debe colar --- */
  const bueno = cargar();
  [3, 7, 11].forEach(i => bueno.completarUnidad(UNIDADES[i].id));
  const original = bueno.exportarCodigo(UNIDADES, CUENTOS);

  const ROTOS = [
    ['', 'vacío'],
    ['XXXX-XXXX-XXXX-XX', 'inventado'],
    [original.slice(0, -1), 'le falta un carácter'],
    [original.replace(/-/g, '').split('').reverse().join(''), 'del revés']
  ];
  ROTOS.forEach(([malo, nota]) => {
    total++;
    if (cargar().importarCodigo(malo, UNIDADES, CUENTOS).ok) {
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
      const r = cargar().importarCodigo(roto, UNIDADES, CUENTOS);
      /* Aceptar es sólo un problema si además cambia el progreso. */
      if (r.ok && r.unidades !== 3) colados++;
    }
  }
  total++;
  const tasa = colados / probados;
  if (tasa > 0.02) {
    fallos.push(`  ${(tasa * 100).toFixed(1)}% de los códigos con una letra cambiada colaron con progreso distinto (${colados}/${probados})`);
  }

  /* --- con el código corto, los ajustes del aparato no se pisan --- */
  total++;
  const destino = cargar();
  destino.ajuste('velocidad', 0.6);
  destino.ajuste('chino', true);
  destino.importarCodigo(original, UNIDADES, CUENTOS);
  if (destino.ajuste('velocidad') !== 0.6 || destino.ajuste('chino') !== true) {
    fallos.push('  el código corto pisó los ajustes de este dispositivo');
  }

  /* --- los cuentos leídos viajan en el código corto --- */
  total++;
  const conCuentos = cargar();
  conCuentos.completarUnidad(UNIDADES[0].id);
  ['c2', 'c5'].forEach(c => conCuentos.completarUnidad('cuento:' + c));
  const D = cargar();
  D.importarCodigo(conCuentos.exportarCodigo(UNIDADES, CUENTOS), UNIDADES, CUENTOS);
  if (!D.unidadCompleta('cuento:c2') || !D.unidadCompleta('cuento:c5')) {
    fallos.push('  los cuentos leídos no llegaron al otro aparato');
  }
  if (D.unidadCompleta('cuento:c1')) fallos.push('  llegó un cuento que no se había leído');

  /* --- el enlace completo lleva TODO, no sólo lo visible --- */
  total++;
  const rico = cargar();
  UNIDADES.slice(0, 10).forEach(u => rico.completarUnidad(u.id));
  ['c1', 'c3'].forEach(c => rico.completarUnidad('cuento:' + c));
  rico.apuntarLectura({ texto: 'c1', ppm: 64, nota: 92, intento: 1 });
  rico.apuntarLectura({ texto: 'c1', ppm: 88, nota: 96, intento: 2 });
  rico.apuntarFallo('rr', 'rr');
  rico.ajuste('velocidad', 0.65);
  rico.ajuste('chino', true);

  const enlace = rico.exportarCompleto();
  if (!enlace) {
    fallos.push('  el enlace completo salió vacío');
  } else {
    const E = cargar();
    const re = E.importarCodigo(enlace, UNIDADES, CUENTOS);
    if (!re.ok) fallos.push('  el enlace completo no se pudo leer');
    if (E.lecturas().length !== 2) fallos.push('  el enlace perdió la velocidad de lectura');
    if (!E.erroresTipicos().length) fallos.push('  el enlace perdió los diagnósticos del repaso');
    if (!E.unidadCompleta('cuento:c3')) fallos.push('  el enlace perdió los cuentos');
    if (E.ajuste('velocidad') !== 0.65) fallos.push('  el enlace debería traer los ajustes del niño');
    if (E.ajuste('chino') !== true) fallos.push('  el enlace perdió el ajuste del chino');
  }

  /* --- un enlace estropeado tampoco cuela --- */
  total++;
  if (cargar().importarCodigo('F~esto-no-es-base64-valido!!', UNIDADES, CUENTOS).ok) {
    fallos.push('  se aceptó un enlace completo corrupto');
  }

  /* --- los códigos de la versión anterior (37 unidades, sin cuentos) siguen valiendo --- */
  total++;
  const viejas = UNIDADES.slice(0, 37);
  const antiguo = cargar();
  [0, 1, 2].forEach(i => antiguo.completarUnidad(viejas[i].id));
  const codigoV1 = antiguo.exportarCodigo(viejas);          // sin lista de cuentos
  const F = cargar();
  const rf = F.importarCodigo(codigoV1, UNIDADES, CUENTOS);
  if (!rf.ok) fallos.push('  un código de la versión anterior dejó de funcionar');
  if (F.unidadCompleta(UNIDADES[40].id)) {
    fallos.push('  un código antiguo marcó unidades que entonces no existían');
  }

  /* --- lo que de verdad se pega: el enlace entero ---
   *
   * El botón copia un enlace, y en la app instalada no hay barra de
   * direcciones donde abrirlo: lo único que se puede hacer es pegarlo en la
   * casilla. Antes eso respondía "código no válido". */
  {
    const A = cargar();
    [0, 1, 2, 3].forEach(i => A.completarUnidad(UNIDADES[i].id));
    A.completarUnidad('cuento:c2');
    const corto = A.exportarCodigo(UNIDADES, CUENTOS);
    const largo = A.exportarCompleto();

    const formas = [
      ['enlace con el código completo', 'https://aurgo.github.io/Spanish4All/#p=' + largo],
      ['enlace con espacios alrededor', '  https://aurgo.github.io/Spanish4All/index.html#p=' + largo + '  '],
      ['enlace entre corchetes de un chat', '<https://aurgo.github.io/Spanish4All/#p=' + largo + '>'],
      ['sólo el código completo', largo],
      ['el código corto suelto', corto],
      ['el código corto con espacios', '  ' + corto + ' ']
    ];
    formas.forEach(([como, texto]) => {
      total++;
      const B = cargar();
      const r = B.importarCodigo(texto, UNIDADES, CUENTOS);
      if (!r.ok) { fallos.push(`  pegando ${como} dice que el código no vale`); return; }
      if (!B.unidadCompleta(UNIDADES[3].id)) fallos.push(`  pegando ${como} no llegó el progreso`);
    });

    /* Y lo que no es un traspaso sigue sin colar. */
    total++;
    if (cargar().importarCodigo('https://aurgo.github.io/Spanish4All/', UNIDADES, CUENTOS).ok) {
      fallos.push('  un enlace sin código se aceptó como si lo tuviera');
    }
  }

  return { nombre: 'Código de progreso', total: total, fallos: fallos };
};
