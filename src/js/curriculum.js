/*!
 * curriculo.js — El plan de lectura, de las vocales a los textos.
 *
 * Sigue el método silábico con el que aprenden a leer los niños en España:
 * primero las vocales, luego una consonante nueva cada vez, y sólo después
 * los dígrafos, los grupos trabados, las sílabas inversas y los diptongos.
 *
 * REGLA DE ORO: cada palabra y cada frase usa únicamente letras ya vistas en
 * unidades anteriores. Por eso las primeras unidades tienen un vocabulario
 * tan corto: no hay atajos, y esa restricción es justo lo que permite leer
 * de verdad en lugar de adivinar.
 *
 * Campos de cada unidad:
 *   id       identificador estable (se guarda en el progreso)
 *   tipo     vocales | letra | grupo | inversas | diptongos | tildes | lectura
 *   letra    lo que se muestra en grande
 *   nombre   cómo se LLAMA la letra ("eme") — el sintetizador diría "eme"
 *            igualmente para "m", pero lo escribimos para que nunca falle
 *   fonema   pista escrita del SONIDO ("mmm"), que es lo que aquí importa
 *   truco    explicación hablada de cómo se coloca la boca
 *   silabas  las sílabas que se practican
 *   palabras [palabra, emoji]
 *   frases   lectura con sentido
 */
