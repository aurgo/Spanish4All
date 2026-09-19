/*!
 * progreso.js — Guarda en el navegador lo que el niño ya ha aprendido.
 *
 * Todo vive en localStorage: no hay servidor, ni cuentas, ni datos que salgan
 * del dispositivo. Si el navegador bloquea el almacenamiento, la app sigue
 * funcionando en memoria durante la sesión.
 */
(function (global) {
  'use strict';

  var CLAVE = 'lectura-es-v1';
  var memoria = null;

  function vacio() {
    return {
      version: 1,
      unidades: {},          // id -> { pasos: {nombre: true}, estrellas: n, completa: bool }
      estrellas: 0,
      ajustes: {
        velocidad: 0.85,
        voz: null,
        chino: false,
        desbloquearTodo: false,
        mayusculas: false,
        micro: true
      },
      ultimaUnidad: null,
      creado: Date.now()
    };
  }

  function leer() {
    if (memoria) return memoria;
    try {
      var raw = global.localStorage.getItem(CLAVE);
      memoria = raw ? JSON.parse(raw) : vacio();
    } catch (e) {
      memoria = vacio();
    }
    if (!memoria || memoria.version !== 1) memoria = vacio();
    if (!memoria.ajustes) memoria.ajustes = vacio().ajustes;
    return memoria;
  }

  function guardar() {
    try { global.localStorage.setItem(CLAVE, JSON.stringify(leer())); } catch (e) {}
  }

  function unidad(id) {
    var d = leer();
    if (!d.unidades[id]) d.unidades[id] = { pasos: {}, estrellas: 0, completa: false };
    return d.unidades[id];
  }

  /* Marca un paso (actividad) como superado y suma estrellas. */
  function completarPaso(idUnidad, paso, estrellas) {
    var u = unidad(idUnidad);
    var nuevo = !u.pasos[paso];
    u.pasos[paso] = true;
    if (nuevo) {
      var s = Math.max(1, estrellas || 1);
      u.estrellas += s;
      leer().estrellas += s;
    }
    leer().ultimaUnidad = idUnidad;
    guardar();
    return nuevo;
  }

  function pasoHecho(idUnidad, paso) {
    return !!unidad(idUnidad).pasos[paso];
  }

  function completarUnidad(idUnidad) {
    var u = unidad(idUnidad);
    var nuevo = !u.completa;
    u.completa = true;
    guardar();
    return nuevo;
  }

  function unidadCompleta(idUnidad) {
    return !!unidad(idUnidad).completa;
  }

  /*
   * Una unidad está disponible si es la primera, si ya se ha empezado, si la
   * anterior está completa, o si el adulto ha desbloqueado todo.
   */
  function disponible(indice, unidades) {
    if (indice === 0) return true;
    if (leer().ajustes.desbloquearTodo) return true;
    var u = unidad(unidades[indice].id);
    if (u.completa || Object.keys(u.pasos).length) return true;
    return unidadCompleta(unidades[indice - 1].id);
  }

  /* Primera unidad sin terminar: es la que la app propone al abrirse. */
  function siguienteUnidad(unidades) {
    for (var i = 0; i < unidades.length; i++) {
      if (!unidadCompleta(unidades[i].id)) return i;
    }
    return unidades.length - 1;
  }

  function ajuste(clave, valor) {
    var d = leer();
    if (arguments.length > 1) { d.ajustes[clave] = valor; guardar(); }
    return d.ajustes[clave];
  }

  function reiniciar() {
    memoria = vacio();
    guardar();
  }

  function resumen(unidades) {
    var hechas = 0;
    unidades.forEach(function (u) { if (unidadCompleta(u.id)) hechas++; });
    return {
      completas: hechas,
      total: unidades.length,
      estrellas: leer().estrellas,
      porcentaje: Math.round(hechas / unidades.length * 100)
    };
  }

  global.Progreso = {
    completarPaso: completarPaso,
    pasoHecho: pasoHecho,
    completarUnidad: completarUnidad,
    unidadCompleta: unidadCompleta,
    disponible: disponible,
    siguienteUnidad: siguienteUnidad,
    ajuste: ajuste,
    reiniciar: reiniciar,
    resumen: resumen,
    datos: leer,
    unidad: unidad
  };
})(window);
