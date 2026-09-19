/*!
 * Casos de división silábica. Si tocas js/syllabify.js, esto tiene que seguir
 * en verde: son justo los casos donde es fácil equivocarse.
 */
'use strict';
const S = require('../js/syllabify.js');

const CASOS = {
  /* Lo básico */
  'a': 'a', 'oso': 'o-so', 'mamá': 'ma-má', 'casa': 'ca-sa', 'pato': 'pa-to',
  /* Dígrafos que nunca se parten */
  'perro': 'pe-rro', 'carro': 'ca-rro', 'chocolate': 'cho-co-la-te',
  'llave': 'lla-ve', 'mochila': 'mo-chi-la', 'niño': 'ni-ño',
  /* qu / gu con u muda, y ü que sí suena */
  'queso': 'que-so', 'guitarra': 'gui-ta-rra', 'gigante': 'gi-gan-te',
  'pingüino': 'pin-güi-no', 'cigüeña': 'ci-güe-ña',
  /* Grupos consonánticos inseparables */
  'hablar': 'ha-blar', 'sombrero': 'som-bre-ro', 'cangrejo': 'can-gre-jo',
  'bicicleta': 'bi-ci-cle-ta', 'cocodrilo': 'co-co-dri-lo', 'flor': 'flor', 'tres': 'tres',
  /* Reparto de 2, 3 y 4 consonantes */
  'carta': 'car-ta', 'constante': 'cons-tan-te', 'instrumento': 'ins-tru-men-to',
  'transporte': 'trans-por-te', 'abstracto': 'abs-trac-to', 'obstruir': 'obs-truir',
  'atlántico': 'at-lán-ti-co', 'psicólogo': 'psi-có-lo-go', 'desarrollo': 'de-sa-rro-llo',
  /* Diptongos, triptongos e hiatos */
  'aire': 'ai-re', 'agua': 'a-gua', 'ruido': 'rui-do', 'ciudad': 'ciu-dad',
  'avión': 'a-vión', 'murciélago': 'mur-cié-la-go', 'huevo': 'hue-vo',
  'buey': 'buey', 'estudiáis': 'es-tu-diáis',
  'león': 'le-ón', 'teatro': 'te-a-tro', 'maestro': 'ma-es-tro',
  'río': 'rí-o', 'país': 'pa-ís', 'baúl': 'ba-úl',
  /* La "y" como semivocal al cerrar sílaba */
  'rey': 'rey', 'muy': 'muy', 'hoy': 'hoy', 'playa': 'pla-ya', 'yo': 'yo',
  /* La "h" no rompe la sílaba siguiente */
  'prohibido': 'pro-hi-bi-do', 'búho': 'bú-ho', 'ahí': 'a-hí',
  /* Sílabas inversas y palabras del currículo */
  'elefante': 'e-le-fan-te', 'árbol': 'ár-bol', 'español': 'es-pa-ñol',
  'xilófono': 'xi-ló-fo-no', 'taxi': 'ta-xi', 'kiwi': 'ki-wi'
};

const TONICAS = {
  'mamá': 'má', 'casa': 'ca', 'árbol': 'ár', 'español': 'ñol',
  'música': 'mú', 'pared': 'red', 'teléfono': 'lé', 'ciudad': 'dad'
};

module.exports = function () {
  const fallos = [];

  Object.keys(CASOS).forEach(palabra => {
    const obtenido = S.syllabify(palabra).join('-');
    if (obtenido !== CASOS[palabra]) {
      fallos.push(`  ${palabra}: esperado "${CASOS[palabra]}", obtenido "${obtenido}"`);
    }
  });

  Object.keys(TONICAS).forEach(palabra => {
    const silabas = S.syllabify(palabra);
    const obtenido = silabas[S.stressIndex(silabas)];
    if (obtenido !== TONICAS[palabra]) {
      fallos.push(`  ${palabra}: tónica esperada "${TONICAS[palabra]}", obtenida "${obtenido}"`);
    }
  });

  /* El texto se reconstruye tal cual, con su puntuación. */
  const texto = '¡Hola! ¿Qué tal, León?';
  const rehecho = S.tokenize(texto).map(t => t.text).join('');
  if (rehecho !== texto) fallos.push(`  tokenize no reconstruye el texto: "${rehecho}"`);

  return {
    nombre: 'Silabeador',
    total: Object.keys(CASOS).length + Object.keys(TONICAS).length + 1,
    fallos: fallos
  };
};