(function (global) {
  'use strict';

  var unidades = [
    {
      id: 'vocales', tipo: 'vocales', color: 0, emoji: '🎵',
      titulo: 'Las cinco vocales', tituloZh: '五個元音',
      letra: 'a e i o u', nombre: 'las vocales',
      fonema: 'a · e · i · o · u',
      truco: 'Las vocales son las cinco letras que puedes cantar sin cerrar la boca. Están en todas las palabras.',
      trucoZh: '五個元音字母。它們可以一直唱下去，嘴巴不用合上。每個單字裡都有元音。',
      vocales: [
        { letra: 'a', mayus: 'A', boca: 'Abre mucho la boca', palabra: 'avión', emoji: '✈️' },
        { letra: 'e', mayus: 'E', boca: 'Sonríe un poco', palabra: 'elefante', emoji: '🐘' },
        { letra: 'i', mayus: 'I', boca: 'Sonríe mucho', palabra: 'iglú', emoji: '🛖' },
        { letra: 'o', mayus: 'O', boca: 'Pon la boca redonda', palabra: 'oso', emoji: '🐻' },
        { letra: 'u', mayus: 'U', boca: 'Saca los labios como un beso', palabra: 'uvas', emoji: '🍇' }
      ],
      silabas: ['a', 'e', 'i', 'o', 'u'],
      palabras: [],
      frases: []
    },

    {
      id: 'm', tipo: 'letra', color: 1, emoji: '👩',
      titulo: 'La m', tituloZh: '字母 m', letra: 'm', mayus: 'M', nombre: 'eme', fonema: 'mmm',
      truco: 'Junta los labios y haz mmm, como cuando algo está muy rico. La eme con la a suena ma.',
      trucoZh: '雙唇閉合發出 mmm 的聲音，像吃到好吃的東西。m 加 a 讀作 ma。',
      silabas: ['ma', 'me', 'mi', 'mo', 'mu'],
      palabras: [['mamá', '👩'], ['mimo', '🤗'], ['momia', '🧟'], ['mío', '🙋'], ['mía', '🎀']],
      frases: ['Mi mamá me mima.']
    },

    {
      id: 'p', tipo: 'letra', color: 2, emoji: '👨',
      titulo: 'La p', tituloZh: '字母 p', letra: 'p', mayus: 'P', nombre: 'pe', fonema: 'p',
      truco: 'Junta los labios y suéltalos de golpe, como una pequeña explosión: p. La pe con la a suena pa.',
      trucoZh: '雙唇緊閉然後突然打開，像小爆炸：p。p 加 a 讀作 pa。',
      silabas: ['pa', 'pe', 'pi', 'po', 'pu'],
      palabras: [['papá', '👨'], ['mapa', '🗺️'], ['puma', '🐆'], ['pie', '🦶'], ['pupa', '🤕']],
      frases: ['Papá me mima.', 'Mi mamá me ama.']
    },

    {
      id: 'l', tipo: 'letra', color: 3, emoji: '🌊',
      titulo: 'La l', tituloZh: '字母 l', letra: 'l', mayus: 'L', nombre: 'ele', fonema: 'lll',
      truco: 'Pon la punta de la lengua detrás de los dientes de arriba y haz lll. La ele con la a suena la.',
      trucoZh: '舌尖抵住上齒背，發出 lll。l 加 a 讀作 la。',
      silabas: ['la', 'le', 'li', 'lo', 'lu'],
      palabras: [['lupa', '🔍'], ['pelo', '💇'], ['lima', '🍋'], ['ola', '🌊'], ['ala', '🪽'], ['palo', '🪵']],
      frases: ['Mamá pela la lima.', 'El palo. La pala. La ola.']
    },

    {
      id: 's', tipo: 'letra', color: 4, emoji: '🐻',
      titulo: 'La s', tituloZh: '字母 s', letra: 's', mayus: 'S', nombre: 'ese', fonema: 'sss',
      truco: 'Haz sss como una serpiente, con los dientes casi juntos. La ese con la a suena sa.',
      trucoZh: '像蛇一樣發出 sss 的聲音，牙齒幾乎合攏。s 加 a 讀作 sa。',
      silabas: ['sa', 'se', 'si', 'so', 'su'],
      palabras: [['oso', '🐻'], ['mesa', '🍽️'], ['sopa', '🍲'], ['sapo', '🐸'], ['peso', '⚖️'], ['misa', '⛪']],
      frases: ['El oso es mío.', 'Mamá pasa la sopa.', 'El sapo es lila.']
    },

    {
      id: 't', tipo: 'letra', color: 5, emoji: '🦆',
      titulo: 'La t', tituloZh: '字母 t', letra: 't', mayus: 'T', nombre: 'te', fonema: 't',
      truco: 'Pon la lengua en los dientes de arriba y suéltala: t. La te con la a suena ta.',
      trucoZh: '舌頭抵住上齒然後放開：t。t 加 a 讀作 ta。',
      silabas: ['ta', 'te', 'ti', 'to', 'tu'],
      palabras: [['pato', '🦆'], ['tomate', '🍅'], ['moto', '🏍️'], ['pelota', '⚽'], ['tela', '🧵'], ['tía', '👩‍🦰']],
      frases: ['Mi tía toma sopa.', 'La pelota es mía.', 'El pato se posa.']
    },

    {
      id: 'n', tipo: 'letra', color: 6, emoji: '🌙',
      titulo: 'La n', tituloZh: '字母 n', letra: 'n', mayus: 'N', nombre: 'ene', fonema: 'nnn',
      truco: 'Pon la lengua arriba y saca el aire por la nariz: nnn. La ene con la a suena na.',
      trucoZh: '舌頭抵住上顎，氣流從鼻子出來：nnn。n 加 a 讀作 na。',
      silabas: ['na', 'ne', 'ni', 'no', 'nu'],
      palabras: [['luna', '🌙'], ['mano', '🖐️'], ['nene', '👶'], ['pino', '🌲'], ['mono', '🐒'], ['nota', '🎵']],
      frases: ['El mono está en el pino.', 'La luna sale.', 'El nene mima al mono.']
    },

    {
      id: 'd', tipo: 'letra', color: 7, emoji: '🎲',
      titulo: 'La d', tituloZh: '字母 d', letra: 'd', mayus: 'D', nombre: 'de', fonema: 'd',
      truco: 'Toca los dientes de arriba con la lengua y haz d, con voz. La de con la a suena da.',
      trucoZh: '舌尖輕触上齒，帶聲發出 d。d 加 a 讀作 da。',
      silabas: ['da', 'de', 'di', 'do', 'du'],
      palabras: [['dedo', '☝️'], ['dado', '🎲'], ['nido', '🪺'], ['moneda', '🪙'], ['dedal', '🪡']],
      frases: ['El nido está en el pino.', 'El dado es de mamá.', 'Mi dedo toma la moneda.']
    },

    {
      id: 'c-fuerte', tipo: 'letra', color: 0, emoji: '🏠',
      titulo: 'La c con a, o, u', tituloZh: 'c 配 a、o、u', letra: 'c', mayus: 'C', nombre: 'ce', fonema: 'k',
      truco: 'Con la a, la o y la u, la c suena fuerte, como una k: ca, co, cu. Cuidado, con la e y la i suena distinto y eso lo verás más adelante.',
      trucoZh: 'c 在 a、o、u 前面發 k 的音：ca、co、cu。在 e、i 前面發音不同，以後再學。',
      silabas: ['ca', 'co', 'cu'],
      palabras: [['casa', '🏠'], ['cama', '🛏️'], ['coco', '🥥'], ['cuna', '🧸'], ['camisa', '👕'], ['cono', '🍦']],
      frases: ['Mi cama está en la casa.', 'La camisa es de mi tía.', 'Como un coco.']
    },

    {
      id: 'b', tipo: 'letra', color: 1, emoji: '👶',
      titulo: 'La b', tituloZh: '字母 b', letra: 'b', mayus: 'B', nombre: 'be', fonema: 'b',
      truco: 'Es como la pe, pero con voz: junta los labios y suéltalos haciendo b. La be con la a suena ba.',
      trucoZh: '和 p 一樣雙唇爆破，但要帶聲：b。b 加 a 讀作 ba。',
      silabas: ['ba', 'be', 'bi', 'bo', 'bu'],
      palabras: [['bebé', '👶'], ['boca', '👄'], ['bota', '👢'], ['lobo', '🐺'], ['nube', '☁️'], ['cubo', '🧊']],
      frases: ['El bebé bebe.', 'La bota es de mi mamá.', 'El lobo se sube a la nube.']
    },

    {
      id: 'v', tipo: 'letra', color: 2, emoji: '🐄',
      titulo: 'La v', tituloZh: '字母 v', letra: 'v', mayus: 'V', nombre: 'uve', fonema: 'b',
      truco: 'Un secreto: en español la uve suena igual que la be. Se escriben distinto, pero suenan igual.',
      trucoZh: '小祕密：西班牙語裡 v 和 b 發音完全一樣，只是寫法不同。',
      silabas: ['va', 've', 'vi', 'vo', 'vu'],
      palabras: [['vaca', '🐄'], ['uva', '🍇'], ['vela', '🕯️'], ['vaso', '🥛'], ['nave', '🚀'], ['nieve', '❄️']],
      frases: ['La vaca come.', 'El vaso está en la mesa.', 'Mi nave vuela.']
    },

    {
      id: 'f', tipo: 'letra', color: 3, emoji: '🦭',
      titulo: 'La f', tituloZh: '字母 f', letra: 'f', mayus: 'F', nombre: 'efe', fonema: 'fff',
      truco: 'Muerde un poco el labio de abajo con los dientes de arriba y sopla: fff. La efe con la a suena fa.',
      trucoZh: '上齒輕咬下唇然後吹氣：fff。f 加 a 讀作 fa。',
      silabas: ['fa', 'fe', 'fi', 'fo', 'fu'],
      palabras: [['foca', '🦭'], ['café', '☕'], ['sofá', '🛋️'], ['foto', '📷'], ['fino', '🪶'], ['feo', '😝']],
      frases: ['La foca está en el sofá.', 'Mamá toma un café.', 'Mi foto es bonita.']
    },

    {
      id: 'r-suave', tipo: 'letra', color: 4, emoji: '🦜',
      titulo: 'La r suave', tituloZh: '輕音的 r', letra: 'r', mayus: 'R', nombre: 'ere', fonema: 'r (suave)',
      truco: 'Entre dos vocales, la erre suena suave: un solo golpecito de la lengua arriba. Ca-ra. Pe-ra.',
      trucoZh: '在兩個元音之間，r 是輕音：舌頭只彈一下。ca-ra，pe-ra。',
      silabas: ['ara', 'ere', 'iri', 'oro', 'uru'],
      palabras: [['cara', '😀'], ['pera', '🍐'], ['oro', '🥇'], ['loro', '🦜'], ['toro', '🐂'], ['aro', '⭕']],
      frases: ['El loro come pera.', 'Mi cara es bonita.', 'El toro es de oro.']
    },

    {
      id: 'rr', tipo: 'letra', color: 5, emoji: '🐕',
      titulo: 'La r fuerte y la rr', tituloZh: '強音的 r 和 rr', letra: 'rr', mayus: 'RR', nombre: 'erre', fonema: 'rrr',
      truco: 'Al principio de la palabra, y con dos erres, suena fuerte: haz vibrar la lengua, rrr, como un motor.',
      trucoZh: '在詞首或寫成 rr 時是強音：舌頭快速振動 rrr，像馬達。',
      silabas: ['ra', 're', 'ri', 'ro', 'ru', 'rra', 'rre', 'rri', 'rro', 'rru'],
      palabras: [['rana', '🐸'], ['rosa', '🌹'], ['ratón', '🐭'], ['perro', '🐕'], ['carro', '🚗'], ['torre', '🗼']],
      frases: ['El perro corre.', 'La rana está en el río.', 'El ratón corre por la torre.']
    },

    {
      id: 'j', tipo: 'letra', color: 6, emoji: '🦒',
      titulo: 'La j', tituloZh: '字母 j', letra: 'j', mayus: 'J', nombre: 'jota', fonema: 'jjj',
      truco: 'Sale del fondo de la garganta, como si echaras vaho a un cristal pero más fuerte: jjj.',
      trucoZh: '從喉嚨深處發出，像哈氣但更用力：jjj。',
      silabas: ['ja', 'je', 'ji', 'jo', 'ju'],
      palabras: [['ojo', '👁️'], ['caja', '📦'], ['jamón', '🍖'], ['jirafa', '🦒'], ['ajo', '🧄'], ['oveja', '🐑']],
      frases: ['La caja roja es de papá.', 'La jirafa come.', 'Mi ojo mira la oveja.']
    },

    {
      id: 'g-fuerte', tipo: 'letra', color: 7, emoji: '🐈',
      titulo: 'La g con a, o, u', tituloZh: 'g 配 a、o、u', letra: 'g', mayus: 'G', nombre: 'ge', fonema: 'g',
      truco: 'Con la a, la o y la u, la ge suena fuerte, desde la garganta: ga, go, gu.',
      trucoZh: 'g 在 a、o、u 前面是硬音，從喉嚨發出：ga、go、gu。',
      silabas: ['ga', 'go', 'gu'],
      palabras: [['gato', '🐈'], ['gota', '💧'], ['gusano', '🐛'], ['amigo', '🧑‍🤝‍🧑'], ['gorila', '🦍'], ['mango', '🥭']],
      frases: ['El gato bebe agua.', 'Mi amigo es un gorila.', 'Una gota de agua.']
    },

    {
      id: 'gue-gui', tipo: 'grupo', color: 0, emoji: '🎸',
      titulo: 'gue, gui', tituloZh: 'gue、gui', letra: 'gue gui', nombre: 'gue, gui', fonema: 'gue · gui',
      truco: 'Para que la ge suene fuerte con la e y la i, ponemos una u en medio que no se pronuncia. Se escribe gue, pero se lee gue. La u está callada.',
      trucoZh: '為了讓 g 在 e、i 前保持硬音，中間加一個不發音的 u。寫作 gue、gui，u 是不出聲的。',
      silabas: ['gue', 'gui'],
      palabras: [['guitarra', '🎸'], ['juguete', '🧸'], ['águila', '🦅'], ['guisante', '🫛'], ['guiso', '🍲']],
      frases: ['Mi amigo toca la guitarra.', 'El juguete es de mi amigo.', 'El águila vuela.']
    },

    {
      id: 'ge-gi', tipo: 'grupo', color: 1, emoji: '🌻',
      titulo: 'ge, gi', tituloZh: 'ge、gi', letra: 'ge gi', nombre: 'ge, gi', fonema: 'ge · gi (como la jota)',
      truco: 'Cuidado: la ge con la e y con la i suena como la jota. Gente. Gigante.',
      trucoZh: '注意：g 在 e、i 前面讀音和 j 一樣。gente、gigante。',
      silabas: ['ge', 'gi'],
      palabras: [['gente', '👥'], ['gigante', '🗿'], ['girasol', '🌻'], ['colegio', '🏫'], ['magia', '✨'], ['gemelo', '👯']],
      frases: ['La gente va al colegio.', 'El gigante es alto.', 'Un girasol amarillo.']
    },

    {
      id: 'h', tipo: 'letra', color: 2, emoji: '🤫',
      titulo: 'La h muda', tituloZh: '不發音的 h', letra: 'h', mayus: 'H', nombre: 'hache', fonema: '(silencio)',
      truco: 'La hache es la letra callada. Se escribe, pero no suena nada. Hola se lee ola.',
      trucoZh: 'h 是不發音的字母。寫出來但完全不出聲。hola 讀作 ola。',
      silabas: ['ha', 'he', 'hi', 'ho', 'hu'],
      palabras: [['hoja', '🍂'], ['hilo', '🧵'], ['humo', '💨'], ['hormiga', '🐜'], ['hola', '👋'], ['helado', '🍦'], ['hueso', '🦴']],
      frases: ['La hormiga come una hoja.', 'El helado está en la mesa.', 'Hola, ¿cómo estás?']
    },

    {
      id: 'ñ', tipo: 'letra', color: 3, emoji: '🍍',
      titulo: 'La ñ', tituloZh: '字母 ñ', letra: 'ñ', mayus: 'Ñ', nombre: 'eñe', fonema: 'ñ',
      truco: 'Esta letra sólo existe en español. Aplasta la lengua contra el paladar: ña, ñe, ñi, ño, ñu.',
      trucoZh: '這個字母只有西班牙語才有。舌面壓住上顎：ña、ñe、ñi、ño、ñu。',
      silabas: ['ña', 'ñe', 'ñi', 'ño', 'ñu'],
      palabras: [['niño', '👦'], ['uña', '💅'], ['piña', '🍍'], ['araña', '🕷️'], ['muñeca', '🪆'], ['baño', '🛁']],
      frases: ['El niño come piña.', 'La araña está en la montaña.', 'Mi muñeca es bonita.']
    },

    {
      id: 'll', tipo: 'letra', color: 4, emoji: '🔑',
      titulo: 'La ll', tituloZh: '字母 ll', letra: 'll', mayus: 'LL', nombre: 'elle', fonema: 'y',
      truco: 'Dos eles juntas no suenan como una ele: suenan como la ye. Lla-ve. Si-lla.',
      trucoZh: '兩個 l 在一起不讀 l 的音，讀作 y 的音。lla-ve，si-lla。',
      silabas: ['lla', 'lle', 'lli', 'llo', 'llu'],
      palabras: [['llave', '🔑'], ['silla', '🪑'], ['pollo', '🐔'], ['calle', '🏙️'], ['lluvia', '🌧️'], ['caballo', '🐴']],
      frases: ['El caballo está en la calle.', 'La llave es de mi casa.', 'La lluvia moja la silla.']
    },

    {
      id: 'ch', tipo: 'letra', color: 5, emoji: '🍫',
      titulo: 'La ch', tituloZh: '字母 ch', letra: 'ch', mayus: 'CH', nombre: 'che', fonema: 'ch',
      truco: 'La ce y la hache juntas hacen un sonido nuevo: ch, como cuando pides silencio. Cho-co-la-te.',
      trucoZh: 'c 和 h 在一起產生新的音：ch，像讓人安靜的聲音。cho-co-la-te。',
      silabas: ['cha', 'che', 'chi', 'cho', 'chu'],
      palabras: [['chocolate', '🍫'], ['coche', '🚗'], ['leche', '🥛'], ['chino', '🇨🇳'], ['mochila', '🎒'], ['noche', '🌃']],
      frases: ['Mi mochila tiene chocolate.', 'El coche de papá es rojo.', 'De noche bebo leche.']
    },

    {
      id: 'y', tipo: 'letra', color: 6, emoji: '👑',
      titulo: 'La y', tituloZh: '字母 y', letra: 'y', mayus: 'Y', nombre: 'ye', fonema: 'y / i',
      truco: 'Delante de una vocal suena como la elle: ya, ye, yo. Y ella sola, o al final, suena como la i: rey, hoy, y.',
      trucoZh: 'y 在元音前讀作 ll 的音：ya、ye、yo。單獨或在詞尾時讀作 i：rey、hoy、y。',
      silabas: ['ya', 'ye', 'yi', 'yo', 'yu'],
      palabras: [['yo', '🙋'], ['yema', '🥚'], ['playa', '🏖️'], ['rey', '👑'], ['ayuda', '🆘'], ['hoy', '📅']],
      frases: ['Yo voy a la playa.', 'Yo hablo chino y español.', 'Hoy el rey come yema.']
    },

    {
      id: 'qu', tipo: 'grupo', color: 7, emoji: '🧀',
      titulo: 'que, qui', tituloZh: 'que、qui', letra: 'que qui', nombre: 'que, qui', fonema: 'ke · ki',
      truco: 'La cu siempre va con una u callada, y sólo con la e y la i. Se escribe que, pero se lee ke. Que-so.',
      trucoZh: 'q 後面總跟著不發音的 u，而且只跟 e、i。寫作 que，讀作 ke。que-so。',
      silabas: ['que', 'qui'],
      palabras: [['queso', '🧀'], ['paquete', '📦'], ['máquina', '🏭'], ['mosquito', '🦟'], ['esquina', '📐'], ['pequeño', '🐜']],
      frases: ['Aquí está el queso.', 'El mosquito es pequeño.', '¿Qué quieres?']
    },

    {
      id: 'z-ce-ci', tipo: 'grupo', color: 0, emoji: '🦊',
      titulo: 'za, ce, ci, zo, zu', tituloZh: 'za、ce、ci、zo、zu', letra: 'z · ce · ci', nombre: 'zeta, ce, ci', fonema: 'z',
      truco: 'La zeta y la c con e o i suenan igual. En España se pone la lengua entre los dientes. En América suena como una ese. Las dos formas están bien.',
      trucoZh: 'z 和 ce、ci 發音相同。在西班牙舌尖伸到齒間，在拉美讀作 s。兩種都正確。',
      silabas: ['za', 'ce', 'ci', 'zo', 'zu'],
      palabras: [['zapato', '👟'], ['taza', '☕'], ['zorro', '🦊'], ['azul', '🟦'], ['cielo', '☁️'], ['cine', '🎬'], ['cocina', '🍳'], ['lápiz', '✏️']],
      frases: ['Mi zapato es azul.', 'La cena está en la cocina.', 'El zorro mira el cielo.']
    },

    {
      id: 'gue-dieresis', tipo: 'grupo', color: 1, emoji: '🐧',
      titulo: 'güe, güi', tituloZh: 'güe、güi', letra: 'güe güi', nombre: 'güe, güi', fonema: 'gue · gui (con u sonora)',
      truco: 'Los dos puntitos encima de la u se llaman diéresis y significan: ¡esta u sí se pronuncia! Pin-güi-no.',
      trucoZh: 'u 上面的兩個點叫分音符，意思是這個 u 要發音！pin-güi-no。',
      silabas: ['güe', 'güi'],
      palabras: [['pingüino', '🐧'], ['cigüeña', '🐦'], ['paragüero', '☂️'], ['agüita', '💧']],
      frases: ['El pingüino vive en el hielo.', 'La cigüeña tiene un nido.']
    },

    {
      id: 'k-w-x', tipo: 'grupo', color: 2, emoji: '🥝',
      titulo: 'k, w, x', tituloZh: 'k、w、x', letra: 'k w x', nombre: 'ka, uve doble, equis', fonema: 'k · w · ks',
      truco: 'Estas tres letras se usan poco, casi siempre en palabras que vienen de otros idiomas. La ka suena como la c fuerte, la uve doble como la u, y la equis suena ks: ta-ksi.',
      trucoZh: '這三個字母很少用，多出現在外來詞裡。k 讀作硬音 c，w 讀作 u，x 讀作 ks：ta-ksi。',
      silabas: ['ka', 'ke', 'ki', 'wa', 'we', 'xa', 'xi'],
      palabras: [['kiwi', '🥝'], ['koala', '🐨'], ['kilo', '⚖️'], ['taxi', '🚕'], ['examen', '📝'], ['saxofón', '🎷'], ['wifi', '📶']],
      frases: ['El koala come kiwi.', 'El taxi es amarillo.', 'Toco el saxofón.']
    },

    {
      id: 'bl-br', tipo: 'grupo', color: 3, emoji: '📕',
      titulo: 'bl, br', tituloZh: 'bl、br', letra: 'bl · br', nombre: 'be con ele, be con erre', fonema: 'bl · br',
      truco: 'Ahora dos consonantes juntas en la misma sílaba. No hay vocal entre ellas: se dicen de un tirón. Bla, ble, bli, blo, blu. Bra, bre, bri, bro, bru.',
      trucoZh: '現在是兩個輔音在同一個音節裡，中間沒有元音，要一口氣讀出來：bla…、bra…。',
      silabas: ['bla', 'ble', 'bli', 'blo', 'blu', 'bra', 'bre', 'bri', 'bro', 'bru'],
      palabras: [['blanco', '⬜'], ['blusa', '👚'], ['pueblo', '🏘️'], ['brazo', '💪'], ['libro', '📕'], ['cabra', '🐐'], ['sombrero', '🤠'], ['cebra', '🦓']],
      frases: ['El libro es blanco.', 'La cebra corre por el pueblo.', 'Me duele el brazo.']
    },

    {
      id: 'cl-cr', tipo: 'grupo', color: 4, emoji: '🚲',
      titulo: 'cl, cr', tituloZh: 'cl、cr', letra: 'cl · cr', nombre: 'ce con ele, ce con erre', fonema: 'cl · cr',
      truco: 'Cla, cle, cli, clo, clu. Cra, cre, cri, cro, cru. Todo seguido, sin parar en medio.',
      trucoZh: 'cla…、cra… 一口氣讀完，中間不要停。',
      silabas: ['cla', 'cle', 'cli', 'clo', 'clu', 'cra', 'cre', 'cri', 'cro', 'cru'],
      palabras: [['clase', '🏫'], ['bicicleta', '🚲'], ['chicle', '🍬'], ['crema', '🧴'], ['cruz', '✝️'], ['cocodrilo', '🐊'], ['micrófono', '🎤']],
      frases: ['Mi bicicleta es blanca.', 'El cocodrilo vive en el río.', 'En clase hay un micrófono.']
    },

    {
      id: 'fl-fr', tipo: 'grupo', color: 5, emoji: '🍓',
      titulo: 'fl, fr', tituloZh: 'fl、fr', letra: 'fl · fr', nombre: 'efe con ele, efe con erre', fonema: 'fl · fr',
      truco: 'Fla, fle, fli, flo, flu. Fra, fre, fri, fro, fru. Sopla la efe y sigue sin cortar.',
      trucoZh: 'fla…、fra… 吹出 f 的音後不要停頓，直接連下去。',
      silabas: ['fla', 'fle', 'fli', 'flo', 'flu', 'fra', 'fre', 'fri', 'fro', 'fru'],
      palabras: [['flor', '🌸'], ['flauta', '🪈'], ['flan', '🍮'], ['flecha', '🏹'], ['fresa', '🍓'], ['frío', '🥶'], ['fruta', '🍎']],
      frases: ['La fresa es una fruta.', 'Hace frío en el campo.', 'Toco la flauta y como flan.']
    },

    {
      id: 'gl-gr', tipo: 'grupo', color: 6, emoji: '🐯',
      titulo: 'gl, gr', tituloZh: 'gl、gr', letra: 'gl · gr', nombre: 'ge con ele, ge con erre', fonema: 'gl · gr',
      truco: 'Gla, gle, gli, glo, glu. Gra, gre, gri, gro, gru. La ge siempre suena fuerte en estos grupos.',
      trucoZh: 'gla…、gra…。在這些組合裡 g 永遠是硬音。',
      silabas: ['gla', 'gle', 'gli', 'glo', 'glu', 'gra', 'gre', 'gri', 'gro', 'gru'],
      palabras: [['globo', '🎈'], ['iglesia', '⛪'], ['iglú', '🛖'], ['regla', '📏'], ['tigre', '🐯'], ['negro', '⬛'], ['gracias', '🙏'], ['cangrejo', '🦀']],
      frases: ['El tigre es muy grande.', 'Gracias por el globo.', 'El cangrejo es negro.']
    },

    {
      id: 'pl-pr', tipo: 'grupo', color: 7, emoji: '🍌',
      titulo: 'pl, pr', tituloZh: 'pl、pr', letra: 'pl · pr', nombre: 'pe con ele, pe con erre', fonema: 'pl · pr',
      truco: 'Pla, ple, pli, plo, plu. Pra, pre, pri, pro, pru. Sin vocal en medio, todo junto.',
      trucoZh: 'pla…、pra…。中間沒有元音，要連著讀。',
      silabas: ['pla', 'ple', 'pli', 'plo', 'plu', 'pra', 'pre', 'pri', 'pro', 'pru'],
      palabras: [['plato', '🍽️'], ['playa', '🏖️'], ['pluma', '🪶'], ['planta', '🌱'], ['plátano', '🍌'], ['primo', '👦'], ['premio', '🏆'], ['profesor', '👨‍🏫']],
      frases: ['Mi primo está en la playa.', 'El plátano está en el plato.', 'El profesor da un premio.']
    },

    {
      id: 'tr-dr', tipo: 'grupo', color: 0, emoji: '🚆',
      titulo: 'tr, dr', tituloZh: 'tr、dr', letra: 'tr · dr', nombre: 'te con erre, de con erre', fonema: 'tr · dr',
      truco: 'Tra, tre, tri, tro, tru. Dra, dre, dri, dro, dru. Son los últimos grupos trabados. ¡Ya casi sabes leerlo todo!',
      trucoZh: 'tra…、dra…。這是最後的輔音組合。你幾乎已經會讀所有單字了！',
      silabas: ['tra', 'tre', 'tri', 'tro', 'tru', 'dra', 'dre', 'dri', 'dro', 'dru'],
      palabras: [['tren', '🚆'], ['tres', '3️⃣'], ['trompeta', '🎺'], ['tractor', '🚜'], ['padre', '👨'], ['madre', '👩'], ['cuadro', '🖼️'], ['ladrillo', '🧱']],
      frases: ['Mi padre tiene un tren.', 'Tres tristes tigres.', 'La madre mira el cuadro.']
    },

    {
      id: 'inversas', tipo: 'inversas', color: 1, emoji: '🌳',
      titulo: 'Sílabas al revés', tituloZh: '倒過來的音節', letra: 'al · en · ar · es', nombre: 'sílabas inversas',
      fonema: 'vocal + consonante',
      truco: 'Hasta ahora la consonante iba delante: la, le, li. Ahora va detrás: al, el, il, ol, ul. La vocal manda y la consonante cierra la sílaba. Ár-bol.',
      trucoZh: '之前輔音在前：la、le、li。現在輔音在後：al、el、il、ol、ul，元音在前，輔音收尾。ár-bol。',
      silabas: ['al', 'el', 'ar', 'er', 'as', 'es', 'an', 'en', 'in', 'on', 'un', 'or'],
      palabras: [['árbol', '🌳'], ['isla', '🏝️'], ['campo', '🌾'], ['pastel', '🎂'], ['elefante', '🐘'], ['ventana', '🪟'], ['escuela', '🏫'], ['invierno', '❄️'], ['español', '🇪🇸']],
      frases: ['El elefante es muy alto.', 'Yo hablo español.', 'La ventana da al campo.']
    },

    {
      id: 'diptongos', tipo: 'diptongos', color: 2, emoji: '✈️',
      titulo: 'Dos vocales juntas', tituloZh: '兩個元音在一起', letra: 'ai · ue · io', nombre: 'diptongos',
      fonema: 'vocal + vocal',
      truco: 'Cuando dos vocales van juntas, muchas veces se leen de un tirón, en la misma sílaba: ai-re, a-gua, a-vión. Pero si las dos son fuertes, se separan: le-ón, te-a-tro.',
      trucoZh: '兩個元音在一起時常常連讀，屬於同一個音節：ai-re、a-gua。但如果兩個都是強元音，就要分開：le-ón。',
      silabas: ['ai', 'au', 'ei', 'eu', 'oi', 'ia', 'ie', 'io', 'iu', 'ua', 'ue', 'ui', 'uo'],
      palabras: [['aire', '💨'], ['auto', '🚙'], ['piano', '🎹'], ['tierra', '🌍'], ['avión', '✈️'], ['ciudad', '🏙️'], ['agua', '💧'], ['huevo', '🥚'], ['león', '🦁'], ['museo', '🏛️']],
      frases: ['El avión vuela por el aire.', 'El león vive en África.', 'Bebo agua y como un huevo.']
    },

    {
      id: 'tildes', tipo: 'tildes', color: 3, emoji: '🎵',
      titulo: 'La tilde y los signos', tituloZh: '重音符號和標點', letra: 'á é í ó ú', nombre: 'la tilde',
      fonema: 'la sílaba más fuerte',
      truco: 'La rayita encima de una vocal se llama tilde. Te dice qué sílaba tienes que decir más fuerte. Pa-PÁ, MÚ-si-ca, ÁR-bol. Y fíjate: en español las preguntas y las exclamaciones llevan signo al principio y al final.',
      trucoZh: '元音上面的小斜線叫重音符，告訴你哪個音節要讀得更重。pa-PÁ、MÚ-si-ca。另外，西班牙語的問句和感嘆句在開頭和結尾都有符號。',
      silabas: ['á', 'é', 'í', 'ó', 'ú'],
      palabras: [['papá', '👨'], ['camión', '🚚'], ['árbol', '🌳'], ['música', '🎵'], ['teléfono', '☎️'], ['médico', '👨‍⚕️'], ['plátano', '🍌'], ['rápido', '🏃']],
      frases: ['¿Cómo te llamas?', '¡Qué bien lees!', 'Mi teléfono es rápido.', '¿Dónde está el plátano?']
    },

    {
      id: 'lectura', tipo: 'lectura', color: 4, emoji: '📖',
      titulo: '¡A leer de verdad!', tituloZh: '真正開始閱讀！', letra: '📖', nombre: 'lectura',
      fonema: 'textos completos',
      truco: 'Ya conoces todas las letras del español. Ahora sólo hay que practicar. Lee despacio, sílaba a sílaba si hace falta, y luego otra vez de corrido.',
      trucoZh: '你已經學會了西班牙語所有的字母。現在只要多練習。先慢慢一個音節一個音節地讀，然後再連起來讀一遍。',
      silabas: [],
      palabras: [],
      textos: [
        {
          titulo: 'El gato y el ratón', emoji: '🐈',
          lineas: [
            'Un gato duerme en el sofá.',
            'Un ratón pequeño sale de su casa.',
            'El ratón come un trozo de queso.',
            'El gato abre un ojo y mira.',
            'El ratón corre muy rápido.',
            '¡El gato se queda sin cenar!'
          ]
        },
        {
          titulo: 'Mi familia', emoji: '👨‍👩‍👦',
          lineas: [
            'Yo hablo chino y también hablo español.',
            'Ahora estoy aprendiendo a leer.',
            'Mi padre lee un libro por la noche.',
            'Mi madre toma un café con leche.',
            'Cuando termino, leo un cuento yo solo.',
            'Leer es como abrir una puerta.'
          ]
        },
        {
          titulo: 'El pingüino viajero', emoji: '🐧',
          lineas: [
            'Un pingüino quiere ver el mundo.',
            'Coge un tren, un barco y un avión.',
            'Ve montañas grandes y ciudades con luces.',
            'Prueba fresas, chocolate y un flan.',
            'Pero echa de menos el hielo de su casa.',
            'Vuelve a casa y cuenta su viaje a sus amigos.'
          ]
        }
      ],
      frases: []
    },

    {
      id: 'inventadas', tipo: 'inventadas', color: 5, emoji: '👽',
      titulo: 'Palabras inventadas', tituloZh: '編出來的詞', letra: '👽', nombre: 'palabras inventadas',
      fonema: 'leer sin adivinar',
      truco: 'Estas palabras no existen: me las he inventado. Por eso no puedes acordarte de ellas ni adivinarlas por su forma. Sólo salen si las lees letra a letra. Es el ejercicio que de verdad demuestra que sabes leer.',
      trucoZh: '這些詞是我編出來的，不存在。所以你不能靠記憶或看形狀猜出來，只能一個字母一個字母地讀。這才真正證明你會讀。',
      silabas: [], palabras: [], frases: []
    },

    {
      id: 'pares', tipo: 'pares', color: 6, emoji: '👀',
      titulo: 'Parecidas pero distintas', tituloZh: '很像但不一樣', letra: 'pato · pata', nombre: 'pares parecidos',
      fonema: 'mirar dentro de la palabra',
      truco: 'Estas parejas se parecen muchísimo: cambian en una letra, o en el orden. Si miras sólo la forma de fuera, caes. Hay que mirar dentro.',
      trucoZh: '這些詞長得很像，只差一個字母或順序不同。只看外形會看錯，要看清楚裡面。',
      silabas: [], palabras: [], frases: []
    },

    {
      id: 'dictado', tipo: 'dictado', color: 7, emoji: '✍️',
      titulo: 'Escribe lo que oigas', tituloZh: '把聽到的寫下來', letra: '✍️', nombre: 'dictado',
      fonema: 'del sonido a la letra',
      truco: 'Ahora al revés: oyes una palabra y la escribes. Escribir obliga a poner las letras en su orden, una detrás de otra. Es la otra mitad de leer.',
      trucoZh: '現在反過來：聽到一個詞，把它寫出來。寫字必須把字母按順序排好，這是閱讀的另一半。',
      silabas: [], palabras: [], frases: []
    },

    {
      id: 'ingles', tipo: 'ingles', color: 0, emoji: '🔀',
      titulo: 'El inglés y el español', tituloZh: '英文和西班牙語', letra: 'A a', nombre: 'los falsos amigos',
      fonema: 'la misma letra, otro sonido',
      truco: 'Tú aprendiste las letras en inglés, y eso ayuda, pero también engaña: muchas suenan distinto en español. Vamos a oír las dos, una detrás de otra, para que no se te mezclen.',
      trucoZh: '你是從英文學會字母的，這有幫助，但也會混淆：很多字母在西班牙語裡發音不同。我們把兩種發音接連聽一遍，就不會弄混了。',
      silabas: [], palabras: [], frases: []
    }
  ];

  /* Todas las palabras vistas hasta una unidad (para los repasos). */
  function palabrasHasta(indice) {
    var out = [];
    for (var i = 0; i <= indice && i < unidades.length; i++) {
      (unidades[i].palabras || []).forEach(function (p) { out.push(p); });
    }
    return out;
  }

  function silabasHasta(indice) {
    var out = [];
    for (var i = 0; i <= indice && i < unidades.length; i++) {
      (unidades[i].silabas || []).forEach(function (s) {
        if (out.indexOf(s) === -1) out.push(s);
      });
    }
    return out;
  }

  function indicePorId(id) {
    for (var i = 0; i < unidades.length; i++) if (unidades[i].id === id) return i;
    return -1;
  }

  global.Curriculo = {
    unidades: unidades,
    palabrasHasta: palabrasHasta,
    silabasHasta: silabasHasta,
    indicePorId: indicePorId,
    total: unidades.length
  };
})(window);
