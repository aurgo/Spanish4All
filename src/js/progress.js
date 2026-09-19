/*!
 * progreso.js — Guarda en el navegador lo que el niño ya ha aprendido.
 *
 * Todo vive en localStorage: no hay servidor, ni cuentas, ni datos que salgan
 * del dispositivo. Si el navegador bloquea el almacenamiento, la app sigue
 * funcionando en memoria durante la sesión.
 */
(function (global) {
  'use strict';

  /*
   * Varios niños en el mismo aparato.
   *
   * Hasta ahora había un único progreso por navegador, que servía para una
   * familia con un hijo. En cuanto un hermano o un amigo prueba la app, le
   * machaca las estrellas al primero. Así que cada niño tiene su propio
   * cajón, y la lista de quiénes hay vive aparte.
   *
   *   lectura-es-perfiles     { activo, lista: [{id, nombre, emoji}] }
   *   lectura-es-v1:<id>      el progreso de ese niño
   *
   * Quien ya venía usando la app tenía sus datos en "lectura-es-v1" a secas:
   * al abrirla se convierten en el primer perfil, sin perder nada.
   */
  var CLAVE_VIEJA = 'lectura-es-v1';
  var CLAVE_PERFILES = 'lectura-es-perfiles';
  var memoria = null;
  var perfiles = null;

  function leerBruto(clave) {
    try {
      var raw = global.localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function guardarBruto(clave, valor) {
    try { global.localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
  }

  function nuevoId() {
    return 'n' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  }

  function cargarPerfiles() {
    if (perfiles) return perfiles;
    perfiles = leerBruto(CLAVE_PERFILES);

    if (!perfiles || !perfiles.lista || !perfiles.lista.length) {
      var viejo = leerBruto(CLAVE_VIEJA);
      var id = nuevoId();
      perfiles = { activo: id, lista: [{ id: id, nombre: '', emoji: '🙂', creado: Date.now() }] };
      /* Rescatamos el progreso de quien ya usaba la app antes de los perfiles. */
      if (viejo) {
        guardarBruto(CLAVE_VIEJA + ':' + id, viejo);
        try { global.localStorage.removeItem(CLAVE_VIEJA); } catch (e) {}
      }
      guardarBruto(CLAVE_PERFILES, perfiles);
    }
    if (!perfiles.lista.filter(function (p) { return p.id === perfiles.activo; })[0]) {
      perfiles.activo = perfiles.lista[0].id;
      guardarBruto(CLAVE_PERFILES, perfiles);
    }
    return perfiles;
  }

  function CLAVE() { return CLAVE_VIEJA + ':' + cargarPerfiles().activo; }

  function perfilActivo() {
    var ps = cargarPerfiles();
    return ps.lista.filter(function (p) { return p.id === ps.activo; })[0];
  }

  function listaPerfiles() { return cargarPerfiles().lista.slice(); }

  function crearPerfil(nombre, emoji) {
    var ps = cargarPerfiles();
    var p = { id: nuevoId(), nombre: (nombre || '').slice(0, 20), emoji: emoji || '🙂', creado: Date.now() };
    ps.lista.push(p);
    ps.activo = p.id;
    guardarBruto(CLAVE_PERFILES, ps);
    memoria = null;
    return p;
  }

  function renombrarPerfil(id, nombre, emoji) {
    var ps = cargarPerfiles();
    ps.lista.forEach(function (p) {
      if (p.id !== id) return;
      if (typeof nombre === 'string') p.nombre = nombre.slice(0, 20);
      if (emoji) p.emoji = emoji;
    });
    guardarBruto(CLAVE_PERFILES, ps);
  }

  function activarPerfil(id) {
    var ps = cargarPerfiles();
    if (!ps.lista.filter(function (p) { return p.id === id; })[0]) return false;
    ps.activo = id;
    guardarBruto(CLAVE_PERFILES, ps);
    memoria = null;      // el siguiente leer() trae el cajón del nuevo niño
    return true;
  }

  function borrarPerfil(id) {
    var ps = cargarPerfiles();
    if (ps.lista.length <= 1) return false;     // siempre queda alguien
    ps.lista = ps.lista.filter(function (p) { return p.id !== id; });
    try { global.localStorage.removeItem(CLAVE_VIEJA + ':' + id); } catch (e) {}
    if (ps.activo === id) ps.activo = ps.lista[0].id;
    guardarBruto(CLAVE_PERFILES, ps);
    memoria = null;
    return true;
  }

  function vacio() {
    return {
      version: 1,
      unidades: {},          // id -> { pasos: {nombre: true}, estrellas: n, completa: bool }
      estrellas: 0,
      ajustes: {
        velocidad: 0.85,
        voz: null,
        /* El público de esta app lee chino: mejor pasarse que quedarse corto.
           La pantalla de bienvenida lo pregunta igualmente. */
        chino: true,
        desbloquearTodo: false,
        mayusculas: false,
        micro: true,
        ingles: true      // ¿aprendió el abecedario en inglés? en Taiwán, casi siempre
      },
      ultimaUnidad: null,
      fallos: {},        // qué se le atraganta: clave de diagnóstico → veces
      lecturas: [],      // velocidad de lectura, las últimas sesiones
      dias: [],          // días en los que ha practicado, para la racha
      creado: Date.now()
    };
  }

  function leer() {
    if (memoria) return memoria;
    memoria = leerBruto(CLAVE()) || vacio();
    if (!memoria || memoria.version !== 1) memoria = vacio();
    /* Campos añadidos después: se rellenan sin tocar la versión, para no
       borrarle el progreso a quien ya venía usando la app. */
    if (!memoria.ajustes) memoria.ajustes = vacio().ajustes;
    if (!memoria.fallos) memoria.fallos = {};
    if (!memoria.lecturas) memoria.lecturas = [];
    if (!memoria.dias) memoria.dias = [];
    return memoria;
  }

  function guardar() { guardarBruto(CLAVE(), leer()); }

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

  /* ------------------------------------------------ cómo va llevándolo ---
   *
   * La app ya sabe QUÉ falla cada vez que el niño lee en voz alta — erre
   * fuerte, sílaba comida, vocal cambiada — pero hasta ahora lo pintaba en
   * pantalla y lo tiraba. Guardándolo, el repaso puede dejar de ser aleatorio
   * y traerle justo lo suyo.
   */

  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /* Un día de práctica. Se llama al empezar cualquier actividad. */
  function marcarDia() {
    var d = leer();
    var h = hoy();
    if (d.dias[d.dias.length - 1] !== h) {
      d.dias.push(h);
      if (d.dias.length > 400) d.dias = d.dias.slice(-400);
      guardar();
    }
  }

  /* Días seguidos practicando, contando hacia atrás desde hoy o desde ayer. */
  function racha() {
    var d = leer();
    if (!d.dias.length) return 0;
    var vistos = {};
    d.dias.forEach(function (x) { vistos[x] = true; });

    var cursor = new Date();
    if (!vistos[hoy()]) cursor.setDate(cursor.getDate() - 1);   // aún puede practicar hoy

    var n = 0;
    while (n < 400) {
      var clave = cursor.getFullYear() + '-' + ('0' + (cursor.getMonth() + 1)).slice(-2) +
                  '-' + ('0' + cursor.getDate()).slice(-2);
      if (!vistos[clave]) break;
      n++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }

  /* Apunta un fallo de lectura. "clave" es el diagnóstico; "unidad", de dónde
     salía la palabra, para poder repasar justo esa letra. */
  function apuntarFallo(clave, idUnidad) {
    if (!clave) return;
    var d = leer();
    d.fallos[clave] = (d.fallos[clave] || 0) + 1;
    if (idUnidad) d.fallos['u:' + idUnidad] = (d.fallos['u:' + idUnidad] || 0) + 1;
    guardar();
  }

  /* Un acierto rebaja el contador: lo superado deja de repasarse. */
  function apuntarAcierto(idUnidad) {
    if (!idUnidad) return;
    var d = leer();
    var k = 'u:' + idUnidad;
    if (d.fallos[k]) {
      d.fallos[k] -= 1;
      if (d.fallos[k] <= 0) delete d.fallos[k];
      guardar();
    }
  }

  /* Unidades ordenadas de la que más se le atraganta a la que menos. */
  function unidadesFlojas() {
    var d = leer();
    return Object.keys(d.fallos)
      .filter(function (k) { return k.indexOf('u:') === 0; })
      .map(function (k) { return { id: k.slice(2), veces: d.fallos[k] }; })
      .sort(function (a, b) { return b.veces - a.veces; });
  }

  /* Diagnósticos más repetidos, para el resumen del adulto. */
  function erroresTipicos() {
    var d = leer();
    return Object.keys(d.fallos)
      .filter(function (k) { return k.indexOf('u:') !== 0; })
      .map(function (k) { return { clave: k, veces: d.fallos[k] }; })
      .sort(function (a, b) { return b.veces - a.veces; });
  }

  /* Velocidad de una lectura, en palabras por minuto. */
  function apuntarLectura(datos) {
    var d = leer();
    d.lecturas.push({
      texto: datos.texto, ppm: Math.round(datos.ppm), nota: datos.nota,
      intento: datos.intento || 1, fecha: hoy()
    });
    if (d.lecturas.length > 60) d.lecturas = d.lecturas.slice(-60);
    guardar();
    return d.lecturas;
  }

  function lecturas() { return leer().lecturas.slice(); }

  /* Todo lo que necesita el panel del adulto, ya masticado. */
  function estadisticas(unidades) {
    var d = leer();
    var lec = d.lecturas;
    var mejor = lec.reduce(function (a, l) { return Math.max(a, l.ppm); }, 0);
    var ultimas = lec.slice(-5);
    return {
      completas: unidades.filter(function (u) { return unidadCompleta(u.id); }).length,
      total: unidades.length,
      estrellas: d.estrellas,
      racha: racha(),
      dias: d.dias.length,
      lecturas: lec.length,
      ppmMejor: mejor,
      ppmMedia: ultimas.length
        ? Math.round(ultimas.reduce(function (a, l) { return a + l.ppm; }, 0) / ultimas.length) : 0,
      historial: lec.slice(-12),
      flojas: unidadesFlojas().slice(0, 5),
      errores: erroresTipicos().slice(0, 5)
    };
  }

  /* ---------------------------------------------- pasar de dispositivo ---
   *
   * El progreso vive en el localStorage, que es de este navegador y de este
   * aparato. Para poder seguir en otra tableta lo empaquetamos en un código
   * CORTO: catorce caracteres que se pueden dictar por teléfono o mandar por
   * mensaje, en vez de un pegote de texto.
   *
   * Hay DOS formas, porque no sirven para lo mismo:
   *
   *   CÓDIGO CORTO (17 caracteres) — para dictar por teléfono o apuntar en un
   *   papel. Lleva las unidades terminadas, los cuentos leídos y las
   *   estrellas: lo que se ve en pantalla.
   *
   *   ENLACE COMPLETO — para mandar por mensaje. Como ahí la longitud no
   *   molesta, lleva además la velocidad de lectura y los diagnósticos que
   *   alimentan el repaso adaptativo. Meter eso en el código corto lo
   *   triplicaría y dejaría de poder dictarse.
   *
   * Lo que NO viaja en ninguna de las dos, a propósito: la voz elegida, que
   * no existe en el otro aparato porque cada sistema trae las suyas.
   *
   * Bits del código corto:
   *   [versión:3][nº unidades:6][una por unidad][nº cuentos:5][uno por cuento][estrellas:12][control:7]
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

  function exportarCodigo(unidades, cuentos) {
    cuentos = cuentos || [];
    var bits = [];
    meterBits(2, 3, bits);                 // versión 2: añade los cuentos
    meterBits(unidades.length, 6, bits);
    unidades.forEach(function (u) { bits.push(unidadCompleta(u.id) ? 1 : 0); });
    meterBits(Math.min(31, cuentos.length), 5, bits);
    cuentos.slice(0, 31).forEach(function (id) {
      bits.push(unidadCompleta('cuento:' + id) ? 1 : 0);
    });
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

    /* La versión 1 no traía cuentos; se sigue aceptando. */
    var version = sacarBits(bits, 0, 3);
    if (version !== 1 && version !== 2) return { ok: false, error: 'version' };
    var n = sacarBits(bits, 3, 6);
    if (!n) return { ok: false, error: 'corto' };

    var c = 0, inicioCuentos = 0;
    var total;
    if (version === 1) {
      total = 3 + 6 + n + 12 + 7;
    } else {
      if (bits.length < 9 + n + 5) return { ok: false, error: 'corto' };
      c = sacarBits(bits, 9 + n, 5);
      inicioCuentos = 9 + n + 5;
      total = inicioCuentos + c + 12 + 7;
    }
    if (bits.length < total) return { ok: false, error: 'corto' };
    if (sacarBits(bits, total - 7, 7) !== control(bits, total - 7)) {
      return { ok: false, error: 'control' };
    }

    var completas = [];
    for (var k = 0; k < n; k++) completas.push(bits[9 + k] === 1);
    var leidos = [];
    for (var j = 0; j < c; j++) leidos.push(bits[inicioCuentos + j] === 1);

    return {
      ok: true, tipo: 'corto', completas: completas, cuentos: leidos,
      estrellas: sacarBits(bits, total - 19, 12)
    };
  }

  /* ------------------------------------------- traspaso completo -------- */

  /*
   * El enlace puede ser largo, así que ahí cabe TODO: además de las unidades
   * y los cuentos, la velocidad de lectura y los diagnósticos que hacen que
   * el repaso traiga justo lo que falla. Perder eso al cambiar de tableta
   * sería empezar de nuevo a medir cómo va.
   */
  var MARCA = 'F~';

  function aBase64(texto) {
    var b = global.btoa(unescape(encodeURIComponent(texto)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deBase64(texto) {
    var b = texto.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return decodeURIComponent(escape(global.atob(b)));
  }

  function exportarCompleto() {
    var d = leer();
    var hechas = Object.keys(d.unidades).filter(function (k) { return d.unidades[k].completa; });
    var carga = {
      v: 1,
      u: hechas,
      e: d.estrellas,
      l: d.lecturas.slice(-40),
      f: d.fallos,
      d: d.dias.slice(-90),
      a: {
        velocidad: d.ajustes.velocidad, chino: d.ajustes.chino,
        mayusculas: d.ajustes.mayusculas, micro: d.ajustes.micro,
        ingles: d.ajustes.ingles, desbloquearTodo: d.ajustes.desbloquearTodo
      }
    };
    try { return MARCA + aBase64(JSON.stringify(carga)); } catch (e) { return ''; }
  }

  function leerCompleto(texto) {
    try {
      var carga = JSON.parse(deBase64(String(texto).slice(MARCA.length)));
      if (!carga || carga.v !== 1 || !carga.u) return { ok: false, error: 'control' };
      return { ok: true, tipo: 'completo', carga: carga };
    } catch (e) {
      return { ok: false, error: 'control' };
    }
  }

  function esCompleto(texto) {
    return String(texto || '').trim().indexOf(MARCA) === 0;
  }

  /* Vale cualquiera de las dos formas: el código corto o el enlace completo. */
  function leerTraspaso(texto) {
    return esCompleto(texto) ? leerCompleto(texto) : leerCodigo(texto);
  }

  /* Aplica un traspaso ya validado. Sustituye el progreso, no lo mezcla. */
  function importarCodigo(codigo, unidades, cuentos) {
    cuentos = cuentos || [];
    var r = leerTraspaso(codigo);
    if (!r.ok) return r;

    var d = leer();
    /* La voz se queda: la del otro aparato no existe aquí. */
    var voz = d.ajustes.voz;
    var limpio = vacio();
    limpio.ajustes.voz = voz;

    if (r.tipo === 'completo') {
      var c = r.carga;
      c.u.forEach(function (id) { limpio.unidades[id] = { pasos: {}, estrellas: 0, completa: true }; });
      limpio.estrellas = c.e || 0;
      limpio.lecturas = c.l || [];
      limpio.fallos = c.f || {};
      limpio.dias = c.d || [];
      Object.keys(c.a || {}).forEach(function (k) {
        if (c.a[k] !== undefined) limpio.ajustes[k] = c.a[k];
      });
      memoria = limpio;
      guardar();
      return {
        ok: true, tipo: 'completo',
        unidades: c.u.filter(function (x) { return x.indexOf('cuento:') !== 0; }).length,
        cuentos: c.u.filter(function (x) { return x.indexOf('cuento:') === 0; }).length,
        estrellas: limpio.estrellas, lecturas: limpio.lecturas.length
      };
    }

    limpio.ajustes = d.ajustes;       // en el código corto los ajustes no viajan
    limpio.estrellas = r.estrellas;
    unidades.forEach(function (u, i) {
      if (r.completas[i]) limpio.unidades[u.id] = { pasos: {}, estrellas: 0, completa: true };
    });
    (r.cuentos || []).forEach(function (leido, i) {
      if (leido && cuentos[i]) {
        limpio.unidades['cuento:' + cuentos[i]] = { pasos: {}, estrellas: 0, completa: true };
      }
    });
    memoria = limpio;
    guardar();
    return {
      ok: true, tipo: 'corto',
      unidades: r.completas.filter(Boolean).length,
      cuentos: (r.cuentos || []).filter(Boolean).length,
      estrellas: r.estrellas, lecturas: 0
    };
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
    perfiles: listaPerfiles,
    perfilActivo: perfilActivo,
    crearPerfil: crearPerfil,
    renombrarPerfil: renombrarPerfil,
    activarPerfil: activarPerfil,
    borrarPerfil: borrarPerfil,
    marcarDia: marcarDia,
    racha: racha,
    apuntarFallo: apuntarFallo,
    apuntarAcierto: apuntarAcierto,
    unidadesFlojas: unidadesFlojas,
    erroresTipicos: erroresTipicos,
    apuntarLectura: apuntarLectura,
    lecturas: lecturas,
    estadisticas: estadisticas,
    exportarCodigo: exportarCodigo,
    exportarCompleto: exportarCompleto,
    leerCodigo: leerTraspaso,
    esCompleto: esCompleto,
    importarCodigo: importarCodigo,
    reiniciar: reiniciar,
    resumen: resumen,
    datos: leer,
    unidad: unidad
  };
})(window);
