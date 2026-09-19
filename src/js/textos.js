/*!
 * textos.js — Textos de la interfaz en español y chino.
 *
 * El niño lee chino con soltura pero todavía no español: mientras aprende,
 * poder ver una instrucción en chino es la diferencia entre necesitar a un
 * adulto al lado y poder avanzar solo. Se activa con el botón 中文.
 *
 * Ojo: los enunciados SIEMPRE se pronuncian en voz alta en español además de
 * mostrarse. El chino es una muleta de apoyo, no el camino principal.
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
    entendido:      ['Entendido', '知道了']
  };

  var idioma = 0;   // 0 = español, 1 = chino como apoyo

  global.Textos = {
    t: function (clave) {
      var v = T[clave];
      if (!v) return clave;
      return v[0];
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
