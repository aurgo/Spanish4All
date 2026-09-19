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

  /* ---------------------------------------------- pasar de dispositivo ---
   *
   * El progreso vive en el localStorage, que es de este navegador y de este
   * aparato. Para poder seguir en otra tableta lo empaquetamos en un código
   * CORTO: catorce caracteres que se pueden dictar por teléfono o mandar por
   * mensaje, en vez de un pegote de texto.
   *
   * Qué viaja: qué unidades están terminadas y cuántas estrellas hay.
   * Qué NO viaja, a propósito: los ajustes. La voz elegida no existe en el
   * otro aparato (cada sistema trae las suyas), así que copiarla daría
   * problemas en lugar de ahorrarlos.
   *
   * Formato de los bits: [versión:3][nº unidades:6][una por unidad][estrellas:12][control:7]
   */

  /* Base32 de Crockford: sin I, L, O ni U, para que nadie confunda un 1 con
     una ele ni un 0 con una O al copiarlo a mano. */
  var ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  function meterBits(valor, cuantos, bits) {
    for (var i = cuantos - 1; i >= 0; i--) bits.push((valor >> i) & 1);
  }
  function sacarBits(bits, desde, cuantos) {
    var v = 0;
    for (var i = 0; i < cuantos; i++) v = (v << 1) | (bits[desde + i] || 0);
    return v;
  }
  function control(bits, hasta) {
    var suma = 0;
    for (var i = 0; i < hasta; i++) suma = (suma + bits[i] * (i + 1)) % 127;
    return suma;
  }

  function exportarCodigo(unidades) {
    var bits = [];
    meterBits(1, 3, bits);
    meterBits(unidades.length, 6, bits);
    unidades.forEach(function (u) { bits.push(unidadCompleta(u.id) ? 1 : 0); });
    meterBits(Math.min(4095, leer().estrellas), 12, bits);
    meterBits(control(bits, bits.length), 7, bits);

    var texto = '';
    for (var i = 0; i < bits.length; i += 5) {
      texto += ALFABETO[sacarBits(bits, i, 5)];
    }
    return texto.match(/.{1,4}/g).join('-');
  }

  /*
   * Lee un código. Devuelve { ok, completas[], estrellas } o { ok:false, error }.
   * El dígito de control hace que una letra mal copiada se detecte en vez de
   * restaurar un progreso equivocado en silencio.
   */
  function leerCodigo(codigo) {
    var limpio = String(codigo || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
      .replace(/O/g, '0').replace(/[IL]/g, '1');   // confusiones típicas al teclear
    if (limpio.length < 4) return { ok: false, error: 'corto' };

    var bits = [];
    for (var i = 0; i < limpio.length; i++) {
      var v = ALFABETO.indexOf(limpio[i]);
      if (v === -1) return { ok: false, error: 'caracter' };
      meterBits(v, 5, bits);
    }

    if (sacarBits(bits, 0, 3) !== 1) return { ok: false, error: 'version' };
    var n = sacarBits(bits, 3, 6);
    var total = 3 + 6 + n + 12 + 7;
    if (!n || bits.length < total) return { ok: false, error: 'corto' };
    if (sacarBits(bits, total - 7, 7) !== control(bits, total - 7)) {
      return { ok: false, error: 'control' };
    }

    var completas = [];
    for (var k = 0; k < n; k++) completas.push(bits[9 + k] === 1);
    return { ok: true, completas: completas, estrellas: sacarBits(bits, 9 + n, 12) };
  }

  /* Aplica un código ya validado. Sustituye el progreso, no lo mezcla. */
  function importarCodigo(codigo, unidades) {
    var r = leerCodigo(codigo);
    if (!r.ok) return r;

    var d = leer();
    var ajustes = d.ajustes;          // los ajustes de ESTE aparato se respetan
    var limpio = vacio();
    limpio.ajustes = ajustes;
    limpio.estrellas = r.estrellas;
    unidades.forEach(function (u, i) {
      if (r.completas[i]) limpio.unidades[u.id] = { pasos: {}, estrellas: 0, completa: true };
    });
    memoria = limpio;
    guardar();
    return { ok: true, unidades: r.completas.filter(Boolean).length, estrellas: r.estrellas };
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
    exportarCodigo: exportarCodigo,
    leerCodigo: leerCodigo,
    importarCodigo: importarCodigo,
    reiniciar: reiniciar,
    resumen: resumen,
    datos: leer,
    unidad: unidad
  };
})(window);
