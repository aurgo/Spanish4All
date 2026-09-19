#!/usr/bin/env node
/*!
 * generar.js — Convierte los PNG de iconos/ en js/iconos.js.
 *
 * La app tiene que poder vivir en un único archivo HTML, así que los iconos
 * viajan como data: URI dentro del propio JavaScript. Este script sólo hace
 * falta si se cambia el diseño del icono:
 *
 *     node iconos/generar.js
 *
 * Los PNG se rasterizan a partir de iconos/icono.svg (ver README).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const FUENTES = [
  ['i192', 'icono-192.png'],
  ['i512', 'icono-512.png'],
  ['iMask', 'icono-maskable-512.png'],
  ['iApple', 'icono-apple-180.png']
];

const lineas = FUENTES.map(function ([clave, archivo]) {
  const datos = fs.readFileSync(path.join(dir, archivo)).toString('base64');
  return "    " + clave + ": 'data:image/png;base64,' +\n      '" + datos.match(/.{1,110}/g).join("' +\n      '") + "'";
});

const salida = `/*!
 * iconos.js — Iconos de la aplicación como data: URI.
 *
 * GENERADO por iconos/generar.js a partir de iconos/*.png. No editar a mano.
 * Van incrustados para que la app siga siendo un único archivo instalable.
 */
(function (global) {
  'use strict';
  global.Iconos = {
${lineas.join(',\n')}
  };
})(window);
`;

fs.writeFileSync(path.join(dir, '..', 'js', 'iconos.js'), salida);
console.log('js/iconos.js  ' + (Buffer.byteLength(salida) / 1024).toFixed(0) + ' KB');
