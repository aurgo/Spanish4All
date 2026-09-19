/*!
 * pwa.js — Instalar la app en el dispositivo.
 *
 * El objetivo es que el niño tenga un icono en su tableta o en el escritorio
 * y la abra como cualquier otra aplicación, sin acordarse de dónde estaba el
 * archivo. Para eso hace falta un "manifest", y aquí se genera y se enchufa
 * en tiempo de ejecución en vez de vivir en un archivo aparte: así la app
 * sigue cabiendo en un único HTML.
 *
 * Lo que se puede y lo que no (comprobado con Chrome, no supuesto):
 *
 *   ✅ Manifest inyectado desde un blob: — Chrome lo lee sin un solo error,
 *      y la página queda instalable sin service worker.
 *      Requisito: start_url y scope tienen que ser URLs ABSOLUTAS. Si son
 *      relativas se resuelven contra el blob:, que no es una URL válida, y
 *      Chrome las descarta con "property 'start_url' ignored".
 *
 *   ❌ Registrar un service worker desde blob: o data: — prohibido:
 *      "The URL protocol of the script is not supported". Por eso un archivo
 *      suelto no puede funcionar sin conexión desde un servidor: hace falta
 *      un sw.js de verdad al lado (el que genera build.js en docs/).
 *
 *   ❌ Instalar desde file:// — Chrome responde "not-from-secure-origin".
 *      Abierto desde el disco la app funciona entera, pero para INSTALARLA
 *      hay que servirla por https. Ahí sí se puede crear un acceso directo
 *      que la abre en su propia ventana, que es casi lo mismo.
 */
