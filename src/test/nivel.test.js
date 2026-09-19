/*!
 * Terminar una unidad no es sabérsela.
 *
 * El aviso de Armando: dando a los botones se recorren todas las letras en
 * una tarde y la app las da por aprendidas. Aquí se comprueba que el nivel
 * sale de cómo lo ha hecho, que repetir sirve para subirlo, y que nadie se
 * queda encerrado si el micrófono no le entiende.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function cargar() {
  const almacen = {};
  const ventana = {
    btoa: global.btoa, atob: global.atob,
    localStorage: {
      getItem: k => (k in almacen ? almacen[k] : null),
      setItem: (k, v) => { almacen[k] = String(v); },
      removeItem: k => { delete almacen[k]; }
    }
  };
  new Function('window', fs.readFileSync(path.join(__dirname, '..', 'js', 'progress.js'), 'utf8'))(ventana);
  return ventana.Progreso;
}

const UNIDADES = Array.from({ length: 8 }, (_, i) => ({ id: 'u' + i }));
const PASOS = ['intro', 'silabas', 'quiz-silaba', 'palabras', 'construir', 'quiz-pal', 'leer-tu', 'frases'];

/* Hace una unidad entera ganando "porPaso" estrellas en cada paso. */
function hacerUnidad(P, id, porPaso) {
  PASOS.forEach(p => P.completarPaso(id, p, porPaso));
  P.completarUnidad(id);
}

module.exports = function () {
  const fallos = [];
  let total = 0;
  const comprobar = (ok, q) => { total++; if (!ok) fallos.push('  ✗ ' + q); };

  /* --- 1. a botonazos: se termina, pero no se sabe --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 1);                       // una estrella por paso
    comprobar(P.unidadCompleta('u0'), 'la unidad consta como terminada');
    comprobar(P.nivelUnidad('u0') === 0,
      `pero el nivel tiene que ser 0, y es ${P.nivelUnidad('u0')}`);
    comprobar(!P.unidadSabida('u0'), 'y no se da por sabida');
    comprobar(!P.disponible(1, UNIDADES),
      'así que la siguiente NO se abre');
  }

  /* --- 2. haciéndolo bien, se abre --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 3);
    comprobar(P.nivelUnidad('u0') === 3, `nivel 3 al hacerlo todo a la primera (es ${P.nivelUnidad('u0')})`);
    comprobar(P.disponible(1, UNIDADES), 'y la siguiente se abre');
  }

  /* --- 3. con algún tropiezo también se avanza --- */
  {
    const P = cargar();
    PASOS.forEach((p, i) => P.completarPaso('u0', p, i % 3 === 0 ? 2 : 3));
    P.completarUnidad('u0');
    comprobar(P.nivelUnidad('u0') >= 2,
      `unos cuantos fallos sueltos no deberían cerrar el paso (nivel ${P.nivelUnidad('u0')})`);
  }

  /* --- 4. repetir sirve: se queda el mejor intento --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 1);
    const antes = P.nivelUnidad('u0');
    hacerUnidad(P, 'u0', 3);                       // la repite bien
    comprobar(P.nivelUnidad('u0') === 3,
      `repetirla bien tiene que subir el nivel (${antes} → ${P.nivelUnidad('u0')})`);
    comprobar(P.disponible(1, UNIDADES), 'y entonces sí se abre la siguiente');
  }

  /* --- 5. ...pero repetirla peor no lo baja --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 3);
    hacerUnidad(P, 'u0', 1);
    comprobar(P.nivelUnidad('u0') === 3, 'un intento malo después no borra lo que ya sabía');
  }

  /* --- 6. la válvula: a la tercera vuelta se abre igualmente --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 1);
    comprobar(!P.disponible(1, UNIDADES), 'primera vuelta floja: sigue cerrada');
    hacerUnidad(P, 'u0', 1);
    comprobar(!P.disponible(1, UNIDADES), 'segunda vuelta floja: sigue cerrada');
    hacerUnidad(P, 'u0', 1);
    comprobar(P.disponible(1, UNIDADES),
      'a la tercera se abre, para no dejar al niño encerrado si el micro no le entiende');
    comprobar(P.nivelUnidad('u0') === 0,
      'y el mapa sigue diciendo la verdad: nivel 0');
  }

  /* --- 7. la app propone la primera que no se sabe, no la siguiente sin más --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 3);
    hacerUnidad(P, 'u1', 1);           // ésta la pasó a botonazos
    hacerUnidad(P, 'u1', 1);
    hacerUnidad(P, 'u1', 1);           // válvula: abre la u2
    hacerUnidad(P, 'u2', 3);
    comprobar(P.primeraFloja(UNIDADES) === 1,
      `debería proponer volver a la u1, y propone la ${P.primeraFloja(UNIDADES)}`);
    comprobar(P.siguienteUnidad(UNIDADES) === 3,
      'pero el repaso sigue sabiendo que ha llegado hasta la u3');
  }

  /* --- 8. el adulto puede abrirlo todo --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 1);
    P.ajuste('desbloquearTodo', true);
    comprobar(P.disponible(5, UNIDADES), 'con "desbloquear todo" no se bloquea nada');
  }

  /* --- 9. el traspaso entre aparatos no pierde el nivel --- */
  {
    const P = cargar();
    hacerUnidad(P, 'u0', 3);
    hacerUnidad(P, 'u1', 1);
    const largo = P.exportarCompleto();
    const Q = cargar();
    Q.importarCodigo(largo, UNIDADES, []);
    comprobar(Q.nivelUnidad('u0') === 3, 'el nivel bueno viaja');
    comprobar(Q.nivelUnidad('u1') === 0, 'y el flojo también');
  }

  /* --- 10. quien ya venía usando la app no se encuentra todo cerrado ---
   *
   * Antes se apuntaba "paso hecho" y ya. Si eso se interpretara como el
   * peor resultado posible, al actualizar se le cerrarían de golpe las
   * unidades que ayer tenía abiertas y parecería una avería. */
  {
    const P = cargar();
    /* progreso como lo guardaba la versión anterior */
    const d = P.datos();
    d.unidades['u0'] = { pasos: { intro: true, silabas: true, 'quiz-silaba': true }, estrellas: 3, completa: true };
    d.unidades['u1'] = { pasos: { intro: true }, estrellas: 1, completa: false };
    P.ajuste('velocidad', 0.9);          // fuerza el guardado
    comprobar(P.nivelUnidad('u0') === 2,
      `una unidad hecha con la versión antigua no puede salir a 0 (salió ${P.nivelUnidad('u0')})`);
    comprobar(P.disponible(1, UNIDADES), 'y la siguiente sigue abierta');
    comprobar(P.nivelUnidad('u1') === 0, 'lo que quedó a medias sigue a medias');

    /* y en cuanto la repite, cuenta lo de verdad */
    PASOS.forEach(p => P.completarPaso('u0', p, 3));
    comprobar(P.nivelUnidad('u0') === 3, 'al repetirla, manda lo que haga ahora');
  }

  return { nombre: 'Nivel de cada unidad', total, fallos };
};
