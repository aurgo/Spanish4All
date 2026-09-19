/*!
 * Los textos de la interfaz, en las dos lenguas.
 *
 * La regla de la app: el niño habla español pero NO lo lee, y lee chino
 * tradicional. Así que todo lo que aparece escrito tiene que aparecer también
 * en chino. Un texto sin su par chino es una pantalla que no puede usar solo.
 *
 * Y al revés: si app.js pide una clave que no existe, T.t() devuelve la clave
 * tal cual y en pantalla sale «leeLaFrase». Eso también se comprueba aquí,
 * porque es un fallo que no rompe nada y no se ve hasta que lo ve el niño.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function leer(fichero) {
  return fs.readFileSync(path.join(__dirname, '..', 'js', fichero), 'utf8');
}

function cargarTextos() {
  const ventana = { localStorage: {
    getItem: () => null, setItem: () => {}, removeItem: () => {}
  } };
  new Function('window', leer('textos.js'))(ventana);
  return ventana.Textos;
}

module.exports = function () {
  const fallos = [];
  let total = 0;

  const T = cargarTextos();
  const TABLA = T.tabla();
  const claves = Object.keys(TABLA);

  /* --- 1. cada texto, con su chino --- */
  claves.forEach(clave => {
    total++;
    const v = TABLA[clave];
    if (!Array.isArray(v) || !v[0]) {
      fallos.push(`  ✗ «${clave}» no tiene texto en español`);
      return;
    }
    if (!v[1]) {
      fallos.push(`  ✗ «${clave}» no tiene chino: "${v[0]}"`);
      return;
    }
    /* Chino de verdad, no español copiado en la segunda casilla. */
    if (!/[㐀-鿿！-･]/.test(v[1])) {
      fallos.push(`  ✗ «${clave}» tiene algo que no parece chino: "${v[1]}"`);
    }
  });

  /* --- 2. chino tradicional, no simplificado --- */
  /* Un puñado de simplificados que sí se cuelan al escribir: si aparecen,
     es que el texto no está en tradicional. */
  /* 音, 后 y otros valen en las dos: sólo van aquí los que NO existen en
     tradicional. */
  const SIMPLIFICADOS = '个说话读听点击开关时间语习练进边这么为们试单词书亲声择极难';
  claves.forEach(clave => {
    const zh = (TABLA[clave] || [])[1];
    if (!zh) return;
    total++;
    const malas = zh.split('').filter(c => SIMPLIFICADOS.indexOf(c) !== -1);
    if (malas.length) {
      fallos.push(`  ✗ «${clave}» usa simplificado (${malas.join(' ')}): "${zh}"`);
    }
  });

  /* --- 3. lo que pide app.js existe --- */
  const app = leer('app.js');
  const pedidas = new Set();
  const patron = /\b(?:T\.t|T\.es|T\.zh|T\.conChino|etiqueta)\(\s*'([A-Za-z0-9_]+)'/g;
  let m;
  while ((m = patron.exec(app))) pedidas.add(m[1]);

  total++;
  if (pedidas.size < 60) {
    fallos.push(`  ✗ sólo se han encontrado ${pedidas.size} claves en app.js: el patrón no está buscando bien`);
  }

  pedidas.forEach(clave => {
    total++;
    if (!TABLA[clave]) fallos.push(`  ✗ app.js pide «${clave}» y no está en textos.js`);
  });

  /* --- 3b. lo que se DICE en voz alta no puede llevar chino dentro ---
   *
   * T.t() devuelve "español\nchino". Si ese texto acaba en el sintetizador,
   * la voz española se pone a leer caracteres chinos en alto. Pasaba en diez
   * enunciados y nadie lo había notado, porque suena a ruido y se da por
   * supuesto que el aparato pronuncia raro.
   */
  const HABLAN = [
    [/\bnarrar\(\s*T\.t\(/g, 'narrar()'],
    [/\bdecir\(\s*T\.t\(/g, 'decir()'],
    [/Voz\.hablar\(\s*T\.t\(/g, 'Voz.hablar()'],
    [/Voz\.hablarEnIngles\(\s*T\.t\(/g, 'Voz.hablarEnIngles()'],
    /* marco(hijos, clave, loQueSeDice): el tercero se pronuncia */
    [/\],\s*'[A-Za-z]+',\s*T\.t\(/g, 'el enunciado hablado de marco()'],
    /* partes de Voz.secuencia: { text: …, tipo: … } */
    [/\{\s*text:\s*T\.t\([^)]*\)[^}]*tipo:/g, 'una parte de Voz.secuencia']
  ];
  HABLAN.forEach(([patron, donde]) => {
    total++;
    const encontrados = app.match(patron);
    if (encontrados) {
      fallos.push(`  ✗ ${donde} habla con T.t(), que lleva el chino pegado: ${encontrados[0]}`);
    }
  });

  /* Y un enunciado escrito a mano en español nunca llega a traducirse. */
  total++;
  const aMano = app.match(/\],\s*'[A-Za-z]+',\s*'[^']{6,}'/g);
  if (aMano) {
    fallos.push(`  ✗ enunciado escrito a mano, sin pasar por la tabla: ${aMano[0]}`);
  }

  /* --- 4. mostrar da las dos lenguas; hablar, sólo español --- */
  total++;
  T.usarChino(true);
  const dos = T.t('siguiente');
  if (dos.indexOf('\n') === -1) {
    fallos.push(`  ✗ con el chino puesto, T.t() debería dar las dos lenguas: "${dos}"`);
  }
  total++;
  if (T.es('siguiente').indexOf('\n') !== -1) {
    fallos.push('  ✗ T.es() es lo que se dice en voz alta: no puede llevar chino');
  }
  total++;
  T.usarChino(false);
  if (T.t('siguiente').indexOf('\n') !== -1) {
    fallos.push('  ✗ con el chino quitado, T.t() no debería añadirlo');
  }
  T.usarChino(true);

  return { nombre: 'Textos en dos lenguas', total, fallos };
};
