/*!
 * avanzado.js — Material para cuando ya descifra: el tramo que va de
 * "pronunciar letras" a "leer".
 *
 * Cuatro bloques, cada uno atacando un problema distinto:
 *
 *   ingles         Los falsos amigos del alfabeto. Quien aprendió las letras
 *                  en inglés arrastra sus valores: la "i" que allí se llama
 *                  /ai/ y aquí suena /i/. Es la interferencia más probable en
 *                  alguien que llega al español sabiendo el abecedario inglés,
 *                  y se corrige oyendo las dos cosas seguidas.
 *
 *   inventadas     Palabras que no existen pero podrían. No se pueden adivinar
 *                  por su forma ni recordar de memoria: o se descifran letra a
 *                  letra o no salen. Es la prueba de fuego de la lectura
 *                  alfabética, y el antídoto contra leer por silueta — un
 *                  hábito natural en quien viene de una escritura donde cada
 *                  signo se reconoce entero.
 *
 *   pares          Palabras reales que se diferencian en una letra o en su
 *                  orden. Obligan a mirar DENTRO de la palabra.
 *
 *   cuentos        Textos con sentido y moraleja, con una pregunta al final.
 *                  La pregunta no es adorno: si descifró bien, la acierta sin
 *                  esfuerzo, porque ya habla español. Si falla, es que leyó
 *                  mal. Es un detector de decodificación disfrazado de cuento.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------ falsos amigos ------- */
  /*
   * en / es: la misma letra en las dos lenguas.
   * muestraEn se pronuncia con voz inglesa y muestraEs con voz española,
   * una detrás de otra, para que el contraste se oiga en lugar de leerse.
   */
  var ingles = [
    { letra: 'a', muestraEn: 'name', muestraEs: 'ala',
      nota: 'En inglés la A dice su nombre, /ei/. En español siempre suena a, abriendo la boca.',
      notaZh: '英文的 A 唸它的名字 /ei/。西班牙語永遠唸 a，嘴巴張開。' },
    { letra: 'e', muestraEn: 'he', muestraEs: 'eso',
      nota: 'En inglés la E suena /ii/. En español suena e, cortita.',
      notaZh: '英文的 E 唸 /ii/。西班牙語唸 e，短短的。' },
    { letra: 'i', muestraEn: 'ice', muestraEs: 'isla',
      nota: 'Ésta es la que más lía: en inglés la I suena /ai/. En español suena i, siempre.',
      notaZh: '這個最容易搞混：英文的 I 唸 /ai/。西班牙語永遠唸 i。' },
    { letra: 'o', muestraEn: 'no', muestraEs: 'oso',
      nota: 'En inglés la O se alarga y se cierra. En español es una o redonda y limpia.',
      notaZh: '英文的 O 拉長而且收口。西班牙語是圓圓乾淨的 o。' },
    { letra: 'u', muestraEn: 'use', muestraEs: 'uva',
      nota: 'En inglés la U suena /iu/. En español suena u, como un beso.',
      notaZh: '英文的 U 唸 /iu/。西班牙語唸 u，像親嘴的樣子。' },
    { letra: 'h', muestraEn: 'hat', muestraEs: 'hola',
      nota: 'En inglés la H sopla. En español no suena nada: hola se lee ola.',
      notaZh: '英文的 H 要吹氣。西班牙語完全不發音：hola 唸作 ola。' },
    { letra: 'j', muestraEn: 'jam', muestraEs: 'jamón',
      nota: 'En inglés la J suena /dch/. En español sale del fondo de la garganta.',
      notaZh: '英文的 J 唸 /dj/。西班牙語從喉嚨深處發出來。' },
    { letra: 'v', muestraEn: 'very', muestraEs: 'vaca',
      nota: 'En inglés la V se hace con los dientes en el labio. En español suena igual que la be.',
      notaZh: '英文的 V 用牙齒咬嘴唇。西班牙語跟 b 完全一樣。' },
    { letra: 'g', muestraEn: 'giant', muestraEs: 'gigante',
      nota: 'Con e y con i, la G inglesa suena /dch/. La española suena como la jota.',
      notaZh: '在 e、i 前面，英文的 G 唸 /dj/。西班牙語唸得像 j。' },
    { letra: 'z', muestraEn: 'zoo', muestraEs: 'zapato',
      nota: 'La Z inglesa zumba. La española no zumba: es una ese, o la lengua entre los dientes.',
      notaZh: '英文的 Z 會嗡嗡響。西班牙語不會：唸成 s，或舌頭放在牙齒之間。' },
    { letra: 'qu', muestraEn: 'queen', muestraEs: 'queso',
      nota: 'En inglés qu suena /kw/, con u. En español la u no se oye: que suena ke.',
      notaZh: '英文的 qu 唸 /kw/，有 u 的音。西班牙語聽不到 u：que 唸作 ke。' },
    { letra: 'r', muestraEn: 'red', muestraEs: 'rosa',
      nota: 'La R inglesa no toca el paladar. La española vibra: rrr.',
      notaZh: '英文的 R 不碰上顎。西班牙語會振動：rrr。' },
    { letra: 'll', muestraEn: 'tall', muestraEs: 'llave',
      nota: 'Dos eles en inglés siguen siendo una ele. En español suenan como la ye.',
      notaZh: '英文兩個 l 還是 l 的音。西班牙語唸起來像 y。' },
    { letra: 'ñ', muestraEn: 'canyon', muestraEs: 'niño',
      nota: 'Esta letra no existe en inglés. Es la eñe, y sólo la tiene el español.',
      notaZh: '這個字母英文沒有。它叫 eñe，只有西班牙語才有。' }
  ];

  /* ------------------------------------------- palabras inventadas ------ */
  /*
   * Ninguna existe en español, pero todas podrían existir: respetan sus
   * reglas. Van de menos a más: sílabas abiertas, luego trabadas, luego
   * inversas y diptongos.
   */
  var inventadas = [
    { nivel: 1, lista: ['lomi', 'tefa', 'sapu', 'mune', 'dopi', 'bimo', 'chena', 'ñapo',
                        'yuti', 'zalo', 'gupe', 'jeta'] },
    { nivel: 2, lista: ['prata', 'clemo', 'brito', 'flude', 'grusa', 'trepo', 'plina',
                        'dracu', 'glefa', 'cruti'] },
    { nivel: 3, lista: ['alpo', 'ferti', 'urnal', 'espru', 'mondri', 'calcuz', 'tarbo',
                        'pieta', 'nauri', 'quebio', 'fuinda', 'zarpel'] }
  ];

  /* ------------------------------------------------- pares mínimos ------ */
  /*
   * Palabras de verdad que se distinguen por una letra, o por el orden.
   * "diferencia" dice qué hay que mirar, para poder explicarlo si falla.
   */
  var pares = [
    { a: ['pato', '🦆'], b: ['pata', '🐾'], diferencia: 'la última vocal' },
    { a: ['gato', '🐈'], b: ['gota', '💧'], diferencia: 'el orden de las letras' },
    { a: ['pero', '🤔'], b: ['perro', '🐕'], diferencia: 'una erre o dos' },
    { a: ['caro', '💰'], b: ['carro', '🚗'], diferencia: 'una erre o dos' },
    { a: ['casa', '🏠'], b: ['caza', '🏹'], diferencia: 'cómo se escribe, no cómo suena' },
    { a: ['mano', '🖐️'], b: ['mono', '🐒'], diferencia: 'la vocal de en medio' },
    { a: ['lago', '🏞️'], b: ['algo', '❓'], diferencia: 'el orden: la a va antes o después' },
    { a: ['sal', '🧂'], b: ['las', '👉'], diferencia: 'el orden de las letras' },
    { a: ['sol', '☀️'], b: ['los', '👉'], diferencia: 'el orden de las letras' },
    { a: ['bota', '👢'], b: ['boca', '👄'], diferencia: 'una consonante' },
    { a: ['rata', '🐀'], b: ['rana', '🐸'], diferencia: 'una consonante' },
    { a: ['cama', '🛏️'], b: ['cana', '👵'], diferencia: 'una consonante' },
    { a: ['dedo', '☝️'], b: ['dado', '🎲'], diferencia: 'la vocal de en medio' },
    { a: ['lobo', '🐺'], b: ['lomo', '🥓'], diferencia: 'una consonante' },
    { a: ['plato', '🍽️'], b: ['plano', '🗺️'], diferencia: 'una consonante' },
    { a: ['mesa', '🍽️'], b: ['misa', '⛪'], diferencia: 'la primera vocal' },
    { a: ['vaso', '🥛'], b: ['paso', '👣'], diferencia: 'la primera consonante' },
    { a: ['coro', '🎶'], b: ['corro', '🏃'], diferencia: 'una erre o dos' },
    { a: ['para', '🛑'], b: ['parra', '🍇'], diferencia: 'una erre o dos' },
    { a: ['rosa', '🌹'], b: ['ropa', '👕'], diferencia: 'una consonante' }
  ];

  /* ------------------------------------------------------- dictado ------ */
  /* Escribir obliga a poner las letras en orden: no hay atajo visual. */
  var dictado = [
    { nivel: 1, lista: ['casa', 'mesa', 'pato', 'luna', 'dedo', 'sopa', 'gato', 'nube',
                        'vaca', 'foca'] },
    { nivel: 2, lista: ['jirafa', 'camisa', 'pelota', 'tomate', 'moneda', 'muñeca',
                        'chocolate', 'guitarra', 'zapato', 'llave'] },
    { nivel: 3, lista: ['bicicleta', 'cocodrilo', 'pingüino', 'elefante', 'teléfono',
                        'mariposa', 'estrella', 'plátano', 'ventana', 'mochila'] }
  ];

  /* -------------------------------------------------------- cuentos ----- */
  /*
   * Historias cortas con moraleja. Cada una trae una pregunta con tres
   * respuestas escritas: hay que leerlas también, así que la pregunta es
   * parte del ejercicio y no un añadido.
   *
   * Los niveles crecen en longitud y en dificultad de frase, no en vocabulario
   * raro: quien lee esto ya habla español, lo que entrena es descifrar.
   */
  var cuentos = [
    {
      id: 'hormiga', nivel: 1, tituloZh: '螞蟻和麵包屑', titulo: 'La hormiga y la miga', emoji: '🐜',
      lineas: [
        'Una hormiga pequeña encuentra una miga de pan.',
        'La miga es más grande que ella.',
        'La empuja y la empuja, pero no puede sola.',
        'Entonces llama a sus amigas.',
        'Entre todas la llevan al hormiguero.'
      ],
      moraleja: 'Lo que no puedes solo, lo puedes con ayuda.',
      moralejaZh: '一個人做不到的事，大家一起就做得到。',
      pregunta: {
        texto: '¿Cómo llevan la miga al hormiguero?',
        opciones: ['Entre todas las hormigas', 'La hormiga sola', 'La empuja el viento'],
        correcta: 0
      }
    },
    {
      id: 'sol-viento', nivel: 1, tituloZh: '太陽和風', titulo: 'El sol y el viento', emoji: '☀️',
      lineas: [
        'El viento dice que es más fuerte que el sol.',
        'Los dos miran a un hombre con abrigo.',
        'El viento sopla muy fuerte, pero el hombre se tapa más.',
        'Luego el sol calienta poco a poco.',
        'El hombre tiene calor y se quita el abrigo solo.'
      ],
      moraleja: 'Con calma se consigue lo que a la fuerza no.',
      moralejaZh: '用平靜可以做到用力氣做不到的事。',
      pregunta: {
        texto: '¿Quién consigue que el hombre se quite el abrigo?',
        opciones: ['El sol', 'El viento', 'Nadie'],
        correcta: 0
      }
    },
    {
      id: 'pajaro', nivel: 1, tituloZh: '小鳥和籠子', titulo: 'El pájaro y la jaula', emoji: '🐦',
      lineas: [
        'Un pájaro vive en una jaula de oro.',
        'Tiene comida todos los días y nadie le molesta.',
        'Un día ve por la ventana a otro pájaro volando.',
        'El de la jaula canta bonito, pero no puede volar.',
        'El de fuera pasa frío, pero va donde quiere.'
      ],
      moraleja: 'No todo lo que brilla vale más que ser libre.',
      moralejaZh: '會發光的東西不一定比自由更有價值。',
      pregunta: {
        texto: '¿Qué tiene el pájaro de fuera que no tiene el de la jaula?',
        opciones: ['Puede ir donde quiere', 'Come todos los días', 'Una jaula de oro'],
        correcta: 0
      }
    },
    {
      id: 'zorro-uvas', nivel: 2, tituloZh: '狐狸和葡萄', titulo: 'El zorro y las uvas', emoji: '🦊',
      lineas: [
        'Un zorro pasea por el campo y ve unas uvas en lo alto de una parra.',
        'Salta una vez y no llega. Salta otra vez y tampoco.',
        'Lo intenta muchas veces, hasta que se cansa.',
        'Entonces se va diciendo: esas uvas seguro que están verdes.',
        'Pero las uvas estaban maduras. El zorro sólo saltaba poco.'
      ],
      moraleja: 'A veces decimos que algo no nos gusta porque no lo conseguimos.',
      moralejaZh: '有時候我們說不喜歡，只是因為得不到。',
      pregunta: {
        texto: '¿Por qué el zorro dice que las uvas están verdes?',
        opciones: ['Porque no consigue cogerlas', 'Porque las ha probado', 'Porque son verdes'],
        correcta: 0
      }
    },
    {
      id: 'leon-raton', nivel: 2, tituloZh: '獅子和老鼠', titulo: 'El león y el ratón', emoji: '🦁',
      lineas: [
        'Un ratón despierta sin querer a un león dormido.',
        'El león lo coge con la pata y va a comérselo.',
        'El ratón le pide perdón y le promete ayudarle algún día.',
        'El león se ríe: ¿cómo va a ayudarme un ratón tan pequeño?',
        'Pero lo suelta.',
        'Semanas después, el león cae en una red de cuerdas.',
        'El ratón llega, muerde las cuerdas y lo deja libre.'
      ],
      moraleja: 'Nadie es tan pequeño como para no poder ayudar.',
      moralejaZh: '沒有人小到不能幫忙。',
      pregunta: {
        texto: '¿Cómo salva el ratón al león?',
        opciones: ['Muerde las cuerdas de la red', 'Llama a otros leones', 'Le da de comer'],
        correcta: 0
      }
    },
    {
      id: 'lechera', nivel: 2, tituloZh: '女孩和牛奶', titulo: 'La niña y la leche', emoji: '🥛',
      lineas: [
        'Una niña lleva un cubo de leche sobre la cabeza.',
        'Mientras anda, va pensando en todo lo que hará.',
        'Con la leche compraré huevos, y de los huevos saldrán pollitos.',
        'Con los pollitos compraré un vestido y todos me mirarán.',
        'De tanto pensarlo da un salto de alegría.',
        'El cubo cae al suelo y la leche se derrama entera.'
      ],
      moraleja: 'Primero se hacen las cosas y después se sueña con ellas.',
      moralejaZh: '先把事情做好，再去夢想它。',
      pregunta: {
        texto: '¿Por qué se cae el cubo?',
        opciones: ['Porque la niña da un salto', 'Porque tropieza con una piedra', 'Porque pesa mucho'],
        correcta: 0
      }
    },
    {
      id: 'roble-junco', nivel: 3, tituloZh: '橡樹和蘆葦', titulo: 'El roble y el junco', emoji: '🌳',
      lineas: [
        'Junto al río crecen un roble enorme y un junco delgado.',
        'El roble se burla del junco: yo soy fuerte y tú te doblas con cualquier cosa.',
        'El junco no contesta nada.',
        'Una noche llega una tormenta terrible.',
        'El viento empuja con toda su fuerza.',
        'El roble aguanta firme, muy firme, hasta que se parte por la mitad.',
        'El junco se dobla hasta tocar el agua, y cuando pasa la tormenta se levanta otra vez.'
      ],
      moraleja: 'Saber doblarse a veces es más fuerte que no ceder nunca.',
      moralejaZh: '懂得彎腰，有時候比永不讓步更堅強。',
      pregunta: {
        texto: '¿Qué le pasa al roble en la tormenta?',
        opciones: ['Se parte por la mitad', 'Se dobla y se levanta', 'No le pasa nada'],
        correcta: 0
      }
    },
    {
      id: 'dos-amigos', nivel: 3, tituloZh: '兩個朋友和井', titulo: 'Los dos amigos y el pozo', emoji: '👬',
      lineas: [
        'Dos amigos caminan por un camino muy largo y llegan a un pozo seco.',
        'Uno se asoma demasiado y cae dentro.',
        'Desde arriba, mucha gente le grita que suba, que es fácil, que lo intente más.',
        'Él lo intenta una y otra vez, pero el pozo es hondo y resbala.',
        'Entonces su amigo baja con él.',
        'Los de arriba le dicen que está loco, que ahora están los dos atrapados.',
        'Pero el amigo responde: yo ya estuve aquí antes y sé por dónde se sale.'
      ],
      moraleja: 'Ayudar de verdad no es gritar desde arriba.',
      moralejaZh: '真正的幫忙，不是在上面大喊。',
      pregunta: {
        texto: '¿Por qué su amigo baja al pozo?',
        opciones: ['Porque conoce la salida', 'Porque también se cae', 'Porque quiere el agua'],
        correcta: 0
      }
    }
  ];

  global.Avanzado = {
    ingles: ingles,
    inventadas: inventadas,
    pares: pares,
    dictado: dictado,
    cuentos: cuentos,
    cuentosDeNivel: function (n) {
      return cuentos.filter(function (c) { return c.nivel === n; });
    }
  };
})(window);
