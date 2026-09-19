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
      items: {},         // la sílaba o palabra CONCRETA que ha fallado
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
    if (!memoria.items) memoria.items = {};
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
  /*
   * De cada paso guardamos CUÁNTAS estrellas sacó, no sólo que lo hizo.
   *
   * Antes se apuntaba "hecho" y punto, así que repetir una unidad no servía
   * de nada: el segundo intento, aunque fuera perfecto, no cambiaba ni las
   * estrellas ni lo que la app creía que sabía. Ahora se queda el mejor
   * intento, y repetir es la manera de subir.
   *
   * Los datos viejos guardaban true; Number(true) es 1, así que siguen
   * valiendo sin tocar nada.
   */
  function completarPaso(idUnidad, paso, estrellas) {
    var u = unidad(idUnidad);
    var s = Math.max(1, Math.min(3, estrellas || 1));
    var antes = Number(u.pasos[paso]) || 0;
    var nuevo = !antes;
    if (s > antes) {
      u.pasos[paso] = s;
      u.estrellas = (u.estrellas || 0) + (s - antes);
      leer().estrellas += (s - antes);
    }
    leer().ultimaUnidad = idUnidad;
    guardar();
    return nuevo;
  }

  function pasoHecho(idUnidad, paso) {
    return !!unidad(idUnidad).pasos[paso];
  }

  /*
   * Cuánto SABE de una unidad, de 0 a 3.
   *
   * Haberla terminado y saberla no son lo mismo. Dando a los botones se
   * llega al final de todas las letras en una tarde sin haber leído
   * ninguna, y la app lo daba por aprendido. El nivel sale de las estrellas
   * que se ha llevado frente a las que podía llevarse: tres por paso cuando
   * sale a la primera, menos según los fallos.
   */
  /*
   * La que conviene hacer AHORA, que no siempre es la siguiente.
   *
   * Si recorrió cuatro unidades a botonazos, lo que necesita no es la
   * quinta: es volver a la primera que no se sabe. Eso es lo que la portada
   * señala.
   */
  function primeraFloja(unidades) {
    for (var i = 0; i < unidades.length; i++) {
      if (!unidadCompleta(unidades[i].id)) {
        return disponible(i, unidades) ? i : Math.max(0, i - 1);
      }
      if (nivelUnidad(unidades[i].id) < 2) return i;
    }
    return Math.max(0, unidades.length - 1);
  }

  function nivelUnidad(idUnidad) {
    var u = unidad(idUnidad);
    var traido = u.nivel || 0;          // de otro aparato, o de antes de esto

    /*
     * Las versiones anteriores sólo apuntaban "paso hecho", sin cuántas
     * estrellas. De esos pasos no sabemos cómo fue, y suponer que fue mal
     * sería cerrarle de golpe unidades que ayer tenía abiertas — parecería
     * una avería. Lo que no consta, se le da por sabido; lo que haga a
     * partir de ahora sí cuenta de verdad.
     */
    var conNota = Object.keys(u.pasos).filter(function (k) {
      return typeof u.pasos[k] === 'number';
    });
    if (!conNota.length) {
      /* Si viene con nivel apuntado, ése es: lo dijo el otro aparato, aunque
         sea flojo. Sin nivel apuntado son datos de antes: no consta. */
      if (u.nivel !== undefined) return u.nivel;
      return u.completa ? 2 : 0;
    }

    var suma = 0;
    conNota.forEach(function (k) { suma += u.pasos[k]; });
    var razon = suma / (conNota.length * 3);
    var propio = razon >= 0.92 ? 3 : (razon >= 0.72 ? 2 : (razon >= 0.45 ? 1 : 0));
    /* Manda el mejor: repetirla peor no borra lo que ya sabía. */
    return Math.max(propio, traido);
  }

  /*
   * Sabida de verdad: la que abre la siguiente.
   *
   * Con una válvula, porque el juez es un micrófono: si el reconocimiento
   * falla en ese aparato, o la voz del niño no se entiende bien, exigir
   * nivel 2 lo dejaría encerrado para siempre en la misma unidad, y una app
   * en la que no se puede avanzar se abandona. A la tercera vuelta se abre
   * la siguiente igualmente; el mapa sigue enseñando el nivel de verdad, y
   * el repaso sigue devolviéndole lo que falló.
   */
  function unidadSabida(idUnidad) {
    if (!unidadCompleta(idUnidad)) return false;
    return nivelUnidad(idUnidad) >= 2 || (unidad(idUnidad).vueltas || 0) >= 3;
  }

  function completarUnidad(idUnidad) {
    var u = unidad(idUnidad);
    var nuevo = !u.completa;
    u.completa = true;
    u.vueltas = (u.vueltas || 0) + 1;
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
    /* La siguiente se abre cuando la anterior está SABIDA, no sólo vista.
       Si no, se recorre el curso entero sin aprender a leer, que es
       justamente lo que hay que evitar. */
    return unidadSabida(unidades[indice - 1].id);
  }

  /* Hasta dónde ha llegado: la primera sin terminar. Marca el material del
     que puede tirar el repaso. */
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

  /*
   * Fallos de una sílaba o palabra CONCRETA, no de la unidad entera.
   *
   * Saber que falla "la erre" sirve de poco; saber que falla "carro" y
   * "perro" permite devolvérselas tal cual. Esto es lo que convierte el
   * repaso en ejercicios hechos a su medida.
   */
  function apuntarFalloItem(tipo, item, idUnidad) {
    if (!tipo || !item) return;
    var d = leer();
    var k = tipo + ':' + item;
    var x = d.items[k] || { veces: 0, unidad: idUnidad, tipo: tipo, item: item };
    x.veces += 1;
    x.unidad = idUnidad || x.unidad;
    x.cuando = Date.now();
    d.items[k] = x;

    /* Sin tope, el listado crecería sin fin: nos quedamos con lo más reciente
       y lo que más veces ha fallado. */
    var claves = Object.keys(d.items);
    if (claves.length > 200) {
      claves.sort(function (a, b) {
        return (d.items[a].veces - d.items[b].veces) || (d.items[a].cuando - d.items[b].cuando);
      }).slice(0, claves.length - 200).forEach(function (c) { delete d.items[c]; });
    }
    guardar();
  }

  /* Acertar a la primera rebaja el contador; lo superado deja de repasarse. */
  function apuntarAciertoItem(tipo, item) {
    if (!tipo || !item) return;
    var d = leer();
    var k = tipo + ':' + item;
    if (!d.items[k]) return;
    d.items[k].veces -= 1;
    if (d.items[k].veces <= 0) delete d.items[k];
    guardar();
  }

  /* Lo que más se le atraganta, de un tipo concreto o de todos. */
  function itemsFlojos(tipo, cuantos) {
    var d = leer();
    return Object.keys(d.items)
      .map(function (k) { return d.items[k]; })
      .filter(function (x) { return !tipo || x.tipo === tipo; })
      .sort(function (a, b) { return (b.veces - a.veces) || (b.cuando - a.cuando); })
      .slice(0, cuantos || 50);
  }

  function hayQueRepasar() { return Object.keys(leer().items).length; }

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
      errores: erroresTipicos().slice(0, 5),
      items: itemsFlojos(null, 8)
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
    /* El nivel de cada unidad viaja aparte: sin esto, al llegar al otro
       aparato las unidades constarían como hechas pero con nivel 0, y se
       cerrarían todas las siguientes. */
    var niveles = {};
    hechas.forEach(function (id) { niveles[id] = nivelUnidad(id); });

    var carga = {
      v: 1,
      u: hechas,
      n: niveles,
      e: d.estrellas,
      l: d.lecturas.slice(-40),
      f: d.fallos,
      i: d.items,
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

  /*
   * Lo que de verdad pega la gente.
   *
   * El botón copia un ENLACE, así que eso es lo que se pega: la URL entera.
   * Y en la app instalada no hay barra de direcciones donde abrirla, así que
   * pegarla en la casilla es lo único que se puede hacer. Antes eso daba
   * "código no válido". Aquí se limpia: nos quedamos con lo que va detrás de
   * #p=, o con el último trozo si llega sin el #.
   */
  function limpiarTraspaso(texto) {
    var t = String(texto || '').trim().replace(/^[<"']+|[>"']+$/g, '');
    var corte = t.indexOf('#p=');
    if (corte !== -1) t = t.slice(corte + 3);
    else if (/^https?:\/\//i.test(t)) {
      var hash = t.indexOf('#');
      if (hash !== -1) t = t.slice(hash + 1);
      else t = t.slice(t.lastIndexOf('/') + 1);
    }
    try { if (t.indexOf('%') !== -1) t = decodeURIComponent(t); } catch (e) {}
    return t.trim();
  }

  /* Vale cualquiera de las dos formas: el código corto o el enlace completo. */
  function leerTraspaso(texto) {
    var t = limpiarTraspaso(texto);
    return esCompleto(t) ? leerCompleto(t) : leerCodigo(t);
  }

  /* Aplica un traspaso ya validado. Sustituye el progreso, no lo mezcla. */
  function importarCodigo(codigo, unidades, cuentos) {
    cuentos = cuentos || [];
    var r = leerTraspaso(codigo);
    if (!r.ok) return r;
    codigo = limpiarTraspaso(codigo);

    var d = leer();
    /* La voz se queda: la del otro aparato no existe aquí. */
    var voz = d.ajustes.voz;
    var limpio = vacio();
    limpio.ajustes.voz = voz;

    if (r.tipo === 'completo') {
      var c = r.carga;
      c.u.forEach(function (id) {
        var n = c.n && c.n[id] !== undefined ? c.n[id] : 2;
        limpio.unidades[id] = { pasos: {}, estrellas: 0, completa: true, nivel: n };
      });
      limpio.estrellas = c.e || 0;
      limpio.lecturas = c.l || [];
      limpio.fallos = c.f || {};
      limpio.items = c.i || {};
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
    /* El código corto no puede llevar el detalle — son 17 caracteres —, así
       que lo hecho allí se da por sabido: quien ya hizo el trabajo en otro
       aparato no puede encontrarse aquí todo cerrado. */
    unidades.forEach(function (u, i) {
      if (r.completas[i]) limpio.unidades[u.id] = { pasos: {}, estrellas: 0, completa: true, nivel: 2 };
    });
    (r.cuentos || []).forEach(function (leido, i) {
      if (leido && cuentos[i]) {
        limpio.unidades['cuento:' + cuentos[i]] = { pasos: {}, estrellas: 0, completa: true, nivel: 2 };
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
    nivelUnidad: nivelUnidad,
    primeraFloja: primeraFloja,
    unidadSabida: unidadSabida,
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
    apuntarFalloItem: apuntarFalloItem,
    apuntarAciertoItem: apuntarAciertoItem,
    itemsFlojos: itemsFlojos,
    hayQueRepasar: hayQueRepasar,
    unidadesFlojas: unidadesFlojas,
    erroresTipicos: erroresTipicos,
    apuntarLectura: apuntarLectura,
    lecturas: lecturas,
    estadisticas: estadisticas,
    exportarCodigo: exportarCodigo,
    exportarCompleto: exportarCompleto,
    leerCodigo: leerTraspaso,
    limpiarTraspaso: limpiarTraspaso,
    esCompleto: esCompleto,
    importarCodigo: importarCodigo,
    reiniciar: reiniciar,
    resumen: resumen,
    datos: leer,
    unidad: unidad
  };
})(window);