(function (global) {
  'use strict';

  var Iconos = global.Iconos || {};
  var promesaInstalar = null;      // el evento beforeinstallprompt, si llega
  var swListo = false;

  function absoluta(hash) {
    return location.href.split('#')[0] + (hash || '');
  }

  function manifest() {
    var iconos = [];
    if (Iconos.i192) iconos.push({ src: Iconos.i192, sizes: '192x192', type: 'image/png', purpose: 'any' });
    if (Iconos.i512) iconos.push({ src: Iconos.i512, sizes: '512x512', type: 'image/png', purpose: 'any' });
    if (Iconos.iMask) iconos.push({ src: Iconos.iMask, sizes: '512x512', type: 'image/png', purpose: 'maskable' });

    return {
      name: 'Aprendo a leer en español',
      short_name: 'Aprendo a leer',
      description: 'Aprender a leer español desde cero, con la voz y el micrófono del navegador.',
      lang: 'es',
      dir: 'ltr',
      /* Absolutas a propósito: ver la nota de arriba. */
      start_url: absoluta(),
      scope: location.href.replace(/[^/]*(\?.*)?(#.*)?$/, ''),
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'any',
      background_color: '#fdf8f2',
      theme_color: '#e0632e',
      categories: ['education', 'kids'],
      icons: iconos,
      shortcuts: [{
        name: 'Leer cualquier cosa',
        short_name: 'Leer',
        url: absoluta('#lector'),
        icons: Iconos.i192 ? [{ src: Iconos.i192, sizes: '192x192' }] : undefined
      }]
    };
  }

  function inyectar() {
    if (document.querySelector('link[rel="manifest"]')) return;
    try {
      var texto = JSON.stringify(manifest());
      var url = URL.createObjectURL(new Blob([texto], { type: 'application/manifest+json' }));
      var enlace = document.createElement('link');
      enlace.rel = 'manifest';
      enlace.href = url;
      document.head.appendChild(enlace);
    } catch (e) {}

    /* iOS no usa el manifest: se guía por estas etiquetas. */
    if (Iconos.iApple && !document.querySelector('link[rel="apple-touch-icon"]')) {
      var apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = Iconos.iApple;
      document.head.appendChild(apple);
    }
  }

  /*
   * Si hay un sw.js servido al lado (el paquete de docs/), lo registramos y la
   * app funciona sin conexión. Si no lo hay — el archivo suelto — no pasa nada.
   */
  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    var url = new URL('sw.js', location.href).href;
    fetch(url, { method: 'GET' }).then(function (r) {
      if (!r.ok) return;
      var tipo = r.headers.get('content-type') || '';
      if (tipo.indexOf('javascript') === -1) return;
      return navigator.serviceWorker.register(url).then(function () { swListo = true; });
    }).catch(function () { /* sin sw.js al lado: es lo normal en el archivo suelto */ });
  }

  /* ¿Se está ejecutando ya como aplicación instalada? */
  function instalada() {
    try {
      return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
             global.navigator.standalone === true;
    } catch (e) { return false; }
  }

  function enMarco() {
    try { return global.self !== global.top; } catch (e) { return true; }
  }

  var ua = (global.navigator && global.navigator.userAgent) || '';
  var esIOS = /iPad|iPhone|iPod/.test(ua) ||
              (/Macintosh/.test(ua) && global.navigator.maxTouchPoints > 1);
  var esFirefox = /Firefox\//.test(ua);

  /*
   * Qué situación tenemos, para decirle a la persona exactamente qué hacer.
   *   nota     explicación en prosa
   *   pasos    instrucciones EN ORDEN (van numeradas)
   *   opciones caminos alternativos (van con viñeta: numerarlos engañaría)
   */
  function situacion() {
    if (instalada()) return { clave: 'ya' };

    if (enMarco()) {
      return {
        clave: 'marco',
        nota: 'Esta página está dentro de otra, y desde ahí el navegador no deja ' +
              'instalar. Ábrela en su propia pestaña y vuelve a pulsar Instalar.'
      };
    }

    if (location.protocol === 'file:') {
      return {
        clave: 'archivo',
        nota: 'Estás abriendo el archivo desde el disco. La app funciona entera así, ' +
              'pero para instalarla el navegador exige que venga de una dirección segura. ' +
              'Tienes dos caminos:',
        opciones: [
          'En el ordenador: menú ⋮ del navegador → Guardar y compartir → Crear acceso ' +
          'directo, y marca «Abrir como ventana». Queda un icono que la abre sola.',
          'En cualquier dispositivo: abre la app desde su enlace https y pulsa Instalar. ' +
          'Así además funciona sin internet.'
        ]
      };
    }

    if (promesaInstalar) return { clave: 'listo' };

    if (esIOS) {
      return {
        clave: 'ios',
        pasos: [
          'Pulsa el botón Compartir de Safari: el cuadrado con la flecha hacia arriba.',
          'Baja por la lista y elige «Añadir a pantalla de inicio».',
          'Pulsa Añadir. El icono aparece con los demás.'
        ]
      };
    }

    if (esFirefox) {
      return {
        clave: 'firefox',
        nota: 'Firefox de escritorio no instala aplicaciones web. Abre esta misma ' +
              'dirección con Chrome, Edge o Safari y podrás instalarla.'
      };
    }

    return {
      clave: 'manual',
      nota: 'Tu navegador todavía no ha ofrecido el botón. Puedes instalarla así:',
      opciones: [
        'Pulsa el icono de instalar de la barra de direcciones: una pantalla con una flecha.',
        'O abre el menú ⋮ y elige «Instalar» o «Añadir a pantalla de inicio».'
      ]
    };
  }

  /* Lanza el diálogo del navegador. Devuelve true si aceptó. */
  function instalar() {
    if (!promesaInstalar) return Promise.resolve(false);
    var evento = promesaInstalar;
    promesaInstalar = null;
    try {
      evento.prompt();
      return Promise.resolve(evento.userChoice).then(function (r) {
        return !!r && r.outcome === 'accepted';
      }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  var alCambiar = [];

  global.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    promesaInstalar = ev;
    alCambiar.forEach(function (fn) { try { fn(); } catch (e) {} });
  });

  global.addEventListener('appinstalled', function () {
    promesaInstalar = null;
    alCambiar.forEach(function (fn) { try { fn(); } catch (e) {} });
  });

  inyectar();
  registrarSW();

  global.PWA = {
    instalada: instalada,
    puedeInstalarYa: function () { return !!promesaInstalar; },
    instalar: instalar,
    situacion: situacion,
    sinConexion: function () { return swListo; },
    alCambiar: function (fn) { alCambiar.push(fn); }
  };
})(window);
