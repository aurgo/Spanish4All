/*!
 * evaluar.js — Puntúa una lectura en voz alta comparando SONIDOS, no letras.
 *
 * Por qué no basta con comparar el texto: el reconocedor devuelve ortografía,
 * y el español tiene muchas letras distintas que suenan igual. Si el niño lee
 * "vaca" perfectamente, el micrófono puede escribir "baca" — y eso es una
 * lectura CORRECTA que no se puede penalizar. Lo mismo con b/v, ll/y, c/z/s,
 * la h muda, g/j y qu/k.
 *
 * Así que primero pasamos las dos frases a una transcripción fonética burda y
 * comparamos ésa. Las distinciones que SÍ importan al leer se conservan:
 *
 *      pero / perro   → pero / peRo     (la vibrante múltiple es otro sonido)
 *      casa / caza    → kasa / kasa     (igual: seseo, no es error de lectura)
 *      vaca / baca    → baka / baka     (igual)
 *      pollo / poyo   → poYo / poYo     (igual: yeísmo)
 *      hola / ola     → ola  / ola      (igual: la hache es muda)
 *      pingüino       → pinGuino        (la diéresis sí suena)
 *
 * Sin dependencias más allá del silabeador, para el recuento de sílabas.
 */
(function (global) {
  'use strict';

  /*
   * Transcripción fonética aproximada. Usa mayúsculas como símbolos propios
   * para los sonidos que no tienen una letra única:
   *   C = ch    Y = ll/y    R = erre fuerte    G = g dura    N = ñ
   */
  function fonetica(palabra) {
    var s = String(palabra || '').toLowerCase().trim();

    s = s.replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
         .replace(/[óòôö]/g, 'o').replace(/[úùû]/g, 'u');
    s = s.replace(/[^a-zñü]/g, '');
    if (!s) return '';

    s = s.replace(/gü([ei])/g, 'Gu$1');   // la diéresis hace sonar la u
    s = s.replace(/ü/g, 'u');

    s = s.replace(/ch/g, 'C');
    s = s.replace(/ll/g, 'Y');
    s = s.replace(/rr/g, 'R');
    s = s.replace(/h/g, '');              // muda, y ya hemos sacado la ch

    s = s.replace(/qu([ei])/g, 'k$1');    // u muda
    s = s.replace(/gu([ei])/g, 'G$1');    // u muda, g dura
    s = s.replace(/^r/, 'R');             // erre inicial: siempre fuerte
    s = s.replace(/([nls])r/g, '$1R');    // honra, alrededor, Israel

    s = s.replace(/g([ei])/g, 'j$1');     // gente, gigante
    s = s.replace(/g/g, 'G');
    s = s.replace(/x/g, 'ks');
    s = s.replace(/c([ei])/g, 's$1');     // cielo, cine
    s = s.replace(/z/g, 's');             // seseo: no es error de lectura
    s = s.replace(/[cq]/g, 'k');
    s = s.replace(/[vw]/g, 'b');          // b y v suenan igual
    s = s.replace(/y$/, 'i').replace(/y/g, 'Y');
    s = s.replace(/ñ/g, 'N');

    return s;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var fila = [];
    for (var j = 0; j <= b.length; j++) fila[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var previa = fila[0];
      fila[0] = i;
      for (j = 1; j <= b.length; j++) {
        var temp = fila[j];
        fila[j] = Math.min(
          fila[j] + 1,
          fila[j - 1] + 1,
          previa + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        previa = temp;
      }
    }
    return fila[b.length];
  }

  function similitud(a, b) {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  }

  function troceal(texto) {
    return String(texto || '')
      .split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/)
      .filter(Boolean)
      .map(function (p) { return { texto: p, fon: fonetica(p) }; })
      .filter(function (p) { return p.fon.length > 0; });
  }

  /*
   * Empareja lo esperado con lo oído permitiendo que falten o sobren palabras
   * (programación dinámica sobre palabras, con la similitud como coste).
   */
  function alinear(esperadas, oidas) {
    var n = esperadas.length, m = oidas.length;
    var coste = [], paso = [];
    var i, j;
    for (i = 0; i <= n; i++) {
      coste[i] = []; paso[i] = [];
      for (j = 0; j <= m; j++) { coste[i][j] = 0; paso[i][j] = ''; }
    }
    for (i = 1; i <= n; i++) { coste[i][0] = i; paso[i][0] = 'falta'; }
    for (j = 1; j <= m; j++) { coste[0][j] = j; paso[0][j] = 'sobra'; }

    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var sustituir = coste[i - 1][j - 1] + (1 - similitud(esperadas[i - 1].fon, oidas[j - 1].fon));
        var faltar = coste[i - 1][j] + 1;
        var sobrar = coste[i][j - 1] + 1;
        var mejor = Math.min(sustituir, faltar, sobrar);
        coste[i][j] = mejor;
        paso[i][j] = mejor === sustituir ? 'par' : (mejor === faltar ? 'falta' : 'sobra');
      }
    }

    var pares = [];
    i = n; j = m;
    while (i > 0 || j > 0) {
      var mov = (i > 0 && j > 0) ? paso[i][j] : (i > 0 ? 'falta' : 'sobra');
      if (mov === 'par') { pares.unshift({ esperada: esperadas[i - 1], oida: oidas[j - 1] }); i--; j--; }
      else if (mov === 'falta') { pares.unshift({ esperada: esperadas[i - 1], oida: null }); i--; }
      else { pares.unshift({ esperada: null, oida: oidas[j - 1] }); j--; }
    }
    return pares;
  }

  /*
   * Qué ha fallado exactamente. Devuelve una pista concreta o null.
   * Sólo señalamos diferencias que son errores de LECTURA de verdad.
   */
  function diagnosticar(esperada, oida) {
    if (!oida) return { clave: 'falta', texto: 'Te has saltado una palabra.' };
    var a = esperada.fon, b = oida.fon;
    if (a === b) return null;

    var silA = global.Silabas ? global.Silabas.syllabify(esperada.texto).length : 0;
    var silB = global.Silabas ? global.Silabas.syllabify(oida.texto).length : 0;

    if (a.indexOf('R') !== -1 && b.indexOf('R') === -1 && b.indexOf('r') !== -1) {
      return { clave: 'rr', texto: 'Ojo con la erre fuerte: hay que hacerla vibrar, rrr.' };
    }
    if (a.indexOf('R') === -1 && a.indexOf('r') !== -1 && b.indexOf('R') !== -1) {
      return { clave: 'r', texto: 'Esa erre es suave: un solo golpecito de lengua.' };
    }
    if (silA && silB && silB < silA) {
      return { clave: 'silabas-menos', texto: 'Te has comido una sílaba. Léela despacio, trozo a trozo.' };
    }
    if (silA && silB && silB > silA) {
      return { clave: 'silabas-mas', texto: 'Has dicho una sílaba de más. Mira bien los trozos.' };
    }
    /* Por debajo de este parecido, lo dicho no tiene que ver con lo escrito:
       afinar el diagnóstico sólo produciría pistas absurdas. */
    if (similitud(a, b) < 0.45) {
      return { clave: 'otra', texto: 'Esa no era. Escucha cómo suena y vuelve a intentarlo.' };
    }
    if (a.replace(/[aeiou]/g, '') === b.replace(/[aeiou]/g, '')) {
      return { clave: 'vocal', texto: 'Las consonantes están bien; falla alguna vocal.' };
    }
    if (a.replace(/[^aeiou]/g, '') === b.replace(/[^aeiou]/g, '')) {
      return { clave: 'consonante', texto: 'Las vocales están bien; repasa alguna consonante.' };
    }
    return { clave: 'otra', texto: 'Casi. Escucha cómo suena y vuelve a intentarlo.' };
  }

  var BIEN = 0.90;
  var CASI = 0.62;

  /* Puntúa UNA transcripción contra el texto esperado. */
  function puntuarUna(objetivo, oido) {
    var esperadas = troceal(objetivo);
    var oidas = troceal(oido);
    var pares = alinear(esperadas, oidas);

    var palabras = [];
    var suma = 0;
    var sobras = 0;

    pares.forEach(function (par) {
      if (!par.esperada) { sobras++; return; }
      var sim = par.oida ? similitud(par.esperada.fon, par.oida.fon) : 0;
      var estado = sim >= BIEN ? 'bien' : (sim >= CASI ? 'casi' : 'mal');
      suma += sim;
      palabras.push({
        texto: par.esperada.texto,
        oida: par.oida ? par.oida.texto : null,
        similitud: sim,
        estado: estado,
        pista: estado === 'bien' ? null : diagnosticar(par.esperada, par.oida)
      });
    });

    var media = palabras.length ? suma / palabras.length : 0;
    /* Palabras de más restan un poco, pero sin castigar de más a un niño. */
    var penalizacion = Math.min(0.15, sobras * 0.05);
    var nota = Math.max(0, Math.round((media - penalizacion) * 100));

    /*
     * Las estrellas miran también la PEOR palabra, no sólo la media: en una
     * frase larga, una media alta puede esconder un fallo importante — leer
     * "perro" como "pero" es exactamente lo que la app enseña a no hacer.
     */
    var hayMal = palabras.some(function (p) { return p.estado === 'mal'; });
    var hayCasi = palabras.some(function (p) { return p.estado === 'casi'; });
    var estrellas = 0;
    if (nota >= 88 && !hayMal && !hayCasi) estrellas = 3;
    else if (nota >= 68 && !hayMal) estrellas = 2;
    else if (nota >= 40) estrellas = 1;

    return {
      nota: nota,
      estrellas: estrellas,
      palabras: palabras,
      oido: oido,
      pista: (palabras.filter(function (p) { return p.pista; })[0] || {}).pista || null
    };
  }

  /*
   * Puntúa contra TODAS las alternativas del reconocedor y se queda con la
   * mejor: si alguna coincide, es que el niño lo dijo bien y el micrófono
   * simplemente eligió otra grafía.
   */
  function puntuar(objetivo, transcripciones) {
    var lista = [].concat(transcripciones || []).filter(Boolean);
    if (!lista.length) return puntuarUna(objetivo, '');
    var mejor = null;
    lista.forEach(function (t) {
      var r = puntuarUna(objetivo, t);
      if (!mejor || r.nota > mejor.nota) mejor = r;
    });
    return mejor;
  }

  var ANIMOS = {
    3: ['¡Perfecto!', '¡Muy bien leído!', '¡Clavado!'],
    2: ['¡Casi perfecto!', '¡Muy bien, casi entero!'],
    1: ['Vas por buen camino.', 'Poco a poco.'],
    0: ['Vamos a escucharlo otra vez.', 'Escucha y repite conmigo.']
  };

  function animo(estrellas) {
    var lista = ANIMOS[estrellas] || ANIMOS[0];
    return lista[Math.floor(Math.random() * lista.length)];
  }

  global.Evaluar = {
    fonetica: fonetica,
    similitud: similitud,
    puntuar: puntuar,
    animo: animo,
    troceal: troceal
  };
})(window);
