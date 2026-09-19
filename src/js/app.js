/*!
 * app.js — Aprendo a leer en español
 *
 * Une el currículo, el silabeador, la voz del navegador y el progreso en una
 * secuencia de actividades que un niño puede recorrer solo.
 *
 * Idea central: el niño no sabe leer español, así que NINGUNA instrucción
 * puede exigir lectura. Cada pantalla se dice en voz alta al entrar, cada
 * enunciado tiene su botón para repetirlo, y todo se apoya en emoji y color.
 *
 * Las actividades van de reconocer a producir:
 *   1. mirar y escuchar la letra      (reconocer)
 *   2. tocar sílabas                  (asociar grafía y sonido)
 *   3. escuchar y elegir la sílaba    (discriminar)
 *   4. leer palabras troceadas        (descifrar)
 *   5. construir la palabra oída      (sintetizar)
 *   6. leer y elegir el dibujo        (leer de verdad, sin pistas de audio)
 *   7. leer en voz alta y comprobarse (producir)
 *   8. frases y textos                (leer de corrido)
 */
(function (global) {
  'use strict';

  var Voz = global.Voz;
  var Silabas = global.Silabas;
  var Curriculo = global.Curriculo;
  var Progreso = global.Progreso;
  var T = global.Textos;
  var Escucha = global.Escucha;
  var Evaluar = global.Evaluar;
  var Modelo = global.Modelo;
  var PWA = global.PWA;
  var Avanzado = global.Avanzado;

  var raiz;
  var vista = { nombre: 'portada' };
  var leccion = null;

  /* ------------------------------------------------------------ utilería */

  function el(tag, attrs, hijos) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'style') n.setAttribute('style', v);
        else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      });
    }
    (hijos || []).forEach(function (h) {
      if (h === null || h === undefined || h === false) return;
      n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
    });
    return n;
  }

  var AVATARES = ['🙂', '🐼', '🐯', '🦊', '🐸', '🐧', '🦁', '🐨', '🐙', '🦄', '🐝', '🌟'];

  function mezclar(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  /* n elementos al azar de "fuente" que no estén ya en "fuera" */
  function tomar(fuente, n, fuera) {
    var libres = fuente.filter(function (x) {
      return (fuera || []).indexOf(x) === -1;
    });
    return mezclar(libres).slice(0, n);
  }

  /*
   * Etiqueta con su traducción china debajo. Devuelve UN solo nodo en columna:
   * si fueran dos hermanos, el flex de los botones los pondría uno al lado del
   * otro y el chino saldría aplastado en una columna de un carácter.
   */
  function etiqueta(clave) {
    var hijos = [el('span', { text: T.t(clave) })];
    if (T.usarChino()) hijos.push(el('span', { class: 'zh', text: T.zh(clave) }));
    return [el('span', { class: 'etq' }, hijos)];
  }

  function confeti() {
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var iconos = ['⭐', '🎉', '✨', '🌟', '🎈'];
    for (var i = 0; i < 18; i++) {
      var c = el('span', {
        class: 'confeti',
        text: iconos[i % iconos.length],
        style: 'left:' + Math.random() * 96 + '%;animation-duration:' +
               (1.6 + Math.random() * 1.4) + 's;animation-delay:' + Math.random() * 0.4 + 's'
      });
      document.body.appendChild(c);
      (function (nodo) { setTimeout(function () { nodo.remove(); }, 3600); })(c);
    }
  }

  /* ------------------------------------------------------------ voz ayuda */

  var ultimaNarracion = Promise.resolve();

  function narrar(texto) {
    ultimaNarracion = Voz.hablar(texto, { tipo: 'frase' });
    return ultimaNarracion;
  }

  /* Espera a que termine el enunciado antes de hablar encima de él. */
  function trasNarrar(fn, retardo) {
    ultimaNarracion.then(function () { setTimeout(fn, retardo || 260); });
  }

  function decir(texto, tipo) {
    return Voz.hablar(texto, { tipo: tipo || 'palabra' });
  }

  /* Enciende la clase "sonando" mientras se pronuncia algo. */
  function resaltar(nodo, promesa) {
    if (!nodo) return promesa;
    nodo.classList.add('sonando');
    return promesa.then(function (r) {
      nodo.classList.remove('sonando');
      return r;
    });
  }

  /*
   * Lee una palabra despacio: primero sílaba a sílaba, luego entera.
   * Si se pasan nodos, los va iluminando al ritmo de la voz.
   */
  function leerPorSilabas(palabra, nodos, nodoEntero) {
    var trozos = Silabas.syllabify(palabra);
    var partes = trozos.map(function (s, i) {
      return {
        text: s,
        tipo: 'silaba',
        pausa: 200,
        antes: function () { if (nodos && nodos[i]) nodos[i].classList.add('sonando'); },
        despues: function () { if (nodos && nodos[i]) nodos[i].classList.remove('sonando'); }
      };
    });
    partes.push({
      text: palabra, tipo: 'palabra', pausa: 120,
      antes: function () { if (nodoEntero) nodoEntero.classList.add('sonando'); },
      despues: function () { if (nodoEntero) nodoEntero.classList.remove('sonando'); }
    });
    return Voz.secuencia(partes);
  }

  /* ------------------------------------------------------------- pantalla */

  function pintar(nodos) {
    raiz.innerHTML = '';
    nodos.forEach(function (n) { if (n) raiz.appendChild(n); });
    global.scrollTo(0, 0);
  }

  function barra(titulo, alVolver, extra) {
    return el('header', { class: 'barra' }, [
      alVolver ? el('button', {
        class: 'btn btn-icono', 'aria-label': T.t('volver'), onclick: alVolver, text: '←'
      }) : null,
      el('h1', { text: titulo }),
      extra || el('div', { class: 'marcador', title: T.t('estrellas') }, [
        el('span', { text: '★' }),
        el('b', { text: String(Progreso.datos().estrellas) })
      ])
    ]);
  }

  var enunciadoDicho = null;

  /*
   * Enunciado hablado. Se pronuncia al ENTRAR en la actividad; en las rondas
   * siguientes se muestra pero no se repite, para no pisar la voz del
   * ejercicio ni cansar con la misma frase cinco veces seguidas.
   */
  function enunciado(clave, textoExtra) {
    var frase = T.t(clave) + (textoExtra ? '. ' + textoExtra : '');
    var caja = el('div', { class: 'enunciado' }, [
      el('button', {
        class: 'btn btn-icono btn-audio', 'aria-label': T.t('escuchar'), text: '🔊',
        onclick: function () { narrar(frase); }
      }),
      el('div', { class: 'txt' }, etiqueta(clave))
    ]);
    if (enunciadoDicho !== clave) {
      enunciadoDicho = clave;
      ultimaNarracion = new Promise(function (listo) {
        setTimeout(function () { Voz.hablar(frase, { tipo: 'frase' }).then(listo); }, 220);
      });
    }
    return caja;
  }

  /* ---------------------------------------------------------- bienvenida */

  /*
   * Primera pantalla, la única pensada para que la lea un adulto: explica qué
   * es esto y pregunta lo que cambia la app para cada niño. Después no vuelve
   * a aparecer.
   *
   * Las dos preguntas no son de adorno:
   *   - Si lee chino, los enunciados salen también en chino tradicional, y
   *     puede avanzar sin que nadie se los lea.
   *   - Si se sabe el abecedario en inglés, avisamos de las letras que allí
   *     suenan distinto, que es su fuente de error más probable. Si no lo
   *     sabe, esos avisos sobran y sólo lían.
   */
  function verBienvenida(alTerminar) {
    vista = { nombre: 'bienvenida' };
    var perfil = Progreso.perfilActivo();
    var elegido = perfil.emoji || '🙂';

    var campo = el('input', {
      type: 'text', class: 'campo-nombre', placeholder: T.t('tuNombre'),
      maxlength: '20', autocomplete: 'off', value: perfil.nombre || ''
    });

    var fila = el('div', { class: 'avatares' });
    AVATARES.forEach(function (e) {
      var b = el('button', {
        class: 'avatar' + (e === elegido ? ' elegido' : ''), text: e,
        onclick: function () {
          elegido = e;
          [].forEach.call(fila.children, function (c) { c.classList.remove('elegido'); });
          b.classList.add('elegido');
        }
      });
      fila.appendChild(b);
    });

    function interruptorGrande(clave, ayuda, valor, alCambiar) {
      var input = el('input', { type: 'checkbox', checked: valor ? 'checked' : null });
      input.addEventListener('change', function () { alCambiar(input.checked); });
      return el('div', { class: 'ajuste' }, [
        el('label', { class: 'interruptor' }, [
          el('span', {}, etiqueta(clave)),
          input
        ]),
        el('p', { class: 'dato', text: T.t(ayuda) })
      ]);
    }

    var leeChino = !!Progreso.ajuste('chino');
    var sabeIngles = Progreso.ajuste('ingles') !== false;

    pintar([
      el('section', { class: 'bienvenida' }, [
        el('div', { class: 'logo', text: '📖' }),
        el('h1', {}, etiqueta('holaBienvenida')),
        el('p', { class: 'truco', text: T.t('queEsEsto') }),

        el('div', { class: 'ajuste' }, [
          el('label', {}, etiqueta('comoTeLlamas')),
          campo
        ]),
        el('div', { class: 'ajuste' }, [
          el('label', {}, etiqueta('eligeDibujo')),
          fila
        ]),
        interruptorGrande('leesChino', 'leesChinoAyuda', leeChino, function (v) {
          leeChino = v;
        }),
        interruptorGrande('letrasIngles', 'letrasInglesAyuda', sabeIngles, function (v) {
          sabeIngles = v;
        }),

        el('button', {
          class: 'btn btn-principal btn-grande',
          text: '▶️ ' + T.t('vamos'),
          onclick: function () {
            Progreso.renombrarPerfil(perfil.id, campo.value.trim(), elegido);
            Progreso.ajuste('chino', leeChino);
            Progreso.ajuste('ingles', sabeIngles);
            T.usarChino(leeChino);
            (alTerminar || verPortada)();
          }
        })
      ])
    ]);
  }

  /* Quién está leyendo: hermanos y amigos en la misma tableta. */
  function verPerfiles() {
    var hoja = el('div', { class: 'hoja' });
    hoja.addEventListener('click', function (ev) { if (ev.target === hoja) hoja.remove(); });
    var panel = el('div', { class: 'hoja-panel' });
    var activo = Progreso.perfilActivo();

    panel.appendChild(el('h2', { style: 'margin:0 0 12px' }, etiqueta('quienJuega')));

    Progreso.perfiles().forEach(function (p) {
      var res = (function () {
        var antes = activo.id;
        Progreso.activarPerfil(p.id);
        var r = Progreso.resumen(Curriculo.unidades);
        Progreso.activarPerfil(antes);
        return r;
      })();
      panel.appendChild(el('button', {
        class: 'perfil' + (p.id === activo.id ? ' activo' : ''),
        onclick: function () {
          Progreso.activarPerfil(p.id);
          T.usarChino(!!Progreso.ajuste('chino'));
          document.body.setAttribute('data-may', Progreso.ajuste('mayusculas') ? '1' : '0');
          Voz.velocidad(Progreso.ajuste('velocidad') || 0.85);
          hoja.remove();
          verPortada();
        }
      }, [
        el('span', { class: 'perfil-emo', text: p.emoji }),
        el('span', { class: 'perfil-datos' }, [
          el('b', { text: p.nombre || T.t('sinNombre') }),
          el('span', { text: res.completas + '/' + res.total + ' · ★ ' + res.estrellas })
        ]),
        p.id === activo.id ? el('span', { class: 'hecha', text: '✓' }) : null
      ]));
    });

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', {
        class: 'btn btn-grande', text: '➕ ' + T.t('anadirNino'),
        onclick: function () {
          Progreso.crearPerfil('', '🙂');
          hoja.remove();
          verBienvenida();
        }
      })
    ]));

    if (Progreso.perfiles().length > 1) {
      panel.appendChild(el('div', { class: 'ajuste' }, [
        el('button', {
          class: 'btn btn-grande', style: 'border-color:var(--error);color:var(--error)',
          text: '🗑️ ' + T.t('borrarNino') + ': ' + (activo.nombre || T.t('sinNombre')),
          onclick: function () {
            if (!global.confirm(T.t('borrarNinoOjo'))) return;
            Progreso.borrarPerfil(activo.id);
            hoja.remove();
            verPortada();
          }
        })
      ]));
    }

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', { class: 'btn btn-principal btn-grande', text: T.t('cerrar'),
        onclick: function () { hoja.remove(); } })
    ]));

    hoja.appendChild(panel);
    document.body.appendChild(hoja);
  }

  /* ------------------------------------------------------------- portada */

  function verPortada() {
    vista = { nombre: 'portada' };
    var unidades = Curriculo.unidades;
    var res = Progreso.resumen(unidades);
    var sugerida = Progreso.siguienteUnidad(unidades);

    var rejilla = el('div', { class: 'rejilla-unidades' });
    unidades.forEach(function (u, i) {
      var libre = Progreso.disponible(i, unidades);
      var hecha = Progreso.unidadCompleta(u.id);
      var etq = u.letra || u.titulo;
      var btn = el('button', {
        class: 'unidad-btn' + (i === sugerida && libre ? ' sugerida' : ''),
        style: '--u: var(--c' + (u.color || 0) + ')',
        'data-bloqueada': libre ? '0' : '1',
        'aria-label': (i + 1) + '. ' + u.titulo + (libre ? '' : ' — ' + T.t('bloqueada')),
        onclick: function () {
          if (!libre) {
            narrar(T.t('bloqueada'));
            return;
          }
          abrirLeccion(i);
        }
      }, [
        el('span', { class: 'n', text: String(i + 1) }),
        el('span', { class: 'letra' + (etq.length <= 2 ? ' corta' : ''), text: etq }),
        el('span', { class: 'emo', text: u.emoji || '' }),
        hecha ? el('span', { class: 'hecha', text: '✓' }) : null
      ]);
      rejilla.appendChild(btn);
    });

    var yo = Progreso.perfilActivo();
    var chapa = el('button', {
      class: 'marcador marcador-perfil', 'aria-label': T.t('cambiarNino'),
      onclick: verPerfiles
    }, [
      el('span', { class: 'perfil-mini', text: yo.emoji || '🙂' }),
      yo.nombre ? el('b', { class: 'perfil-nombre', text: yo.nombre }) : null,
      el('span', { text: '★' }),
      el('b', { text: String(Progreso.datos().estrellas) })
    ]);

    pintar([
      barra(T.t('appTitulo'), null, chapa),
      el('section', { class: 'portada' }, [
        el('div', { class: 'logo', text: '📖' }),
        el('h2', {}, etiqueta('appTitulo')),
        el('p', { text: T.t('appSub') }),
        el('button', {
          class: 'btn btn-principal btn-grande',
          onclick: function () { abrirLeccion(sugerida); }
        }, [
          el('span', { text: res.completas ? '▶️ ' + T.t('continuar') : '▶️ ' + T.t('empezar') })
        ]),
        el('div', { class: 'progreso-barra' }, [
          el('i', { style: 'width:' + res.porcentaje + '%' })
        ]),
        el('p', {
          text: res.completas + ' / ' + res.total + ' · ★ ' + res.estrellas +
                (Progreso.racha() > 1 ? ' · 🔥 ' + Progreso.racha() : '')
        })
      ]),
      avisosVoz(),
      el('div', { class: 'acciones-rapidas' }, [
        el('button', { class: 'btn', onclick: verLector }, [el('span', { text: '🔤' })].concat(etiqueta('lectorLibre'))),
        el('button', { class: 'btn', onclick: abrirRepaso }, [el('span', { text: '🔁' })].concat(etiqueta('repaso'))),
        el('button', { class: 'btn', onclick: verBiblioteca }, [el('span', { text: '📚' })].concat(etiqueta('biblioteca'))),
        el('button', { class: 'btn', onclick: verComoVa }, [el('span', { text: '👨‍👩‍👦' })].concat(etiqueta('comoVa')))
      ]),
      rejilla,
      el('div', { class: 'acciones-rapidas' }, [
        el('button', { class: 'btn', onclick: verAjustes }, [el('span', { text: '⚙️' })].concat(etiqueta('ajustes'))),
        PWA.instalada()
          ? el('div', { class: 'btn', style: 'cursor:default;opacity:.75' },
               [el('span', { text: '✅' })].concat(etiqueta('yaInstalada')))
          : el('button', { class: 'btn', onclick: verInstalar },
               [el('span', { text: '📲' })].concat(etiqueta('instalar')))
      ]),
      el('p', { class: 'pie', text: 'Hecho con la voz del propio navegador · sin internet, sin cuentas' })
    ]);
  }

  function avisosVoz() {
    if (!Voz.soportado) {
      return el('div', { class: 'aviso' }, [el('span', { text: '⚠️' }), el('span', { text: T.t('sinVoz') })]);
    }
    if (!Voz.hayVozEspanola()) {
      return el('div', { class: 'aviso' }, [el('span', { text: '⚠️' }), el('span', { text: T.t('sinVozEs') })]);
    }
    return null;
  }

  /* ------------------------------------------------------------- lección */

  /* Qué actividades tiene una unidad, según los datos que trae. */
  function pasosDe(u) {
    var pasos = ['intro'];
    if (u.tipo === 'vocales') {
      pasos.push('silabas', 'quiz-silaba', 'vocal-inicial');
      return pasos;
    }
    if (u.tipo === 'ingles') { pasos.push('ingles'); return pasos; }
    if (u.tipo === 'inventadas') { pasos.push('inventadas'); return pasos; }
    if (u.tipo === 'pares') { pasos.push('pares-oir', 'pares-leer'); return pasos; }
    if (u.tipo === 'dictado') { pasos.push('dictado'); return pasos; }
    if (u.silabas && u.silabas.length) {
      pasos.push('silabas');
      pasos.push('quiz-silaba');
    }
    if (u.palabras && u.palabras.length) {
      pasos.push('palabras', 'construir');
      if (u.palabras.length >= 3) pasos.push('elige-dibujo');
      pasos.push('leer-tu');
    }
    if (u.frases && u.frases.length) pasos.push('frases');
    if (u.textos && u.textos.length) pasos.push('texto');
    return pasos;
  }

  function abrirLeccion(indice) {
    Progreso.marcarDia();
    var u = Curriculo.unidades[indice];
    leccion = {
      indice: indice,
      unidad: u,
      pasos: pasosDe(u),
      paso: 0,
      estrellas: 0,
      repaso: false
    };
    vista = { nombre: 'leccion' };
    enunciadoDicho = null;
    pintarPaso();
  }

  /*
   * El repaso ya no coge palabras al azar: la app lleva la cuenta de qué
   * unidades se le atragantan al leer en voz alta, y esas pesan el doble.
   * Lo que ya le sale bien deja de aparecer.
   */
  function abrirRepaso() {
    var hasta = Progreso.siguienteUnidad(Curriculo.unidades);
    var palabras = Curriculo.palabrasHasta(Math.max(0, hasta));
    if (palabras.length < 4) {
      narrar('Todavía no hay palabras suficientes para repasar. Aprende una unidad más.');
      return;
    }

    var flojas = Progreso.unidadesFlojas();
    var titulo = T.t('repaso');
    if (flojas.length) {
      var deFlojas = [];
      flojas.forEach(function (f) {
        var u = Curriculo.unidades[Curriculo.indicePorId(f.id)];
        if (u && u.palabras) deFlojas = deFlojas.concat(u.palabras);
      });
      if (deFlojas.length >= 3) {
        /* Dos tercios de lo que falla, un tercio de repaso general. */
        palabras = mezclar(deFlojas).slice(0, 8).concat(mezclar(palabras).slice(0, 4));
        titulo = T.t('repasoFlojo');
      }
    }

    leccion = {
      indice: hasta,
      unidad: {
        id: 'repaso', titulo: titulo, color: 2, emoji: '🔁',
        silabas: Curriculo.silabasHasta(hasta),
        palabras: mezclar(palabras).slice(0, 12),
        frases: []
      },
      pasos: ['elige-dibujo', 'construir', 'leer-tu'],
      paso: 0,
      estrellas: 0,
      repaso: true
    };
    vista = { nombre: 'leccion' };
    enunciadoDicho = null;
    pintarPaso();
  }

  function siguientePaso() {
    Voz.parar();
    enunciadoDicho = null;
    var l = leccion;
    Progreso.completarPaso(l.unidad.id, l.pasos[l.paso], 1);
    l.estrellas += 1;
    l.paso += 1;
    if (l.paso >= l.pasos.length) return terminarUnidad();
    pintarPaso();
  }

  function terminarUnidad() {
    var l = leccion;
    if (!l.repaso) Progreso.completarUnidad(l.unidad.id);
    confeti();
    var hayMas = !l.repaso && l.indice + 1 < Curriculo.unidades.length;
    setTimeout(function () { narrar(T.t('unidadHecha') + ' ¡Muy bien!'); }, 250);

    pintar([
      barra(l.unidad.titulo, verPortada),
      el('section', { class: 'resultado', style: '--u: var(--c' + (l.unidad.color || 0) + ')' }, [
        el('div', { class: 'emo', text: '🏆' }),
        el('h2', {}, etiqueta('unidadHecha')),
        el('div', { class: 'estrellas-ganadas', text: new Array(Math.min(l.estrellas, 8) + 1).join('★') }),
        el('div', { class: 'fila-botones' }, [
          hayMas ? el('button', {
            class: 'btn btn-principal',
            onclick: function () { abrirLeccion(l.indice + 1); }
          }, [el('span', { text: '▶️' })].concat(etiqueta('aLaSiguiente'))) : null,
          el('button', { class: 'btn', onclick: verPortada }, [el('span', { text: '🗺️' })].concat(etiqueta('mapa')))
        ])
      ])
    ]);
  }

  /* Barra de puntitos con el avance dentro de la unidad. */
  function indicadorPasos() {
    var l = leccion;
    var caja = el('div', { class: 'pasos' });
    l.pasos.forEach(function (_, i) {
      caja.appendChild(el('i', { class: i < l.paso ? 'hecho' : (i === l.paso ? 'actual' : '') }));
    });
    return caja;
  }

  /*
   * Arma la pantalla de una actividad. "alEntrar" se pronuncia en cuanto
   * termina el enunciado: el orden importa, porque si se lanzan a la vez la
   * segunda locución cancela la primera a media frase.
   */
  function marco(hijos, claveEnunciado, extraNarracion, alEntrar) {
    var l = leccion;
    var seccion = el('section', { style: '--u: var(--c' + (l.unidad.color || 0) + ')' }, [
      indicadorPasos(),
      claveEnunciado ? enunciado(claveEnunciado, extraNarracion) : null
    ].concat(hijos));
    pintar([barra(l.unidad.titulo, verPortada), seccion]);
    if (alEntrar) trasNarrar(alEntrar, 320);
    return seccion;
  }

  function botonSiguiente(texto, activo) {
    return el('button', {
      class: 'btn btn-principal btn-grande',
      disabled: activo === false ? 'disabled' : null,
      onclick: siguientePaso
    }, [el('span', { text: '✅ ' + T.t(texto || 'siguiente') })]);
  }

  function pintarPaso() {
    var paso = leccion.pasos[leccion.paso];
    ({
      'intro': pasoIntro,
      'silabas': pasoSilabas,
      'quiz-silaba': pasoQuizSilaba,
      'vocal-inicial': pasoVocalInicial,
      'palabras': pasoPalabras,
      'construir': pasoConstruir,
      'elige-dibujo': pasoEligeDibujo,
      'leer-tu': pasoLeerTu,
      'frases': pasoFrases,
      'texto': pasoTexto,
      'ingles': pasoIngles,
      'inventadas': pasoInventadas,
      'pares-oir': pasoParesOir,
      'pares-leer': pasoParesLeer,
      'dictado': pasoDictado
    }[paso] || pasoIntro)();
  }

  /* --- 1. Mirar y escuchar --------------------------------------------- */

  function pasoIntro() {
    var u = leccion.unidad;

    if (u.tipo === 'vocales') {
      var fila = el('div', { class: 'vocales-fila' });
      u.vocales.forEach(function (v) {
        var b = el('button', { class: 'vocal-btn' }, [
          el('span', { class: 'v', text: v.letra + ' ' + v.mayus }),
          el('span', { class: 'e', text: v.emoji }),
          el('span', { class: 'p', text: v.palabra })
        ]);
        b.addEventListener('click', function () {
          resaltar(b, Voz.secuencia([
            { text: v.letra, tipo: 'letra', pausa: 260 },
            { text: v.palabra, tipo: 'palabra' }
          ]));
        });
        fila.appendChild(b);
      });

      marco([
        el('div', { class: 'tarjeta' }, [
          fila,
          el('p', { class: 'truco', text: u.truco }),
          T.usarChino() && u.trucoZh ? el('p', { class: 'truco zh', text: u.trucoZh }) : null
        ]),
        el('div', { class: 'fila-botones' }, [
          el('button', {
            class: 'btn btn-audio',
            onclick: function () { narrar(u.truco); },
            text: '🔊 ' + T.t('otraVez')
          }),
          botonSiguiente()
        ])
      ], 'pasoLetra');
      return;
    }

    var muestra = u.letra;
    var titular = u.mayus
      ? el('div', { class: 'letra-gigante' }, [
          el('span', { class: 'min', text: u.letra }),
          el('span', { class: 'may', text: ' ' + u.mayus })
        ])
      : el('div', { class: 'letra-gigante', text: muestra });

    function presentar() {
      var partes = [];
      if (u.nombre) partes.push({ text: 'Se llama ' + u.nombre, tipo: 'frase', pausa: 400 });
      if (u.silabas && u.silabas.length) {
        partes.push({ text: 'Suena así', tipo: 'frase', pausa: 320 });
        u.silabas.slice(0, 6).forEach(function (s) {
          partes.push({ text: s, tipo: 'silaba', pausa: 300 });
        });
      }
      partes.push({ text: u.truco, tipo: 'frase' });
      return Voz.secuencia(partes);
    }

    marco([
      el('div', { class: 'tarjeta' }, [
        titular,
        u.nombre ? el('p', { class: 'dato' }, [
          document.createTextNode(T.t('seLlama') + ' '),
          el('b', { text: u.nombre })
        ]) : null,
        u.fonema ? el('p', { class: 'dato' }, [
          document.createTextNode(T.t('sonido') + ' '),
          el('b', { text: u.fonema })
        ]) : null,
        el('p', { class: 'truco', text: u.truco }),
        T.usarChino() && u.trucoZh ? el('p', { class: 'truco zh', text: u.trucoZh }) : null,
        avisoIngles(u.letra)
      ]),
      el('div', { class: 'fila-botones' }, [
        el('button', { class: 'btn btn-audio', onclick: presentar, text: '🔊 ' + T.t('otraVez') }),
        botonSiguiente()
      ])
    ], 'pasoLetra', null, presentar);
  }

  /*
   * Si esta letra suena distinto en inglés, avisamos AQUÍ, cuando se aprende,
   * y no en una unidad suelta al final: la interferencia aparece el primer día
   * en quien se sabe el abecedario en inglés.
   */
  function avisoIngles(letra) {
    if (!Avanzado || !letra) return null;
    if (Progreso.ajuste('ingles') === false) return null;   // no aprendió las letras en inglés
    var f = Avanzado.ingles.filter(function (x) { return x.letra === letra; })[0];
    if (!f) return null;
    return el('div', { class: 'aviso-ingles' }, [
      el('span', { text: '🇬🇧' }),
      el('div', {}, [
        el('p', { text: f.nota }),
        el('button', {
          class: 'btn', text: '🔊 ' + f.muestraEn + ' → ' + f.muestraEs,
          onclick: function () {
            if (!Voz.hayVozInglesa()) return decir(f.muestraEs, 'palabra');
            Voz.hablarEnIngles(f.muestraEn)
              .then(function () { return new Promise(function (r) { setTimeout(r, 400); }); })
              .then(function () { return decir(f.muestraEs, 'palabra'); });
          }
        })
      ])
    ]);
  }

  /* --- 2. Tocar cada sílaba -------------------------------------------- */

  function pasoSilabas() {
    var u = leccion.unidad;
    var silabas = u.silabas.slice(0, 12);
    var tocadas = {};

    var rejilla = el('div', { class: 'rejilla-silabas' });
    var siguiente = botonSiguiente('siguiente', false);
    var nodos = [];

    silabas.forEach(function (s) {
      var b = el('button', { class: 'silaba', text: s, 'aria-label': s });
      b.addEventListener('click', function () {
        resaltar(b, decir(s, 'silaba'));
        if (!tocadas[s]) {
          tocadas[s] = true;
          b.classList.add('tocada');
          if (Object.keys(tocadas).length === silabas.length) {
            siguiente.removeAttribute('disabled');
            setTimeout(function () { narrar(T.t('muyBien')); }, 500);
          }
        }
      });
      nodos.push(b);
      rejilla.appendChild(b);
    });

    marco([
      rejilla,
      el('div', { class: 'fila-botones' }, [
        el('button', {
          class: 'btn btn-audio', text: '🔊 ' + T.t('escuchar'),
          onclick: function () {
            Voz.secuencia(silabas.map(function (s, i) {
              return {
                text: s, tipo: 'silaba', pausa: 320,
                antes: function () { nodos[i].classList.add('sonando'); },
                despues: function () { nodos[i].classList.remove('sonando'); nodos[i].classList.add('tocada'); tocadas[s] = true; }
              };
            })).then(function () {
              if (Object.keys(tocadas).length === silabas.length) siguiente.removeAttribute('disabled');
            });
          }
        }),
        siguiente
      ])
    ], 'pasoSilabas', T.t('tocaTodas'));
  }

  /* --- 3. Escucha y toca la sílaba ------------------------------------- */

  function pasoQuizSilaba() {
    var u = leccion.unidad;
    var propias = u.silabas.slice();
    var previas = Curriculo.silabasHasta(Math.max(0, leccion.indice - 1));
    var rondas = Math.min(5, propias.length);
    var orden = mezclar(propias).slice(0, rondas);
    var i = 0;

    function ronda() {
      if (i >= orden.length) return siguientePaso();
      var objetivo = orden[i];
      var otras = tomar(propias, 3, [objetivo]);
      while (otras.length < 3 && previas.length) {
        var extra = tomar(previas, 1, [objetivo].concat(otras))[0];
        if (!extra) break;
        otras.push(extra);
      }
      var opciones = mezclar([objetivo].concat(otras));

      var rejilla = el('div', { class: 'rejilla-silabas' });
      opciones.forEach(function (s) {
        var b = el('button', { class: 'silaba', text: s });
        b.addEventListener('click', function () {
          if (s === objetivo) {
            b.classList.add('bien');
            decir('¡Muy bien! ' + objetivo, 'frase');
            i++;
            setTimeout(ronda, 1100);
          } else {
            b.classList.add('mal');
            setTimeout(function () { b.classList.remove('mal'); }, 500);
            Voz.secuencia([
              { text: 'No. Escucha otra vez', tipo: 'frase', pausa: 300 },
              { text: objetivo, tipo: 'silaba' }
            ]);
          }
        });
        rejilla.appendChild(b);
      });

      marco([
        el('div', { class: 'tarjeta' }, [
          el('button', {
            class: 'btn btn-principal btn-grande',
            text: '🔊 ' + T.t('escuchar'),
            onclick: function () { decir(objetivo, 'silaba'); }
          }),
          el('p', { class: 'dato', text: (i + 1) + ' / ' + orden.length })
        ]),
        rejilla
      ], 'pasoQuizSilaba', null, function () { decir(objetivo, 'silaba'); });
    }
    ronda();
  }

  /* --- 3b. ¿Por qué vocal empieza? (sólo unidad de vocales) ------------ */

  function pasoVocalInicial() {
    var u = leccion.unidad;
    var orden = mezclar(u.vocales.slice());
    var i = 0;

    function ronda() {
      if (i >= orden.length) return siguientePaso();
      var v = orden[i];
      var opciones = mezclar(u.vocales.slice());

      var rejilla = el('div', { class: 'rejilla-silabas' });
      opciones.forEach(function (o) {
        var b = el('button', { class: 'silaba', text: o.letra });
        b.addEventListener('click', function () {
          if (o.letra === v.letra) {
            b.classList.add('bien');
            decir('¡Sí! ' + v.palabra + ' empieza por ' + v.letra, 'frase');
            i++;
            setTimeout(ronda, 1600);
          } else {
            b.classList.add('mal');
            setTimeout(function () { b.classList.remove('mal'); }, 500);
            decir(v.palabra, 'palabra');
          }
        });
        rejilla.appendChild(b);
      });

      marco([
        el('div', { class: 'tarjeta' }, [
          el('div', { class: 'palabra-emoji', text: v.emoji }),
          el('button', {
            class: 'btn btn-principal',
            text: '🔊 ' + v.palabra,
            onclick: function () { decir(v.palabra, 'palabra'); }
          })
        ]),
        rejilla
      ], 'pasoQuizSilaba', 'Toca la vocal por la que empieza el dibujo',
         function () { decir(v.palabra, 'palabra'); });
    }
    ronda();
  }

  /* --- 4. Leer las palabras ------------------------------------------- */

  function pasoPalabras() {
    var u = leccion.unidad;
    var lista = u.palabras.slice(0, 8);
    var i = 0;

    function ver() {
      if (i >= lista.length) return siguientePaso();
      var palabra = lista[i][0];
      var emoji = lista[i][1];
      var trozos = Silabas.syllabify(palabra);
      var tonica = Silabas.stressIndex(trozos);

      var fila = el('div', { class: 'palabra-silabas' });
      var nodos = [];
      trozos.forEach(function (s, k) {
        var b = el('button', { class: 'trozo' + (k === tonica ? ' tonica' : ''), text: s });
        b.addEventListener('click', function () { resaltar(b, decir(s, 'silaba')); });
        nodos.push(b);
        fila.appendChild(b);
      });

      var entera = el('button', { class: 'btn palabra-entera', text: palabra });
      entera.addEventListener('click', function () { resaltar(entera, decir(palabra, 'palabra')); });

      function leerla() { return leerPorSilabas(palabra, nodos, entera); }

      marco([
        el('div', { class: 'palabra-tarjeta' }, [
          el('div', { class: 'palabra-emoji', text: emoji }),
          fila,
          entera,
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        el('div', { class: 'fila-botones' }, [
          el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('otraVez'), onclick: leerla }),
          el('button', {
            class: 'btn btn-principal',
            text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ver(); }
          })
        ])
      ], 'pasoPalabras', T.t('tocaParaOir'), leerla);
    }
    ver();
  }

  /* --- 5. Construir la palabra que has oído ---------------------------- */

  function pasoConstruir() {
    var u = leccion.unidad;
    var lista = mezclar(u.palabras.slice()).slice(0, 4);
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var palabra = lista[i][0];
      var emoji = lista[i][1];
      var trozos = Silabas.syllabify(palabra);
      var puestas = 0;

      var hueco = el('div', { class: 'construccion' });
      var banco = el('div', { class: 'rejilla-silabas' });

      /* Sílabas de la palabra + un par de señuelos de la misma unidad. */
      var senuelos = tomar(u.silabas || [], Math.min(2, Math.max(0, 5 - trozos.length)), trozos);
      var fichas = mezclar(trozos.concat(senuelos));

      fichas.forEach(function (s) {
        var b = el('button', { class: 'silaba', text: s });
        b.addEventListener('click', function () {
          if (b.disabled) return;
          if (s === trozos[puestas]) {
            b.disabled = true;
            b.classList.add('bien');
            hueco.appendChild(el('span', { class: 'hueco', text: s }));
            puestas++;
            decir(s, 'silaba');
            if (puestas === trozos.length) {
              confeti();
              setTimeout(function () {
                Voz.secuencia([
                  { text: '¡Muy bien!', tipo: 'frase', pausa: 250 },
                  { text: palabra, tipo: 'palabra' }
                ]);
              }, 400);
              i++;
              setTimeout(ronda, 2200);
            }
          } else {
            b.classList.add('mal');
            setTimeout(function () { b.classList.remove('mal'); }, 500);
            leerPorSilabas(palabra);
          }
        });
        banco.appendChild(b);
      });

      function escuchar() { return leerPorSilabas(palabra); }

      marco([
        el('div', { class: 'tarjeta' }, [
          el('div', { class: 'palabra-emoji', text: emoji }),
          el('button', {
            class: 'btn btn-principal', text: '🔊 ' + T.t('escuchar'), onclick: escuchar
          }),
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        hueco,
        banco
      ], 'pasoConstruir', T.t('tocaSilabas'), escuchar);
    }
    ronda();
  }

  /* --- 6. Lee la palabra y elige el dibujo ----------------------------- */
  /*  Sin audio de partida: aquí hay que leer de verdad.                   */

  function pasoEligeDibujo() {
    var u = leccion.unidad;
    var banco = u.palabras.slice();
    var lista = mezclar(banco).slice(0, Math.min(5, banco.length));
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var par = lista[i];
      var palabra = par[0];
      var otras = mezclar(banco.filter(function (p) { return p[1] !== par[1]; })).slice(0, 2);
      var opciones = mezclar([par].concat(otras));

      var rejilla = el('div', { class: 'rejilla-silabas' });
      opciones.forEach(function (o) {
        var b = el('button', { class: 'silaba', style: 'font-size:2.6rem', text: o[1] });
        b.addEventListener('click', function () {
          if (o[0] === palabra) {
            b.classList.add('bien');
            decir('¡Sí! ' + palabra, 'frase');
            i++;
            setTimeout(ronda, 1400);
          } else {
            b.classList.add('mal');
            setTimeout(function () { b.classList.remove('mal'); }, 500);
            narrar('Ese no. Lee otra vez.');
          }
        });
        rejilla.appendChild(b);
      });

      marco([
        el('div', { class: 'tarjeta' }, [
          el('div', { class: 'palabra-entera', text: palabra }),
          el('button', {
            class: 'btn', text: '🔊 ' + T.t('escuchar'),
            onclick: function () { leerPorSilabas(palabra); }
          }),
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        rejilla
      ], 'pasoQuizPal', 'Lee la palabra y toca el dibujo');
    }
    ronda();
  }


  /* ------------------------------------------------ leer en voz alta ---- */

  function estrellasTexto(n) {
    n = Math.max(0, Math.min(3, n));
    return new Array(n + 1).join('★') + new Array(3 - n + 1).join('☆');
  }

  function micDisponible() {
    return Escucha.soportado && Escucha.contextoSeguro() && Progreso.ajuste('micro') !== false;
  }

  /*
   * Bloque de lectura en voz alta: el niño toca el micrófono, lee, y ve qué
   * palabras le han salido bien. Sirve igual para una palabra suelta, una
   * frase o una línea de un cuento.
   *
   * Dos decisiones importantes:
   *   - Aquí la app NO lee el texto antes. Si lo hiciera, bastaría con repetir
   *     de oído y no haría falta leer, que es justo lo que se quiere medir.
   *     El botón 🔊 está ahí para cuando se atasca, no antes de intentarlo.
   *   - Todo veredicto se dice en voz alta: no puede leer su propia corrección.
   */
  function bloqueMicro(objetivo, opciones) {
    opciones = opciones || {};
    var caja = el('div', { class: 'micro' });

    function vaciar() { caja.innerHTML = ''; }

    function botonMicro(clase) {
      return el('button', {
        class: 'micro-btn' + (clase ? ' ' + clase : ''),
        'aria-label': T.t('tocaYLee')
      }, [el('span', { class: 'micro-icono', text: '🎤' })]);
    }

    function leerObjetivo() {
      return opciones.silabas === false
        ? decir(objetivo, 'frase')
        : leerPorSilabas(objetivo, opciones.nodos);
    }

    function reposo(aviso) {
      vaciar();
      var boton = botonMicro();
      boton.addEventListener('click', empezar);
      caja.appendChild(boton);
      caja.appendChild(el('p', { class: 'micro-pie' }, etiqueta('tocaYLee')));
      caja.appendChild(el('div', { class: 'fila-botones' }, [
        el('button', { class: 'btn', text: '🔊 ' + T.t('escuchalo'), onclick: leerObjetivo }),
        opciones.alAcabar ? el('button', {
          class: 'btn', text: '⏭️ ' + T.t('saltar'),
          onclick: function () { opciones.alAcabar(null); }
        }) : null
      ]));
      if (aviso) caja.appendChild(el('p', { class: 'micro-error', text: aviso }));
    }

    function empezar() {
      Voz.parar();     // callar primero: si no, la app se oye a sí misma
      vaciar();
      caja.appendChild(botonMicro('escuchando'));
      caja.appendChild(el('p', { class: 'micro-pie' }, etiqueta('teEscucho')));
      var eco = el('p', { class: 'transcripcion', text: '' });
      caja.appendChild(eco);

      /*
       * Leyendo un cuento entero el niño se para entre línea y línea, y el
       * reconocedor tomaría esa pausa por final. En modo continuo es él quien
       * dice cuándo ha terminado, y de paso medimos cuánto ha tardado.
       */
      if (opciones.continuo) {
        caja.appendChild(el('button', {
          class: 'btn btn-principal btn-grande',
          text: '⏹️ ' + T.t('yaTermine'),
          onclick: function () { Escucha.terminar(); }
        }));
      }

      Escucha.escuchar({
        continuo: !!opciones.continuo,
        maxMs: opciones.continuo ? 180000 : (objetivo.length > 26 ? 15000 : 9000),
        onParcial: function (t) { eco.textContent = t; }
      }).then(function (r) {
        if (!r.ok) {
          var m = Escucha.mensaje(r.error);
          reposo(m);
          narrar(m);
          return;
        }
        mostrar(Evaluar.puntuar(objetivo, r.textos), r.segundos);
      });
    }

    function mostrar(res, segundos) {
      vaciar();

      /* Lo que falló se guarda: el repaso dejará de ser aleatorio. */
      if (opciones.unidad) {
        if (res.estrellas >= 3) Progreso.apuntarAcierto(opciones.unidad);
        else Progreso.apuntarFallo(res.pista ? res.pista.clave : 'otra', opciones.unidad);
      }

      /* Velocidad, sólo cuando se ha leído un texto de corrido. */
      var ppm = null;
      if (opciones.continuo && segundos > 2) {
        var cuantas = objetivo.split(/\s+/).filter(Boolean).length;
        ppm = Math.round(cuantas / (segundos / 60));
        if (ppm > 400) ppm = null;      // medida absurda: mejor no enseñarla
      }

      var marcada = el('p', { class: 'lectura-marcada' });
      res.palabras.forEach(function (p, i) {
        if (i) marcada.appendChild(document.createTextNode(' '));
        marcada.appendChild(el('span', { class: 'pal-' + p.estado, text: p.texto }));
      });

      var base = Evaluar.animo(res.estrellas) + (res.pista ? ' ' + res.pista.texto : '');

      /* En un par mínimo, decir la otra palabra no es un fallo cualquiera:
         conviene nombrarlo, que es justo lo que el ejercicio entrena. */
      if (opciones.rival && res.oido &&
          Evaluar.similitud(Evaluar.fonetica(res.oido), Evaluar.fonetica(opciones.rival)) >
          Evaluar.similitud(Evaluar.fonetica(res.oido), Evaluar.fonetica(objetivo))) {
        base = 'Has dicho «' + opciones.rival + '», pero pone «' + objetivo + '». Mira bien la diferencia.';
      }
      var comentario = el('p', { class: 'comentario', text: base });

      var marcaPpm = null;
      if (ppm) {
        var previas = Progreso.lecturas().filter(function (l) { return l.texto === opciones.idTexto; });
        var mejorAntes = previas.reduce(function (a, l) { return Math.max(a, l.ppm); }, 0);
        Progreso.apuntarLectura({
          texto: opciones.idTexto || objetivo.slice(0, 20),
          ppm: ppm, nota: res.nota, intento: previas.length + 1
        });
        marcaPpm = el('div', { class: 'marca' }, [
          el('span', { class: 'ppm-numero', text: String(ppm) }),
          el('span', { class: 'ppm-texto', text: T.t('ppm') }),
          ppm > mejorAntes && mejorAntes > 0
            ? el('span', { class: 'ppm-mejora', text: '🎉 ' + T.t('mejorMarca') })
            : (mejorAntes ? el('span', { class: 'ppm-mejora', text: T.t('mejorPpm') + ': ' + mejorAntes }) : null)
        ]);
      }

      caja.appendChild(el('div', { class: 'veredicto v' + res.estrellas }, [
        el('div', { class: 'estrellas-ganadas', text: estrellasTexto(res.estrellas) }),
        marcaPpm,
        marcada,
        res.oido ? el('p', { class: 'oido', text: T.t('heOido') + ': «' + res.oido + '»' }) : null,
        comentario
      ]));

      caja.appendChild(el('div', { class: 'fila-botones' }, [
        el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('escuchalo'), onclick: leerObjetivo }),
        el('button', { class: 'btn', text: '🎤 ' + T.t('otraVez'), onclick: empezar }),
        opciones.alAcabar ? el('button', {
          class: 'btn btn-principal', text: '➡️ ' + T.t('siguiente'),
          onclick: function () { opciones.alAcabar(res); }
        }) : null
      ]));

      /*
       * Si el navegador trae modelo propio, le damos una ventana corta para
       * mejorar el comentario. Se dice en voz alta lo mismo que se muestra,
       * venga de donde venga: el niño no puede leerlo por su cuenta.
       */
      Promise.race([
        Modelo.comentar({ objetivo: objetivo, oido: res.oido, nota: res.nota,
                          pista: res.pista ? res.pista.texto : '' }),
        new Promise(function (r) { setTimeout(function () { r(null); }, 1400); })
      ]).then(function (delModelo) {
        var texto = base;
        if (delModelo && caja.contains(comentario)) {
          texto = delModelo;
          comentario.textContent = delModelo;
          comentario.appendChild(el('span', { class: 'sello-modelo', text: ' ✨' }));
        }
        return narrar(texto);
      }).then(function () {
        if (res.estrellas < 2) return leerObjetivo();
      });
    }

    reposo(null);
    return caja;
  }

  /* --- 7. Léelo tú y compruébate --------------------------------------- */

  function pasoLeerTu() {
    var u = leccion.unidad;
    var lista = mezclar(u.palabras.slice()).slice(0, 4);
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var palabra = lista[i][0];
      var emoji = lista[i][1];
      var trozos = Silabas.syllabify(palabra);

      var fila = el('div', { class: 'palabra-silabas' });
      var nodos = [];
      trozos.forEach(function (s) {
        var n = el('span', { class: 'trozo', text: s });
        nodos.push(n);
        fila.appendChild(n);
      });

      /* Con micrófono, la app escucha y puntúa; sin él, se autoevalúa. */
      if (micDisponible()) {
        marco([
          el('div', { class: 'palabra-tarjeta' }, [
            el('div', { class: 'palabra-emoji', text: emoji }),
            fila,
            el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
          ]),
          bloqueMicro(palabra, {
            nodos: nodos,
            alAcabar: function () { i++; ronda(); }
          })
        ], 'pasoLeerVoz', T.t('tocaYLee'));
        return;
      }

      var comprobado = false;
      var acciones = el('div', { class: 'fila-botones' });

      function mostrarValoracion() {
        acciones.innerHTML = '';
        acciones.appendChild(el('button', {
          class: 'btn btn-principal',
          text: '😀 ' + T.t('loDijeBien'),
          onclick: function () { i++; ronda(); }
        }));
        acciones.appendChild(el('button', {
          class: 'btn',
          text: '🔁 ' + T.t('otraVezLeer'),
          onclick: function () { leerPorSilabas(palabra, nodos); }
        }));
      }

      acciones.appendChild(el('button', {
        class: 'btn btn-principal btn-grande',
        text: '🔊 ' + T.t('comprobar'),
        onclick: function () {
          leerPorSilabas(palabra, nodos).then(function () {
            if (!comprobado) { comprobado = true; mostrarValoracion(); }
          });
        }
      }));

      marco([
        el('div', { class: 'palabra-tarjeta' }, [
          el('div', { class: 'palabra-emoji', text: emoji }),
          fila,
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        acciones
      ], 'pasoLeerTu', T.t('ahoraLeeTu'));
    }
    ronda();
  }

  /* --- 8. Frases y textos ---------------------------------------------- */

  /* Convierte una frase en palabras y sílabas que se pueden tocar. */
  function frasePintada(texto, separar) {
    var caja = el('div', { class: 'frase' });
    var palabras = [];
    Silabas.tokenize(texto).forEach(function (tok) {
      if (tok.type !== 'word') {
        caja.appendChild(document.createTextNode(tok.text));
        return;
      }
      var span = el('span', { class: 'palabra-tocable' });
      if (separar) {
        tok.syllables.forEach(function (s, k) {
          var sil = el('span', { class: 'sil ' + (k % 2 ? 'sil-b' : 'sil-a'), text: s });
          sil.addEventListener('click', function (ev) {
            ev.stopPropagation();
            resaltar(sil, decir(s, 'silaba'));
          });
          span.appendChild(sil);
          if (k < tok.syllables.length - 1) span.appendChild(el('span', { class: 'sep', text: '·' }));
        });
      } else {
        span.textContent = tok.text;
      }
      span.addEventListener('click', function () { resaltar(span, decir(tok.text, 'palabra')); });
      caja.appendChild(span);
      palabras.push({ nodo: span, texto: tok.text });
    });
    return { caja: caja, palabras: palabras };
  }

  function leerFrase(pintada, texto) {
    return Voz.secuencia(pintada.palabras.map(function (p) {
      return {
        text: p.texto, tipo: 'frase', pausa: 90,
        antes: function () { p.nodo.classList.add('sonando'); },
        despues: function () { p.nodo.classList.remove('sonando'); }
      };
    })).then(function () { return decir(texto, 'frase'); });
  }

  function pasoFrases() {
    var u = leccion.unidad;
    var lista = u.frases.slice();
    var i = 0;
    var separar = true;

    function ver() {
      if (i >= lista.length) return siguientePaso();
      var texto = lista[i];
      var pintada = frasePintada(texto, separar);
      var zonaMicro = el('div', {});

      marco([
        pintada.caja,
        el('div', { class: 'fila-botones' }, [
          el('button', {
            class: 'btn btn-audio', text: '🔊 ' + T.t('escuchar'),
            onclick: function () { leerFrase(pintada, texto); }
          }),
          el('button', {
            class: 'btn', text: separar ? '🔗 ' + T.t('verJunto') : '✂️ ' + T.t('verSilabas'),
            onclick: function () { separar = !separar; ver(); }
          }),
          micDisponible() ? el('button', {
            class: 'btn', text: '🎤 ' + T.t('leerlaTu'),
            onclick: function (ev) {
              Voz.parar();
              ev.currentTarget.disabled = true;
              zonaMicro.innerHTML = '';
              zonaMicro.appendChild(bloqueMicro(texto, { silabas: false }));
              zonaMicro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }) : null,
          el('button', {
            class: 'btn btn-principal',
            text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ver(); }
          })
        ]),
        zonaMicro,
        el('p', { class: 'dato', style: 'text-align:center', text: (i + 1) + ' / ' + lista.length })
      ], 'pasoFrases', T.t('tocaPalabra'));
    }
    ver();
  }

  function pasoTexto() {
    var u = leccion.unidad;
    var lista = u.textos;
    var i = 0;

    function ver() {
      if (i >= lista.length) return siguientePaso();
      var cuento = lista[i];
      var pintadas = cuento.lineas.map(function (linea) { return frasePintada(linea, false); });

      var caja = el('div', {});
      caja.appendChild(el('div', { class: 'palabra-emoji', style: 'text-align:center', text: cuento.emoji }));
      caja.appendChild(el('h2', { style: 'text-align:center', text: cuento.titulo }));
      pintadas.forEach(function (p) { caja.appendChild(p.caja); });

      function leerTodo() {
        var k = 0;
        function siguiente() {
          if (k >= pintadas.length) return Promise.resolve();
          var p = pintadas[k];
          var linea = cuento.lineas[k];
          k++;
          return leerFrase(p, linea).then(function () {
            return new Promise(function (r) { setTimeout(r, 400); });
          }).then(siguiente);
        }
        return siguiente();
      }

      marco([
        caja,
        el('div', { class: 'fila-botones' }, [
          el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('escuchar'), onclick: leerTodo }),
          micDisponible() ? el('button', {
            class: 'btn', text: '🎤 ' + T.t('leerlaTu'),
            onclick: function () { Voz.parar(); porLineas(cuento, 0); }
          }) : null,
          el('button', {
            class: 'btn btn-principal',
            text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ver(); }
          })
        ])
      ], 'pasoTexto', T.t('tocaPalabra'));
    }

    /*
     * Leer el cuento entero de una vez es demasiado para quien empieza, y el
     * reconocedor corta en la primera pausa. Se lee línea a línea.
     */
    function porLineas(cuento, k) {
      if (k >= cuento.lineas.length) return ver();
      var linea = cuento.lineas[k];
      var pintada = frasePintada(linea, false);

      marco([
        el('p', { class: 'dato', style: 'text-align:center',
                  text: cuento.emoji + '  ' + (k + 1) + ' / ' + cuento.lineas.length }),
        pintada.caja,
        bloqueMicro(linea, {
          silabas: false,
          alAcabar: function () { porLineas(cuento, k + 1); }
        })
      ], 'pasoLeerVoz', T.t('tocaYLee'));
    }

    ver();
  }

  /* ------------------------------------------ los falsos amigos --------- */

  /*
   * La misma letra, dicha primero con voz inglesa y luego con voz española.
   * El contraste hay que OÍRLO: leer "en inglés suena distinto" no corrige
   * nada en alguien que aprendió el abecedario en inglés.
   */
  function pasoIngles() {
    var lista = Avanzado.ingles;
    var i = 0;

    function ver() {
      if (i >= lista.length) return siguientePaso();
      var f = lista[i];
      var hayIngles = Voz.hayVozInglesa();

      function oirAmbas() {
        if (!hayIngles) return decir(f.muestraEs, 'palabra');
        return Voz.hablarEnIngles(f.muestraEn)
          .then(function () { return new Promise(function (r) { setTimeout(r, 420); }); })
          .then(function () { return decir(f.muestraEs, 'palabra'); });
      }

      marco([
        el('div', { class: 'tarjeta' }, [
          el('div', { class: 'letra-gigante', text: f.letra }),
          el('div', { class: 'contraste' }, [
            el('button', {
              class: 'btn lado-en', disabled: hayIngles ? null : 'disabled',
              onclick: function () { Voz.hablarEnIngles(f.muestraEn); }
            }, [
              el('span', { class: 'bandera', text: '🇬🇧' }),
              el('span', { class: 'etq' }, [
                el('span', { class: 'chico', text: T.t('enIngles') }),
                el('b', { text: f.muestraEn })
              ])
            ]),
            el('button', {
              class: 'btn lado-es',
              onclick: function () { decir(f.muestraEs, 'palabra'); }
            }, [
              el('span', { class: 'bandera', text: '🇪🇸' }),
              el('span', { class: 'etq' }, [
                el('span', { class: 'chico', text: T.t('enEspanol') }),
                el('b', { text: f.muestraEs })
              ])
            ])
          ]),
          el('p', { class: 'truco', text: f.nota }),
          hayIngles ? null : el('p', { class: 'dato', text: T.t('sinVozInglesa') }),
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        el('div', { class: 'fila-botones' }, [
          el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('otraVez'), onclick: oirAmbas }),
          el('button', {
            class: 'btn btn-principal', text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ver(); }
          })
        ])
      ], 'pasoIngles', f.nota, function () {
        return oirAmbas();
      });
    }
    ver();
  }

  /* ------------------------------------------ palabras inventadas ------- */

  /*
   * No existen, así que no hay memoria ni forma global que valga: o las
   * descifra o no salen. Con micrófono se puntúa de verdad; sin él, se
   * autoevalúa como en el resto de la app.
   */
  function pasoInventadas() {
    var lista = [];
    Avanzado.inventadas.forEach(function (n) {
      lista = lista.concat(mezclar(n.lista).slice(0, 3));
    });
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var palabra = lista[i];
      var trozos = Silabas.syllabify(palabra);

      var fila = el('div', { class: 'palabra-silabas' });
      var nodos = [];
      trozos.forEach(function (t) {
        var n = el('span', { class: 'trozo', text: t });
        nodos.push(n);
        fila.appendChild(n);
      });

      var tarjeta = el('div', { class: 'palabra-tarjeta' }, [
        el('div', { class: 'palabra-emoji', text: '👽' }),
        fila,
        el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
      ]);

      if (micDisponible()) {
        marco([
          tarjeta,
          bloqueMicro(palabra, {
            nodos: nodos,
            unidad: 'inventadas',
            alAcabar: function () { i++; ronda(); }
          })
        ], 'pasoInventadas', T.t('tocaYLee'));
        return;
      }

      marco([
        tarjeta,
        el('div', { class: 'fila-botones' }, [
          el('button', {
            class: 'btn btn-audio', text: '🔊 ' + T.t('comprobar'),
            onclick: function () { leerPorSilabas(palabra, nodos); }
          }),
          el('button', {
            class: 'btn btn-principal', text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ronda(); }
          })
        ])
      ], 'pasoInventadas', T.t('ahoraLeeTu'));
    }
    ronda();
  }

  /* ----------------------------------------------- pares mínimos -------- */

  /* Oye una de las dos y toca cuál era: obliga a mirar dentro de la palabra. */
  function pasoParesOir() {
    var lista = mezclar(Avanzado.pares.slice()).slice(0, 6);
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var par = lista[i];
      var cual = Math.random() < 0.5 ? 'a' : 'b';
      var objetivo = par[cual][0];
      var opciones = mezclar([par.a, par.b]);

      var rejilla = el('div', { class: 'rejilla-silabas' });
      opciones.forEach(function (o) {
        var b = el('button', { class: 'silaba', style: 'font-size:1.8rem' }, [
          el('span', { style: 'display:block;font-size:2rem', text: o[1] }),
          el('span', { text: o[0] })
        ]);
        b.addEventListener('click', function () {
          if (o[0] === objetivo) {
            b.classList.add('bien');
            Progreso.apuntarAcierto('pares');
            decir('¡Sí! ' + objetivo, 'frase');
            i++;
            setTimeout(ronda, 1300);
          } else {
            b.classList.add('mal');
            setTimeout(function () { b.classList.remove('mal'); }, 500);
            Progreso.apuntarFallo('par-minimo', 'pares');
            Voz.secuencia([
              { text: 'No. Cambian en ' + par.diferencia, tipo: 'frase', pausa: 300 },
              { text: objetivo, tipo: 'palabra' }
            ]);
          }
        });
        rejilla.appendChild(b);
      });

      marco([
        el('div', { class: 'tarjeta' }, [
          el('button', {
            class: 'btn btn-principal btn-grande', text: '🔊 ' + T.t('escuchar'),
            onclick: function () { decir(objetivo, 'palabra'); }
          }),
          el('p', { class: 'dato', text: T.t('enQueCambian') + ': ' + par.diferencia }),
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        rejilla
      ], 'pasoPares', null, function () { decir(objetivo, 'palabra'); });
    }
    ronda();
  }

  /* Ahora al revés: lee tú una de las dos y a ver cuál te sale. */
  function pasoParesLeer() {
    var lista = mezclar(Avanzado.pares.slice()).slice(0, 4);
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var par = lista[i];
      var cual = Math.random() < 0.5 ? 'a' : 'b';
      var objetivo = par[cual][0];
      var otra = par[cual === 'a' ? 'b' : 'a'][0];

      var tarjeta = el('div', { class: 'palabra-tarjeta' }, [
        el('div', { class: 'palabra-emoji', text: par[cual][1] }),
        el('div', { class: 'palabra-entera', text: objetivo }),
        el('p', { class: 'dato', text: 'No es "' + otra + '". Fíjate en ' + par.diferencia + '.' }),
        el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
      ]);

      if (!micDisponible()) {
        marco([tarjeta, el('div', { class: 'fila-botones' }, [
          el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('comprobar'),
            onclick: function () { decir(objetivo, 'palabra'); } }),
          el('button', { class: 'btn btn-principal', text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ronda(); } })
        ])], 'pasoLeerVoz', T.t('ahoraLeeTu'));
        return;
      }

      marco([
        tarjeta,
        bloqueMicro(objetivo, {
          unidad: 'pares',
          rival: otra,          /* si dice la otra, hay que decírselo */
          alAcabar: function () { i++; ronda(); }
        })
      ], 'pasoLeerVoz', T.t('tocaYLee'));
    }
    ronda();
  }

  /* ----------------------------------------------------- dictado -------- */

  /*
   * Oye y escribe. Es la otra mitad de leer: escribir obliga a poner las
   * letras en orden, sin el atajo de reconocer la palabra entera de un
   * vistazo. Se distingue el error de lectura ("chirafa" por "jirafa") de la
   * duda ortográfica legítima ("baca" por "vaca"), que suena igual.
   */
  function pasoDictado() {
    var lista = [];
    Avanzado.dictado.forEach(function (n) {
      lista = lista.concat(mezclar(n.lista).slice(0, 3));
    });
    var i = 0;

    function ronda() {
      if (i >= lista.length) return siguientePaso();
      var palabra = lista[i];

      var campo = el('input', {
        type: 'text', class: 'campo-codigo campo-dictado', placeholder: T.t('escribeAqui'),
        autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', autocapitalize: 'off'
      });
      var veredicto = el('div', {});

      function decirla() { return decir(palabra, 'palabra'); }

      function revisar() {
        var escrito = (campo.value || '').trim().toLowerCase();
        if (!escrito) return campo.focus();
        var exacto = escrito === palabra.toLowerCase();
        var suena = Evaluar.fonetica(escrito) === Evaluar.fonetica(palabra);

        veredicto.innerHTML = '';
        if (exacto) {
          Progreso.apuntarAcierto('dictado');
          veredicto.appendChild(el('div', { class: 'veredicto v3' }, [
            el('div', { class: 'estrellas-ganadas', text: '★★★' }),
            el('p', { class: 'comentario', text: '¡Perfecto! ' + palabra })
          ]));
          narrar('¡Perfecto!');
          confeti();
        } else if (suena) {
          /* Lo ha oído bien: el fallo es de ortografía, no de lectura. */
          Progreso.apuntarFallo('ortografia', 'dictado');
          veredicto.appendChild(el('div', { class: 'veredicto v2' }, [
            el('div', { class: 'estrellas-ganadas', text: '★★☆' }),
            el('p', { class: 'lectura-marcada' }, [
              el('span', { class: 'pal-casi', text: escrito }),
              document.createTextNode(' → '),
              el('span', { class: 'pal-bien', text: palabra })
            ]),
            el('p', { class: 'comentario', text: T.t('ortografia') + '.' })
          ]));
          narrar(T.t('ortografia') + '. Se escribe ' + palabra);
        } else {
          Progreso.apuntarFallo('dictado-mal', 'dictado');
          veredicto.appendChild(el('div', { class: 'veredicto v0' }, [
            el('div', { class: 'estrellas-ganadas', text: '★☆☆' }),
            el('p', { class: 'lectura-marcada' }, [
              el('span', { class: 'pal-mal', text: escrito || '—' }),
              document.createTextNode(' → '),
              el('span', { class: 'pal-bien', text: palabra })
            ])
          ]));
          Voz.secuencia([
            { text: 'Escucha otra vez', tipo: 'frase', pausa: 260 },
            { text: palabra, tipo: 'palabra' }
          ]);
        }
        veredicto.appendChild(el('div', { class: 'fila-botones' }, [
          el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('escuchar'), onclick: decirla }),
          el('button', {
            class: 'btn btn-principal', text: '➡️ ' + T.t('siguiente'),
            onclick: function () { Voz.parar(); i++; ronda(); }
          })
        ]));
      }

      campo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') revisar(); });

      marco([
        el('div', { class: 'tarjeta' }, [
          el('button', {
            class: 'btn btn-principal btn-grande', text: '🔊 ' + T.t('escuchar'), onclick: decirla
          }),
          el('p', { class: 'dato', text: (i + 1) + ' / ' + lista.length })
        ]),
        campo,
        el('button', { class: 'btn btn-grande', text: '✅ ' + T.t('revisar'), onclick: revisar }),
        veredicto
      ], 'pasoDictado', null, decirla);

      setTimeout(function () { campo.focus(); }, 500);
    }
    ronda();
  }

  /* ------------------------------------------------------- cuentos ------ */

  function leidoCuento(c) { return Progreso.unidadCompleta('cuento:' + c.id); }

  /* La biblioteca, ordenada por nivel: textos cada vez más largos. */
  function verBiblioteca() {
    vista = { nombre: 'biblioteca' };
    var bloques = [];

    [1, 2, 3].forEach(function (n) {
      var lista = Avanzado.cuentosDeNivel(n);
      if (!lista.length) return;
      bloques.push(el('h2', { class: 'nivel-titulo', text: T.t('nivel') + ' ' + n }));
      var rejilla = el('div', { class: 'rejilla-cuentos' });
      lista.forEach(function (c) {
        var palabras = c.lineas.join(' ').split(/\s+/).length;
        var marcas = Progreso.lecturas().filter(function (l) { return l.texto === c.id; });
        var mejor = marcas.reduce(function (a, l) { return Math.max(a, l.ppm); }, 0);
        rejilla.appendChild(el('button', {
          class: 'cuento-btn' + (leidoCuento(c) ? ' leido' : ''),
          onclick: function () { abrirCuento(c); }
        }, [
          el('span', { class: 'cuento-emo', text: c.emoji }),
          el('span', { class: 'cuento-titulo', text: c.titulo }),
          el('span', { class: 'cuento-dato', text: palabras + ' palabras' +
            (mejor ? ' · ' + mejor + ' ppm' : '') }),
          leidoCuento(c) ? el('span', { class: 'hecha', text: '✓' }) : null
        ]));
      });
      bloques.push(rejilla);
    });

    pintar([
      barra(T.t('biblioteca'), verPortada),
      el('section', { style: '--u: var(--c4)' }, bloques)
    ]);
  }

  /*
   * Un cuento se lee tres veces, no una. La lectura repetida es lo que
   * convierte descifrar en leer: la primera vez cuesta, la tercera sale
   * suelta, y ver su propia velocidad subir motiva más que cualquier estrella.
   */
  function abrirCuento(c) {
    Progreso.marcarDia();
    vista = { nombre: 'cuento' };
    var texto = c.lineas.join(' ');
    var pintadas = c.lineas.map(function (linea) { return frasePintada(linea, false); });

    var cuerpo = el('div', {});
    cuerpo.appendChild(el('div', { class: 'palabra-emoji', style: 'text-align:center', text: c.emoji }));
    cuerpo.appendChild(el('h2', { style: 'text-align:center;margin:4px 0 14px', text: c.titulo }));
    pintadas.forEach(function (p) { cuerpo.appendChild(p.caja); });

    function leerTodo() {
      var k = 0;
      function seguir() {
        if (k >= pintadas.length) return Promise.resolve();
        var p = pintadas[k], linea = c.lineas[k];
        k++;
        return leerFrase(p, linea)
          .then(function () { return new Promise(function (r) { setTimeout(r, 380); }); })
          .then(seguir);
      }
      return seguir();
    }

    var zonaMicro = el('div', {});

    var acciones = el('div', { class: 'fila-botones' }, [
      el('button', { class: 'btn btn-audio', text: '🔊 ' + T.t('escuchar'), onclick: leerTodo }),
      micDisponible() ? el('button', {
        class: 'btn btn-principal', text: '⏱️ ' + T.t('leerYCronometrar'),
        onclick: function (ev) {
          Voz.parar();
          ev.currentTarget.disabled = true;
          zonaMicro.innerHTML = '';
          zonaMicro.appendChild(bloqueMicro(texto, {
            silabas: false, continuo: true, idTexto: c.id, unidad: 'lectura',
            alAcabar: function () { preguntaCuento(c); }
          }));
          zonaMicro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }) : null,
      el('button', {
        class: 'btn', text: '❓ ' + T.t('preguntaTitulo'),
        onclick: function () { preguntaCuento(c); }
      })
    ]);

    pintar([
      barra(c.titulo, verBiblioteca),
      el('section', { style: '--u: var(--c4)' }, [
        el('div', { class: 'enunciado' }, [
          el('button', {
            class: 'btn btn-icono btn-audio', text: '🔊',
            onclick: function () { narrar(T.t('tocaPalabra')); }
          }),
          el('div', { class: 'txt' }, etiqueta('tocaPalabra'))
        ]),
        cuerpo, acciones, zonaMicro
      ])
    ]);
  }

  /*
   * La pregunta no es un adorno: como el niño ya habla español, si descifró
   * bien la acierta sin esfuerzo. Fallarla significa que leyó mal, no que no
   * entienda. Es un detector de lectura disfrazado de cuento.
   */
  function preguntaCuento(c) {
    Voz.parar();
    var p = c.pregunta;
    var opciones = mezclar(p.opciones.map(function (t, i) {
      return { texto: t, buena: i === p.correcta };
    }));

    var lista = el('div', { class: 'opciones-pregunta' });
    var resuelta = false;

    opciones.forEach(function (o) {
      var b = el('button', { class: 'opcion', text: o.texto });
      b.addEventListener('click', function () {
        if (resuelta) return;
        if (o.buena) {
          resuelta = true;
          b.classList.add('bien');
          Progreso.completarUnidad('cuento:' + c.id);
          Progreso.completarPaso('cuento:' + c.id, 'comprension', 2);
          confeti();
          mostrarMoraleja(c);
        } else {
          b.classList.add('mal');
          Progreso.apuntarFallo('comprension', 'lectura');
          narrar('Ésa no. Vuelve a leer el cuento y fíjate.');
        }
      });
      lista.appendChild(b);
    });

    function mostrarMoraleja(c) {
      var caja = el('div', { class: 'moraleja' }, [
        el('span', { class: 'moraleja-icono', text: '💡' }),
        el('p', { class: 'moraleja-titulo', text: T.t('moraleja') }),
        el('p', { class: 'moraleja-texto', text: c.moraleja })
      ]);
      lista.parentNode.appendChild(caja);
      lista.parentNode.appendChild(el('div', { class: 'fila-botones' }, [
        el('button', { class: 'btn', text: '📚 ' + T.t('biblioteca'), onclick: verBiblioteca }),
        el('button', {
          class: 'btn btn-principal', text: '🔁 ' + T.t('otraVezMasRapido'),
          onclick: function () { abrirCuento(c); }
        })
      ]));
      Voz.secuencia([
        { text: '¡Muy bien!', tipo: 'frase', pausa: 300 },
        { text: T.t('moraleja') + ': ' + c.moraleja, tipo: 'frase' }
      ]);
    }

    var seccion = el('section', { style: '--u: var(--c4)' }, [
      el('div', { class: 'enunciado' }, [
        el('button', {
          class: 'btn btn-icono btn-audio', text: '🔊',
          onclick: function () { narrar(p.texto); }
        }),
        el('div', { class: 'txt' }, etiqueta('preguntaTitulo'))
      ]),
      el('div', { class: 'tarjeta' }, [
        el('div', { class: 'palabra-emoji', text: c.emoji }),
        el('p', { class: 'pregunta-texto', text: p.texto })
      ]),
      lista
    ]);

    pintar([barra(c.titulo, function () { abrirCuento(c); }), seccion]);
    setTimeout(function () { narrar(p.texto); }, 300);
  }

  /* ------------------------------------------------- cómo va la cosa ---- */

  /*
   * Panel para el adulto. No es para el niño: son los datos que hacen falta
   * para saber dónde está sin tener que interrogarle.
   */
  function verComoVa() {
    var e = Progreso.estadisticas(Curriculo.unidades);
    var hoja = el('div', { class: 'hoja' });
    hoja.addEventListener('click', function (ev) { if (ev.target === hoja) hoja.remove(); });
    var panel = el('div', { class: 'hoja-panel' });

    panel.appendChild(el('h2', { style: 'margin:0 0 4px', text: '👨‍👩‍👦 ' + T.t('comoVa') }));

    panel.appendChild(el('div', { class: 'cifras' }, [
      cifra(e.completas + '/' + e.total, T.t('progreso')),
      cifra('★ ' + e.estrellas, T.t('estrellas')),
      cifra(String(e.racha), T.t('diasSeguidos')),
      cifra(String(e.dias), T.t('diasTotales'))
    ]));

    /* Velocidad de lectura: lo que mejor muestra si está cuajando. */
    var vel = el('div', { class: 'ajuste' }, [el('label', {}, etiqueta('velocidad2'))]);
    if (!e.historial.length) {
      vel.appendChild(el('p', { class: 'dato', text: T.t('sinDatos') }));
    } else {
      vel.appendChild(el('p', { class: 'dato' }, [
        document.createTextNode(T.t('mejorPpm') + ': '),
        el('b', { text: e.ppmMejor + ' ' + T.t('ppm') })
      ]));
      var barras = el('div', { class: 'barras' });
      var tope = Math.max.apply(null, e.historial.map(function (l) { return l.ppm; })) || 1;
      e.historial.forEach(function (l) {
        barras.appendChild(el('span', {
          class: 'barra-ppm',
          style: 'height:' + Math.max(8, Math.round(l.ppm / tope * 100)) + '%',
          title: l.ppm + ' ppm · ' + l.texto + ' · ' + l.fecha
        }));
      });
      vel.appendChild(barras);
      vel.appendChild(el('p', { class: 'dato', style: 'font-size:.8rem',
        text: 'Cada barra es una lectura, de la más antigua a la más reciente.' }));
    }
    panel.appendChild(vel);

    /* Dónde falla: los diagnósticos que la app fue guardando. */
    var NOMBRES = {
      'rr': 'Erre fuerte (pero / perro)',
      'r': 'Erre suave',
      'silabas-menos': 'Se come sílabas',
      'silabas-mas': 'Añade sílabas',
      'vocal': 'Cambia vocales',
      'consonante': 'Cambia consonantes',
      'falta': 'Se salta palabras',
      'ortografia': 'Ortografía al escribir',
      'dictado-mal': 'Dictado equivocado',
      'par-minimo': 'Confunde palabras parecidas',
      'comprension': 'No pilla lo que lee',
      'otra': 'Otros'
    };
    var fal = el('div', { class: 'ajuste' }, [el('label', {}, etiqueta('dondeFalla'))]);
    if (!e.errores.length) {
      fal.appendChild(el('p', { class: 'dato', text: T.t('sinDatos') }));
    } else {
      var ul = el('ul', { class: 'lista-fallos' });
      e.errores.forEach(function (x) {
        ul.appendChild(el('li', {}, [
          el('span', { text: NOMBRES[x.clave] || x.clave }),
          el('b', { text: String(x.veces) })
        ]));
      });
      fal.appendChild(ul);
      if (e.flojas.length) {
        fal.appendChild(el('p', { class: 'dato',
          text: 'El repaso ya le está trayendo: ' + e.flojas.map(function (f) { return f.id; }).join(', ') }));
      }
    }
    panel.appendChild(fal);

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', { class: 'btn btn-principal btn-grande', text: T.t('cerrar'),
        onclick: function () { hoja.remove(); } })
    ]));

    hoja.appendChild(panel);
    document.body.appendChild(hoja);
  }

  function cifra(valor, etq) {
    return el('div', { class: 'cifra' }, [
      el('b', { text: valor }),
      el('span', { text: etq })
    ]);
  }

  /* ---------------------------------------------------- lector libre ---- */

  function verLector() {
    vista = { nombre: 'lector' };
    var guardado = '';
    try { guardado = global.localStorage.getItem('lectura-es-texto') || ''; } catch (e) {}

    var area = el('textarea', {
      placeholder: T.t('escribeAlgo'),
      spellcheck: 'false',
      'aria-label': T.t('escribeAlgo')
    });
    area.value = guardado || 'El pingüino pequeño come chocolate con fresas.';

    var salida = el('div', { class: 'salida' });
    var separar = true;
    var pintadas = [];

    function repintar() {
      salida.innerHTML = '';
      pintadas = [];
      var texto = area.value;
      try { global.localStorage.setItem('lectura-es-texto', texto); } catch (e) {}

      Silabas.tokenize(texto).forEach(function (tok) {
        if (tok.type !== 'word') {
          salida.appendChild(document.createTextNode(tok.text));
          return;
        }
        var pal = el('span', { class: 'pal palabra-tocable' });
        if (separar) {
          tok.syllables.forEach(function (s, k) {
            var sil = el('span', { class: 'sil ' + (k % 2 ? 'sil-b' : 'sil-a'), text: s });
            sil.addEventListener('click', function (ev) {
              ev.stopPropagation();
              resaltar(sil, decir(s, 'silaba'));
            });
            pal.appendChild(sil);
            if (k < tok.syllables.length - 1) pal.appendChild(el('span', { class: 'sep', text: '·' }));
          });
        } else {
          pal.textContent = tok.text;
        }
        pal.addEventListener('click', function () { resaltar(pal, decir(tok.text, 'palabra')); });
        salida.appendChild(pal);
        pintadas.push({ nodo: pal, texto: tok.text });
      });
    }

    /* Leer en voz alta lo que él mismo ha escrito o pegado. */
    var zonaMicro = el('div', {});
    function prepararMicro() {
      zonaMicro.innerHTML = '';
      if (!micDisponible()) return;
      var texto = area.value.trim();
      if (!texto) return;
      zonaMicro.appendChild(el('div', { class: 'enunciado' }, [
        el('button', {
          class: 'btn btn-icono btn-audio', text: '🎤',
          onclick: function (ev) {
            ev.currentTarget.disabled = true;
            zonaMicro.appendChild(bloqueMicro(texto, { silabas: false }));
          }
        }),
        el('div', { class: 'txt' }, etiqueta('leerlaTu'))
      ]));
    }

    area.addEventListener('input', function () { repintar(); prepararMicro(); });
    repintar();
    prepararMicro();

    pintar([
      barra(T.t('lectorLibre'), verPortada),
      el('section', { class: 'lector' }, [
        el('div', { class: 'enunciado' }, [
          el('button', {
            class: 'btn btn-icono btn-audio', text: '🔊',
            onclick: function () { narrar(T.t('tocaPalabra')); }
          }),
          el('div', { class: 'txt' }, etiqueta('tocaPalabra'))
        ]),
        area,
        el('div', { class: 'fila-botones' }, [
          el('button', {
            class: 'btn btn-principal', text: '🔊 ' + T.t('leerTodo'),
            onclick: function () {
              Voz.secuencia(pintadas.map(function (p) {
                return {
                  text: p.texto, tipo: 'frase', pausa: 110,
                  antes: function () { p.nodo.classList.add('sonando'); },
                  despues: function () { p.nodo.classList.remove('sonando'); }
                };
              }));
            }
          }),
          el('button', {
            class: 'btn',
            text: separar ? '🔗 ' + T.t('verJunto') : '✂️ ' + T.t('verSilabas'),
            onclick: function (ev) {
              separar = !separar;
              ev.currentTarget.textContent = separar ? '🔗 ' + T.t('verJunto') : '✂️ ' + T.t('verSilabas');
              repintar();
            }
          }),
          el('button', {
            class: 'btn', text: '🧹 ' + T.t('limpiar'),
            onclick: function () { Voz.parar(); area.value = ''; repintar(); area.focus(); }
          })
        ]),
        salida,
        zonaMicro
      ])
    ]);
  }

  /* --------------------------------------------- cambiar de aparato ---- */

  /*
   * El progreso vive en el localStorage, que no sale de este navegador. Para
   * seguir en otra tableta se pasa un código corto: se puede dictar por
   * teléfono, o mandar dentro de un enlace que al abrirlo ya lo aplica.
   */
  function seccionTraspaso() {
    var caja = el('div', { class: 'ajuste' });
    var idsCuentos = (Avanzado && Avanzado.cuentos || []).map(function (c) { return c.id; });
    var codigo = Progreso.exportarCodigo(Curriculo.unidades, idsCuentos);
    /* El enlace no tiene por qué ser corto, así que lleva el progreso entero:
       también la velocidad de lectura y los diagnósticos del repaso. */
    var enlace = location.href.split('#')[0] + '#p=' + Progreso.exportarCompleto();

    caja.appendChild(el('label', {}, etiqueta('traspaso')));
    caja.appendChild(el('p', { class: 'dato', text: T.t('tuCodigo') + ':' }));
    caja.appendChild(el('div', { class: 'codigo', text: codigo }));

    caja.appendChild(el('p', { class: 'dato', text: T.t('traspasoAyuda') }));
    var aviso = el('p', { class: 'dato', text: T.t('enlaceLlevaTodo') });
    caja.appendChild(el('button', {
      class: 'btn btn-grande',
      text: '🔗 ' + T.t('copiarEnlace'),
      onclick: function (ev) {
        var boton = ev.currentTarget;
        function hecho() { boton.textContent = '✅ ' + T.t('copiado'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(enlace).then(hecho, function () { aviso.textContent = enlace; });
        } else {
          aviso.textContent = enlace;   // sin portapapeles: que al menos se vea
        }
      }
    }));
    caja.appendChild(aviso);
    caja.appendChild(el('p', { class: 'dato', text: '⚠️ ' + T.t('traspasoOjo') }));

    caja.appendChild(el('p', { class: 'dato', style: 'margin-top:18px' }, etiqueta('vienesDeOtro')));
    var campo = el('input', {
      type: 'text', class: 'campo-codigo', placeholder: T.t('pegaCodigo'),
      autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false'
    });
    caja.appendChild(campo);
    caja.appendChild(el('button', {
      class: 'btn btn-grande',
      text: '⬇️ ' + T.t('continuarAqui'),
      onclick: function () { aplicarCodigo(campo.value); }
    }));
    return caja;
  }

  /* Aplica un código, avisando antes de que sustituye lo que haya aquí. */
  function aplicarCodigo(codigo) {
    if (!Progreso.leerCodigo(codigo).ok) {
      narrar(T.t('codigoMal'));
      return global.alert(T.t('codigoMal'));
    }
    if (!global.confirm(T.t('codigoPisa'))) return;
    var idsCuentos = (Avanzado && Avanzado.cuentos || []).map(function (c) { return c.id; });
    var r = Progreso.importarCodigo(codigo, Curriculo.unidades, idsCuentos);
    if (!r.ok) return global.alert(T.t('codigoMal'));
    var hoja = document.querySelector('.hoja');
    if (hoja) hoja.remove();
    confeti();
    T.usarChino(!!Progreso.ajuste('chino'));
    document.body.setAttribute('data-may', Progreso.ajuste('mayusculas') ? '1' : '0');
    Voz.velocidad(Progreso.ajuste('velocidad') || 0.85);
    verPortada();
    narrar(T.t('codigoBien') + ' ' + r.unidades + ' unidades, ' + r.cuentos +
           ' cuentos y ' + r.estrellas + ' estrellas.');
  }

  /* ------------------------------------------------------ instalar ----- */

  /*
   * Instalar la app. Si el navegador ofrece su propio diálogo, con un toque
   * basta. Si no, explicamos los pasos exactos de ESTE navegador: los sitios
   * que dicen "añádelo a tu pantalla de inicio" sin más no ayudan a nadie.
   */
  function verInstalar() {
    var hoja = el('div', { class: 'hoja' });
    hoja.addEventListener('click', function (e) { if (e.target === hoja) hoja.remove(); });
    var panel = el('div', { class: 'hoja-panel' });

    var caso = PWA.situacion();

    panel.appendChild(el('div', { style: 'text-align:center' }, [
      el('div', { style: 'font-size:3.4rem;line-height:1', text: '📲' }),
      el('h2', { style: 'margin:6px 0 2px' }, etiqueta('instalarApp')),
      el('p', { class: 'dato', text: 'Un icono propio, ventana propia, y sin buscar el archivo.' })
    ]));

    if (caso.clave === 'listo') {
      panel.appendChild(el('div', { class: 'ajuste' }, [
        el('button', {
          class: 'btn btn-principal btn-grande',
          text: '📲 ' + T.t('instalar'),
          onclick: function (ev) {
            ev.currentTarget.disabled = true;
            PWA.instalar().then(function (ok) {
              hoja.remove();
              if (ok) { confeti(); narrar('¡Ya está instalada!'); }
              verPortada();
            });
          }
        })
      ]));
    } else if (caso.clave === 'ya') {
      panel.appendChild(el('p', { class: 'truco' }, etiqueta('yaInstalada')));
    } else {
      var ayuda = el('div', { class: 'ajuste' }, [el('label', {}, etiqueta('instalarComo'))]);
      if (caso.nota) ayuda.appendChild(el('p', { class: 'nota-instalar', text: caso.nota }));
      /* Numerado sólo si de verdad hay un orden; con viñeta si son alternativas. */
      if (caso.pasos) {
        ayuda.appendChild(el('ol', { class: 'pasos-instalar' }, caso.pasos.map(function (t) {
          return el('li', { text: t });
        })));
      }
      if (caso.opciones) {
        ayuda.appendChild(el('ul', { class: 'pasos-instalar opciones' }, caso.opciones.map(function (t) {
          return el('li', { text: t });
        })));
      }
      panel.appendChild(ayuda);
    }

    if (PWA.sinConexion()) {
      panel.appendChild(el('p', { class: 'dato', text: '✅ ' + T.t('sinConexion') }));
    }

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', {
        class: 'btn btn-grande', text: T.t('entendido'),
        onclick: function () { hoja.remove(); }
      })
    ]));

    hoja.appendChild(panel);
    document.body.appendChild(hoja);
  }

  /* -------------------------------------------------------- ajustes ---- */

  function verAjustes() {
    var hoja = el('div', { class: 'hoja' });
    hoja.addEventListener('click', function (e) { if (e.target === hoja) hoja.remove(); });

    var panel = el('div', { class: 'hoja-panel' });

    /* Velocidad */
    var vel = el('input', {
      type: 'range', min: '0.5', max: '1.3', step: '0.05',
      value: String(Progreso.ajuste('velocidad'))
    });
    vel.addEventListener('input', function () {
      var v = parseFloat(vel.value);
      Progreso.ajuste('velocidad', v);
      Voz.velocidad(v);
    });
    vel.addEventListener('change', function () { decir('ma me mi mo mu', 'silaba'); });

    /* Voz */
    var selector = el('select');
    function rellenarVoces() {
      selector.innerHTML = '';
      var actual = Voz.vozActual();
      Voz.voces().forEach(function (v) {
        selector.appendChild(el('option', {
          value: v.voiceURI,
          selected: actual && v.voiceURI === actual.voiceURI ? 'selected' : null,
          text: v.name + ' (' + v.lang + ')'
        }));
      });
      if (!Voz.voces().length) selector.appendChild(el('option', { text: '—' }));
    }
    rellenarVoces();
    Voz.alCargarVoces(rellenarVoces);
    selector.addEventListener('change', function () {
      Voz.elegirVoz(selector.value);
      Progreso.ajuste('voz', selector.value);
      decir('Hola, vamos a leer', 'frase');
    });

    function interruptor(clave, valorInicial, alCambiar) {
      var input = el('input', { type: 'checkbox', checked: valorInicial ? 'checked' : null });
      input.addEventListener('change', function () { alCambiar(input.checked); });
      return el('div', { class: 'ajuste' }, [
        el('label', { class: 'interruptor' }, [
          el('span', {}, etiqueta(clave)),
          input
        ])
      ]);
    }

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('label', {}, etiqueta('velocidad')),
      vel,
      el('div', {
        style: 'display:flex;justify-content:space-between;font-weight:700;color:var(--tinta-suave)'
      }, [el('span', { text: '🐢 ' + T.t('lento') }), el('span', { text: T.t('rapido') + ' 🐇' })])
    ]));

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('label', {}, etiqueta('voz')), selector
    ]));

    panel.appendChild(interruptor('mostrarChino', T.usarChino(), function (v) {
      T.usarChino(v);
      Progreso.ajuste('chino', v);
      hoja.remove();
      verPortada();
      verAjustes();          // se reabre traducido, sin perder el sitio
    }));

    if (Escucha.soportado) {
      panel.appendChild(interruptor('usarMicro', Progreso.ajuste('micro') !== false, function (v) {
        Progreso.ajuste('micro', v);
      }));
      if (!Escucha.contextoSeguro()) {
        panel.appendChild(el('div', { class: 'aviso' }, [
          el('span', { text: '⚠️' }), el('span', { text: T.t('sinSeguro') })
        ]));
      }
    } else {
      panel.appendChild(el('div', { class: 'ajuste' }, [
        el('label', {}, etiqueta('micro')),
        el('p', { class: 'dato', text: T.t('microNo') })
      ]));
    }

    /* Estado del modelo integrado del navegador, que es opcional. */
    var estadoModelo = el('p', { class: 'dato', text: '…' });
    Modelo.comprobar().then(function (e) {
      estadoModelo.textContent =
        e === 'listo' ? '✅ ' + T.t('modeloListo')
        : e === 'descargable' ? '⬇️ ' + T.t('modeloDescarga')
        : '— ' + T.t('modeloNo');
    });
    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('label', {}, etiqueta('modeloTitulo')),
      estadoModelo
    ]));

    panel.appendChild(interruptor('mayusculas', Progreso.ajuste('mayusculas'), function (v) {
      Progreso.ajuste('mayusculas', v);
      document.body.setAttribute('data-may', v ? '1' : '0');
    }));

    panel.appendChild(interruptor('desbloquear', Progreso.ajuste('desbloquearTodo'), function (v) {
      Progreso.ajuste('desbloquearTodo', v);
    }));

    /* Para que otra familia pueda usarla: el enlace, sin más. */
    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', {
        class: 'btn btn-grande', text: '📤 ' + T.t('compartir'),
        onclick: function (ev) {
          var boton = ev.currentTarget;
          var url = location.href.split('#')[0];
          var datos = {
            title: 'Aprendo a leer en español',
            text: T.t('queEsEsto'),
            url: url
          };
          if (navigator.share) {
            navigator.share(datos).catch(function () {});
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              boton.textContent = '✅ ' + T.t('compartida');
            }, function () {});
          }
        }
      })
    ]));

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', { class: 'btn btn-grande', text: '👦 ' + T.t('cambiarNino'),
        onclick: function () { hoja.remove(); verPerfiles(); } })
    ]));

    panel.appendChild(seccionTraspaso());

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', {
        class: 'btn btn-grande',
        style: 'border-color:var(--error);color:var(--error)',
        text: '🗑️ ' + T.t('borrar'),
        onclick: function () {
          if (global.confirm(T.t('borrarSeguro'))) {
            Progreso.reiniciar();
            hoja.remove();
            verPortada();
          }
        }
      })
    ]));

    panel.appendChild(el('div', { class: 'ajuste' }, [
      el('button', { class: 'btn btn-principal btn-grande', text: T.t('cerrar'), onclick: function () { hoja.remove(); } })
    ]));

    hoja.appendChild(panel);
    document.body.appendChild(hoja);
  }

  /* ---------------------------------------------------------- arranque -- */

  function iniciar() {
    raiz = document.getElementById('app');

    var a = Progreso.datos().ajustes;
    Voz.velocidad(a.velocidad || 0.85);
    T.usarChino(!!a.chino);
    document.body.setAttribute('data-may', a.mayusculas ? '1' : '0');
    if (a.voz) Voz.alCargarVoces(function () { Voz.elegirVoz(a.voz); });

    /* El primer toque desbloquea la voz en iOS y Android. */
    var desbloquear = function () {
      Voz.preparar();
      document.removeEventListener('pointerdown', desbloquear);
      document.removeEventListener('keydown', desbloquear);
    };
    document.addEventListener('pointerdown', desbloquear);
    document.addEventListener('keydown', desbloquear);

    /* Al salir de la página, callar. */
    global.addEventListener('pagehide', function () { Voz.parar(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) Voz.parar();
    });

    /* Primera vez en este aparato: preguntamos lo que cambia la app. */
    var perfil = Progreso.perfilActivo();
    var estrenando = !perfil.nombre && !Progreso.datos().estrellas &&
                     !Object.keys(Progreso.datos().unidades).length;

    /* Un enlace #p=CODIGO trae el progreso de otro aparato. */
    var traido = /^#p=(.+)$/.exec(location.hash);
    if (traido) {
      history.replaceState(null, '', location.pathname + location.search);
      verPortada();
      setTimeout(function () { aplicarCodigo(traido[1]); }, 400);
    } else if (location.hash === '#lector') {
      verLector();     /* atajo del icono de la app (manifest → shortcuts) */
    } else if (estrenando) {
      verBienvenida();
    } else {
      verPortada();
    }

    /* Si el navegador ofrece instalar más tarde, refrescamos la portada. */
    PWA.alCambiar(function () { if (vista.nombre === 'portada') verPortada(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window);
