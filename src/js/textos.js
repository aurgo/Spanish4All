/*!
 * textos.js — Textos de la interfaz en español y chino tradicional.
 *
 * La distinción que lo gobierna todo: el niño ENTIENDE el español hablado
 * pero no sabe LEERLO. Así que lo que suena va en español, y lo que se ve
 * escrito tiene que estar también en chino, o no puede usar la app solo.
 *
 *   t(clave)   para MOSTRAR: devuelve las dos lenguas, separadas por un salto
 *              de línea, cuando el chino está activado.
 *   es(clave)  para HABLAR y para atributos que no admiten dos líneas
 *              (placeholder, aria-label): sólo español.
 *   zh(clave)  sólo chino, para pintarlo con su propio estilo.
 *
 * Usar t() donde iba es() haría que el sintetizador intentara pronunciar el
 * chino con voz española; usar es() donde va t() deja al niño sin poder leer
 * el botón. Por eso están separadas.
 */
(function (global) {
  'use strict';

  var T = {
    appTitulo:      ['Aprendo a leer', '我學讀西班牙語'],
    appSub:         ['Español, desde cero', '西班牙語，從零開始'],
    empezar:        ['Empezar', '開始'],
    continuar:      ['Continuar', '繼續'],
    seguir:         ['Seguir', '繼續'],
    siguiente:      ['Siguiente', '下一個'],
    volver:         ['Volver', '返回'],
    escuchar:       ['Escuchar', '聽'],
    otraVez:        ['Otra vez', '再一次'],
    ajustes:        ['Ajustes', '設定'],
    cerrar:         ['Cerrar', '關閉'],
    mapa:           ['Mapa', '地圖'],
    lectorLibre:    ['Leer cualquier cosa', '讀任何東西'],
    repaso:         ['Repaso', '複習'],
    estrellas:      ['estrellas', '星星'],

    /* Enunciados de las actividades */
    pasoLetra:      ['Mira y escucha', '看和聽'],
    pasoSilabas:    ['Toca cada sílaba', '點擊每個音節'],
    pasoQuizSilaba: ['Escucha y toca la sílaba', '聽並點擊正確的音節'],
    pasoPalabras:   ['Lee las palabras', '讀單字'],
    pasoConstruir:  ['Construye la palabra', '拼出這個單字'],
    pasoQuizPal:    ['Escucha y toca la palabra', '聽並點擊正確的單字'],
    pasoLeerTu:     ['Léelo tú en voz alta', '你大聲讀出來'],
    pasoFrases:     ['Lee las frases', '讀句子'],
    pasoTexto:      ['Lee el cuento', '讀故事'],

    tocaTodas:      ['Tócalas todas', '全部點一遍'],
    tocaParaOir:    ['Toca para oír', '點擊聽聲音'],
    tocaSilabas:    ['Toca las sílabas en orden', '按順序點擊音節'],
    ahoraLeeTu:     ['Ahora léelo tú', '現在你來讀'],
    comprobar:      ['Comprobar', '檢查'],
    loDijeBien:     ['¡Lo dije bien!', '我讀對了！'],
    otraVezLeer:    ['Otra vez', '再試一次'],
    muyBien:        ['¡Muy bien!', '很好！'],
    casi:           ['Casi. Escucha otra vez.', '差一點。再聽一次。'],
    unidadHecha:    ['¡Unidad terminada!', '這一課完成了！'],
    ganasteEstrella:['Has ganado estrellas', '你得到了星星'],
    aLaSiguiente:   ['Ir a la siguiente', '去下一課'],

    /* Lector libre */
    escribeAlgo:    ['Escribe o pega cualquier texto', '輸入或貼上任何文字'],
    leerTodo:       ['Leer todo', '全部朗讀'],
    porSilabas:     ['Por sílabas', '按音節'],
    verSilabas:     ['Separar sílabas', '分開音節'],
    verJunto:       ['Todo junto', '連在一起'],
    tocaPalabra:    ['Toca una palabra para oírla. Toca una sílaba para oírla sola.',
                     '點擊單字聽發音。點擊音節單獨聽。'],
    limpiar:        ['Limpiar', '清空'],

    /* Ajustes */
    velocidad:      ['Velocidad de la voz', '語速'],
    lento:          ['Lento', '慢'],
    rapido:         ['Rápido', '快'],
    voz:            ['Voz', '聲音'],
    mostrarChino:   ['Mostrar chino 繁體中文', '顯示繁體中文'],
    mayusculas:     ['Mostrar en MAYÚSCULAS', '顯示大寫字母'],
    desbloquear:    ['Desbloquear todas las unidades', '解鎖所有課程'],
    borrar:         ['Borrar el progreso', '清除學習進度'],
    borrarSeguro:   ['¿Seguro? Se perderán las estrellas.', '確定嗎？星星會消失。'],
    sinVoz:         ['Este navegador no puede hablar. Prueba con Chrome, Safari o Edge.',
                     '這個瀏覽器不能朗讀。請使用 Chrome、Safari 或 Edge。'],
    sinVozEs:       ['No hay una voz en español instalada. La pronunciación puede sonar rara.',
                     '沒有安裝西班牙語語音，發音可能不準確。'],
    progreso:       ['Progreso', '進度'],
    bloqueada:      ['Termina la unidad anterior', '先完成上一課'],
    letras:         ['letras', '字母'],
    sonido:         ['Suena', '發音'],
    seLlama:        ['Se llama', '名字叫'],
    palabras:       ['Palabras', '單字'],
    tuTurno:        ['Tu turno', '輪到你了'],

    /* Lectura en voz alta con micrófono */
    pasoLeerVoz:    ['Lee en voz alta al micrófono', '對著麥克風大聲讀'],
    tocaYLee:       ['Toca el micrófono y lee', '點麥克風，然後讀出來'],
    teEscucho:      ['Te escucho…', '我在聽…'],
    heOido:         ['He oído', '我聽到的是'],
    leerlaTu:       ['Léela tú en voz alta', '你大聲讀一遍'],
    escuchalo:      ['Escúchalo', '聽一聽'],
    saltar:         ['Saltar', '跳過'],
    micro:          ['Micrófono', '麥克風'],
    usarMicro:      ['Ejercicios con micrófono', '用麥克風練習'],
    modeloTitulo:   ['Comentarios del modelo del navegador', '瀏覽器模型的評語'],
    modeloListo:    ['Disponible en este navegador', '這個瀏覽器可以使用'],
    modeloDescarga: ['Se descargará la primera vez', '第一次使用時會下載'],
    modeloNo:       ['No disponible aquí (se usan las pistas propias)', '這裡沒有（改用內建提示）'],
    microNo:        ['Este navegador no puede escuchar; te comprobarás tú',
                     '這個瀏覽器不能聽；你自己檢查'],
    sinSeguro:      ['El micrófono necesita https. Ábrelo desde el enlace, no desde el archivo.',
                     '麥克風需要 https。請用網址開啟，不要用檔案開啟。'],

    /* Instalación en el dispositivo */
    instalar:       ['Instalar', '安裝'],
    instalarApp:    ['Instalar la app', '安裝這個應用程式'],
    instalarComo:   ['Cómo instalarla', '怎麼安裝'],
    yaInstalada:    ['Ya está instalada', '已經安裝好了'],
    sinConexion:    ['Funciona sin internet', '沒有網路也能用'],
    entendido:      ['Entendido', '知道了'],

    /* Pasar el progreso a otro dispositivo */
    traspaso:       ['Cambiar de dispositivo', '換一台裝置'],
    tuCodigo:       ['Tu código', '你的代碼'],
    copiarEnlace:   ['Copiar el enlace', '複製連結'],
    copiado:        ['¡Copiado!', '已複製！'],
    vienesDeOtro:   ['¿Vienes de otro aparato?', '從別的裝置來的嗎？'],
    pegaCodigo:     ['Escribe aquí el código', '在這裡輸入代碼'],
    continuarAqui:  ['Continuar aquí', '在這裡繼續'],
    traspasoAyuda:  ['El código se puede dictar: lleva las unidades, los cuentos y las estrellas.',
                     '這個代碼可以唸給別人：包含課程、故事和星星。'],
    enlaceLlevaTodo:['El enlace lleva además la velocidad de lectura y lo que le cuesta, para que el repaso siga sabiendo qué traerle.',
                     '連結還包含閱讀速度和容易出錯的地方，這樣複習才知道該練什麼。'],
    traspasoOjo:    ['Los ajustes no viajan: la voz de cada aparato es distinta.',
                     '設定不會一起帶過去：每台裝置的語音不一樣。'],
    codigoMal:      ['Ese código no vale. Míralo otra vez.', '這個代碼無效，請再檢查一次。'],
    codigoPisa:     ['Esto sustituirá el progreso de este aparato. ¿Seguro?',
                     '這會取代這台裝置上的進度。確定嗎？'],
    codigoBien:     ['¡Listo! Progreso recuperado.', '好了！進度已經找回來。'],
    copiarCodigo:   ['Copiar el código', '複製代碼'],

    /* Frases que antes estaban escritas a pelo dentro de la interfaz */
    seLlamaAsi:     ['Se llama', '這個字母叫'],
    suenaAsi:       ['Suena así', '聽起來像這樣'],
    noEscuchaOtra:  ['No. Escucha otra vez', '不對。再聽一次'],
    perfectoCorto:  ['¡Perfecto!', '完美！'],
    escuchaOtraVez: ['Escucha otra vez', '再聽一次'],
    cambianEn:      ['Cambian en', '差別在'],
    noEsEsa:        ['Ésa no. Vuelve a leer y fíjate.', '不是那個。再讀一次，看仔細。'],
    noEsEsta:       ['Ese no. Lee otra vez.', '不是這個。再讀一次。'],
    cadaBarra:      ['Cada barra es una lectura, de la más antigua a la más reciente.',
                     '每一條是一次朗讀，從最早到最近。'],
    repasoTrae:     ['El repaso ya le está trayendo', '複習現在會給他'],
    iconoPropio:    ['Un icono propio, ventana propia, y sin buscar el archivo.',
                     '自己的圖示、自己的視窗，不用再找檔案。'],
    hechoCon:       ['Con la voz del navegador · sin internet, sin cuentas',
                     '使用瀏覽器語音 · 不需網路，不需帳號'],
    noEsSino:       ['No es', '不是'],
    fijateEn:       ['Fíjate en', '注意看'],
    palabrasCorto:  ['palabras', '個字'],
    todaviaNoHay:   ['Todavía no hay palabras suficientes para repasar. Aprende una unidad más.',
                     '還沒有足夠的單字可以複習。再學一課吧。'],

    /* Nivel avanzado */
    pasoIngles:     ['Escucha las dos y nota la diferencia', '兩種都聽，注意不一樣的地方'],
    pasoInventadas: ['Lee estas palabras inventadas', '讀這些編出來的詞'],
    pasoPares:      ['Escucha y toca la que he dicho', '聽，然後點我說的那個'],
    pasoDictado:    ['Escribe la palabra que oigas', '把聽到的詞寫出來'],
    enIngles:       ['En inglés', '英文裡'],
    enEspanol:      ['En español', '西班牙語裡'],
    sinVozInglesa:  ['Este aparato no tiene voz inglesa, así que te lo explico sin el ejemplo.',
                     '這台裝置沒有英文語音，只用文字說明。'],
    escribeAqui:    ['Escribe aquí', '在這裡寫'],
    revisar:        ['Revisar', '檢查'],
    ortografia:     ['Suena bien, pero se escribe distinto', '發音對了，但拼法不一樣'],
    enQueCambian:   ['En qué cambian', '差別在哪裡'],

    /* Cuentos */
    biblioteca:     ['Cuentos', '故事'],
    nivel:          ['Nivel', '等級'],
    moraleja:       ['Lo que nos enseña', '這個故事告訴我們'],
    preguntaTitulo: ['¿Lo has entendido?', '你看懂了嗎？'],
    leerYCronometrar: ['Léelo tú y te cronometro', '你來讀，我幫你計時'],
    yaTermine:      ['Ya he terminado', '我讀完了'],
    ppm:            ['palabras por minuto', '每分鐘幾個字'],
    intento:        ['Intento', '第幾次'],
    mejorMarca:     ['¡Tu mejor marca!', '你的最佳紀錄！'],
    masRapido:      ['Más rápido que antes', '比上次快'],
    otraVezMasRapido: ['Léelo otra vez, te saldrá más rápido', '再讀一次，會更快'],

    /* Panel del adulto */
    comoVa:         ['Cómo va', '學習情況'],
    diasSeguidos:   ['Días seguidos', '連續天數'],
    diasTotales:    ['Días practicando', '練習天數'],
    dondeFalla:     ['Dónde falla más', '最常出錯的地方'],
    velocidad2:     ['Velocidad de lectura', '閱讀速度'],
    mejorPpm:       ['Mejor marca', '最佳紀錄'],
    sinDatos:       ['Todavía no hay datos. Cuando lea en voz alta, aparecerán aquí.',
                     '還沒有資料。等他大聲讀過之後就會出現。'],
    repasoFlojo:    ['Repaso de lo que falla', '複習容易錯的地方'],

    /* Bienvenida y varios niños en el mismo aparato */
    holaBienvenida: ['¡Hola!', '你好！'],
    queEsEsto:      ['Esta app enseña a leer español desde cero, con la voz y el micrófono del navegador. Es para niños que ya hablan español pero nunca lo han leído.',
                     '這個應用程式用瀏覽器的語音和麥克風，從零開始教你讀西班牙語。適合已經會說西班牙語、但還不會讀的小朋友。'],
    comoTeLlamas:   ['¿Cómo te llamas?', '你叫什麼名字？'],
    tuNombre:       ['Tu nombre', '你的名字'],
    eligeDibujo:    ['Elige tu dibujo', '選一個圖案'],
    leesChino:      ['¿Sabes leer chino?', '你會讀中文嗎？'],
    leesChinoAyuda: ['Pondré las instrucciones también en chino tradicional.',
                     '我會把說明也用繁體中文寫出來。'],
    letrasIngles:   ['¿Te sabes las letras en inglés?', '你會英文字母嗎？'],
    letrasInglesAyuda: ['Te avisaré cuando una letra suene distinto en español.',
                        '當字母在西班牙語裡發音不同時，我會提醒你。'],
    vamos:          ['¡Vamos!', '開始吧！'],
    quienJuega:     ['Quién está leyendo', '誰在讀'],
    cambiarNino:    ['Cambiar de niño', '換一個小朋友'],
    anadirNino:     ['Añadir otro niño', '新增小朋友'],
    borrarNino:     ['Borrar este niño', '刪除這個小朋友'],
    borrarNinoOjo:  ['Se borrará todo su progreso. ¿Seguro?', '他的進度會全部刪除。確定嗎？'],
    sinNombre:      ['Sin nombre', '沒有名字'],
    compartir:      ['Compartir la app', '分享這個應用程式'],
    compartida:     ['¡Enlace copiado!', '連結已複製！'],
    paraPadres:     ['Para los padres', '給家長'],
    avisosIngles:   ['Avisos sobre el inglés', '英文對照提示']
  };

  var idioma = 0;   // 0 = español, 1 = chino como apoyo

  global.Textos = {
    /* Para mostrar en pantalla: las dos lenguas, una encima de otra. */
    t: function (clave) {
      var v = T[clave];
      if (!v) return clave;
      return (idioma === 1 && v[1]) ? v[0] + '\n' + v[1] : v[0];
    },
    /* Para hablar, y para atributos de una sola línea. */
    es: function (clave) {
      var v = T[clave];
      return v ? v[0] : clave;
    },
    zh: function (clave) {
      var v = T[clave];
      return v && v[1] ? v[1] : '';
    },
    conChino: function (clave) {
      var es = global.Textos.t(clave);
      return idioma === 1 ? es + ' · ' + global.Textos.zh(clave) : es;
    },
    usarChino: function (v) {
      if (arguments.length) idioma = v ? 1 : 0;
      return idioma === 1;
    }
  };
})(window);
