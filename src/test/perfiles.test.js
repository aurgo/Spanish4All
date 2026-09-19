/*!
 * Varios niños en el mismo aparato.
 *
 * Dos cosas que no pueden fallar:
 *   - Que el progreso de un niño no se mezcle con el de otro. Si un amigo
 *     prueba la app y le borra las estrellas al hermano, se acabó la app.
 *   - Que quien ya venía usándola cuando no había perfiles no pierda nada al
 *     actualizar. Su progreso estaba en otra clave y hay que rescatarlo.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function nuevoAlmacen(inicial) {
  const datos = Object.assign({}, inicial || {});
  return {
    datos,
    ls: {
      getItem: k => (k in datos ? datos[k] : null),
      setItem: (k, v) => { datos[k] = String(v); },
      removeItem: k => { delete datos[k]; }
    }
  };
}

function cargar(almacen) {
  const ventana = { localStorage: almacen.ls };
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'progress.js'), 'utf8');
  new Function('window', src)(ventana);
  return ventana.Progreso;
}

module.exports = function () {
  const fallos = [];
  let total = 0;

  /* --- quien ya usaba la app no pierde nada --- */
  total++;
  const viejo = nuevoAlmacen({
    'lectura-es-v1': JSON.stringify({
      version: 1,
      unidades: { m: { pasos: {}, estrellas: 8, completa: true } },
      estrellas: 42,
      ajustes: { velocidad: 0.7, chino: true, micro: true },
      creado: 1
    })
  });
  const A = cargar(viejo);
  if (A.datos().estrellas !== 42) fallos.push('  al migrar se perdieron las estrellas');
  if (!A.unidadCompleta('m')) fallos.push('  al migrar se perdió la unidad terminada');
  if (A.ajuste('velocidad') !== 0.7) fallos.push('  al migrar se perdieron los ajustes');
  if ('lectura-es-v1' in viejo.datos) fallos.push('  la clave antigua debería quedar vacía tras migrar');
  if (A.perfiles().length !== 1) fallos.push('  la migración debería dejar exactamente un perfil');

  /* --- los niños no se pisan --- */
  const alm = nuevoAlmacen();
  const P = cargar(alm);
  const uno = P.perfilActivo().id;
  P.renombrarPerfil(uno, 'Hugo', '🦊');
  P.completarUnidad('m');
  P.completarPaso('m', 'intro', 3);

  total++;
  const dos = P.crearPerfil('Mei', '🐼');
  if (P.datos().estrellas !== 0) fallos.push('  el niño nuevo hereda estrellas que no son suyas');
  if (P.unidadCompleta('m')) fallos.push('  el niño nuevo hereda unidades que no ha hecho');

  total++;
  P.completarUnidad('p');
  P.activarPerfil(uno);
  if (!P.unidadCompleta('m')) fallos.push('  al volver al primer niño se perdió su progreso');
  if (P.unidadCompleta('p')) fallos.push('  al primer niño se le coló el progreso del segundo');
  if (P.datos().estrellas !== 3) fallos.push(`  el primer niño debería tener 3 estrellas, tiene ${P.datos().estrellas}`);

  /* --- los ajustes también son de cada niño --- */
  total++;
  P.ajuste('chino', true);
  P.activarPerfil(dos.id);
  if (P.ajuste('chino') === true) fallos.push('  los ajustes de un niño se aplicaron al otro');

  /* --- nunca se queda el aparato sin ningún niño --- */
  total++;
  P.activarPerfil(uno);
  P.borrarPerfil(dos.id);
  if (P.perfiles().length !== 1) fallos.push('  borrar un perfil no dejó la lista bien');
  if (P.borrarPerfil(uno) !== false) fallos.push('  se permitió borrar al último niño');
  if (!P.unidadCompleta('m')) fallos.push('  borrar a otro niño afectó al que quedaba');

  /* --- el código de traspaso es del niño activo, no del aparato --- */
  total++;
  const unidades = [{ id: 'm' }, { id: 'p' }, { id: 'l' }];
  const codigoHugo = P.exportarCodigo(unidades);
  const tres = P.crearPerfil('Lin', '🐧');
  const codigoLin = P.exportarCodigo(unidades);
  if (codigoHugo === codigoLin) fallos.push('  dos niños distintos generan el mismo código de progreso');
  P.importarCodigo(codigoHugo, unidades);
  if (!P.unidadCompleta('m')) fallos.push('  importar un código en otro niño no funcionó');
  P.activarPerfil(uno);
  if (P.perfilActivo().nombre !== 'Hugo') fallos.push('  el nombre del perfil no se guardó');

  return { nombre: 'Varios niños', total: total, fallos: fallos };
};
