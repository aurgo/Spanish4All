#!/usr/bin/env node
/*! Ejecuta todas las comprobaciones: node test/run.js */
'use strict';

const suites = [
  require('./silabas.test.js'),
  require('./curriculo.test.js'),
  require('./evaluar.test.js'),
  require('./codigo.test.js'),
  require('./avanzado.test.js'),
  require('./perfiles.test.js'),
  require('./textos.test.js'),
  require('./voz.test.js'),
  require('./nivel.test.js')
];

/* Alguna comprobación necesita esperar (la voz avisa de su error por
   callback), así que una suite puede devolver una promesa. */
(async () => {
  let fallos = 0;
  for (const suite of suites) {
    const r = await suite();
    if (r.fallos.length) {
      fallos += r.fallos.length;
      console.log(`✗ ${r.nombre}: ${r.fallos.length} fallo(s) de ${r.total} comprobaciones`);
      r.fallos.forEach(f => console.log(f));
    } else {
      console.log(`✓ ${r.nombre}: ${r.total} comprobaciones correctas`);
    }
  }
  if (fallos) { console.log(`\n${fallos} fallo(s).`); process.exit(1); }
  console.log('\nTodo correcto.');
})();
