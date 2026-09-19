#!/usr/bin/env node
/*!
 * build.js — Empaqueta la app en un único archivo HTML.
 *
 * El código fuente está separado en módulos porque así se mantiene mejor,
 * pero para usarlo conviene tenerlo todo junto:
 *
 * Escribe en la raíz del repositorio, que es lo que publica GitHub Pages:
 *
 *   ../index.html              La app instalable, con su service worker al
 *                              lado. Es la versión que funciona sin conexión:
 *                              un navegador no deja registrar un service
 *                              worker desde un blob:, hace falta un .js
 *                              servido aparte.
 *   ../sw.js                   Ese service worker.
 *   ../manifest.webmanifest    El manifest, aquí como archivo de verdad.
 *   ../aprendo-a-leer.html     Todo en un solo archivo: se abre con doble
 *                              clic, sin servidor y sin internet.
 *
 * Sin dependencias: node src/build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const raiz = __dirname;                    // src/
const sitio = path.join(raiz, '..');       // la raíz del repositorio

const ORDEN = ['syllabify.js', 'speech.js', 'textos.js', 'curriculum.js', 'progress.js',
               'escucha.js', 'evaluar.js', 'modelo.js', 'iconos.js', 'pwa.js', 'app.js'];

function leer(rel) {
  return fs.readFileSync(path.join(raiz, rel), 'utf8');
}

const css = leer('assets/styles.css');
const js = ORDEN.map(f => `/* ===== js/${f} ===== */\n` + leer('js/' + f)).join('\n\n');

const FUENTES =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Nunito:wght@600;800&display=swap">';

const CUERPO =
  '<main id="app" class="app"></main>\n' +
  '<script>\n' + js + '\n</script>';

const completo = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Aprendo a leer en español</title>
<meta name="description" content="Aprender a leer español desde cero con la voz del propio navegador.">
<meta name="theme-color" content="#e0632e">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📖</text></svg>">
${FUENTES}
<style>
${css}
</style>
</head>
<body>
<noscript><p style="padding:24px;font-family:system-ui">Esta aplicación necesita JavaScript para poder hablar.</p></noscript>
${CUERPO}
</body>
</html>
`;

/* Para el Artifact: el servicio añade su propio esqueleto, así que aquí sólo
   van el <title>, los estilos y el contenido. */
const artifact = `<title>Aprendo a leer en español</title>
${FUENTES}
<style>
${css}
</style>
${CUERPO}
`;

/*
 * Service worker del paquete de docs/. Estrategia: primero la red, y si no
 * hay, lo que haya en caché. Así la app se actualiza sola cuando hay wifi y
 * sigue abriéndose cuando no lo hay.
 */
const SW = `/*! Service worker de "Aprendo a leer en español". Generado por build.js. */
const CACHE = 'aprendo-a-leer-v${Date.now()}';
const BASE = new URL('./', self.location).pathname;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([BASE, BASE + 'index.html']))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.ok && new URL(e.request.url).origin === self.location.origin) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match(BASE + 'index.html')))
  );
});
`;

/* Manifest servido como archivo: en docs/ no hace falta el truco del blob:. */
const MANIFEST = JSON.stringify({
  name: 'Aprendo a leer en español',
  short_name: 'Aprendo a leer',
  description: 'Aprender a leer español desde cero, con la voz y el micrófono del navegador.',
  lang: 'es',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#fdf8f2',
  theme_color: '#e0632e',
  categories: ['education', 'kids'],
  icons: [
    { src: 'icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  shortcuts: [{ name: 'Leer cualquier cosa', short_name: 'Leer', url: './#lector' }]
}, null, 2);

fs.writeFileSync(path.join(sitio, 'aprendo-a-leer.html'), completo);

/* En el sitio publicado el manifest es un archivo de verdad, así que se
   enlaza en el HTML; pwa.js detecta que ya hay uno y no inyecta el suyo. */
fs.writeFileSync(path.join(sitio, 'index.html'), completo.replace(
  '</head>',
  '<link rel="manifest" href="manifest.webmanifest">\n' +
  '<link rel="apple-touch-icon" href="icono-apple-180.png">\n</head>'
));
fs.writeFileSync(path.join(sitio, 'sw.js'), SW);
fs.writeFileSync(path.join(sitio, 'manifest.webmanifest'), MANIFEST);
fs.writeFileSync(path.join(sitio, '.nojekyll'), '');
['icono-192.png', 'icono-512.png', 'icono-maskable-512.png', 'icono-apple-180.png']
  .forEach(f => fs.copyFileSync(path.join(raiz, 'iconos', f), path.join(sitio, f)));

const kb = b => (Buffer.byteLength(b) / 1024).toFixed(0) + ' KB';
console.log('index.html            ' + kb(completo) + '   (sitio instalable + sw.js)');
console.log('aprendo-a-leer.html   ' + kb(completo) + '   (un solo archivo)');
