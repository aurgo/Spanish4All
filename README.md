# 📖 Aprendo a leer en español

Aplicación web para que un niño aprenda a leer español **desde cero y por su
cuenta**, usando la voz y el micrófono que ya trae el navegador. La app le lee
todo en voz alta, y cuando lee él, **le escucha y le puntúa**. Sin instalación
y sin cuentas.

Pensada para un caso concreto: un niño que **habla español con soltura y lee
chino tradicional perfectamente, pero nunca ha leído español**. Conoce las
letras del alfabeto por el inglés, así que lo que le falta no son las formas
de las letras sino **qué sonido hace cada una en español** — y eso es
exactamente lo que enseña esta app.

## Cómo se usa

### 👉 https://aurgo.github.io/Spanish4All/

Ése es el enlace para el niño. Se abre en cualquier navegador y, con el botón
**📲 Instalar**, queda en el dispositivo como una aplicación más: icono
propio, ventana propia y funciona luego sin internet.

También hay dos alternativas sin depender de la web:

- **Un solo archivo**: descarga `aprendo-a-leer.html` y ábrelo con doble clic.
  Funciona entero y sin conexión, aunque desde el disco no se puede instalar
  (el navegador sólo instala desde `https`).
- **Desde el código**: `npx http-server .` en la raíz, o abre `src/index.html`
  si quieres el código repartido en módulos.

## Instalarla en el dispositivo

La app trae su propio *manifest*, así que el navegador la reconoce como una
aplicación instalable: icono propio, ventana sin barra de direcciones, y un
atajo a «Leer cualquier cosa» al mantener pulsado el icono.

Lo que sigue **está comprobado con Chrome**, no supuesto, porque aquí es fácil
prometer de más:

| Situación | ¿Se instala? | ¿Funciona sin internet? |
|---|---|---|
| Este sitio (`https://aurgo.github.io/Spanish4All/`) | ✅ sí | ✅ sí, con service worker |
| `aprendo-a-leer.html` servido por **https** | ✅ sí | ❌ no |
| `aprendo-a-leer.html` **desde el disco** (`file://`) | ❌ no | ✅ sí (es un archivo local) |

Las dos limitaciones tienen la misma causa y merece la pena entenderlas:

- **Un solo archivo no puede funcionar sin conexión desde un servidor.** Para
  eso hace falta un *service worker*, y el navegador exige que su script sea
  un `.js` servido aparte: registrarlo desde un `blob:` o un `data:` falla con
  *«The URL protocol of the script is not supported»*. Por eso el sitio
  publicado es el mismo HTML más un `sw.js` de doce líneas.
- **Desde `file://` no se puede instalar**: Chrome responde
  *`not-from-secure-origin`*. Abierto desde el disco la app funciona entera,
  pero para que quede un icono hay que usar el menú ⋮ → Guardar y compartir →
  Crear acceso directo, marcando «Abrir como ventana». El botón 📲 de la app
  detecta el caso y lo explica.

El *manifest* del archivo suelto se inyecta en tiempo de ejecución como
`blob:`, que es lo que permite seguir teniendo un único fichero. Un detalle
que cuesta encontrar: **`start_url` y `scope` tienen que ser URLs absolutas**,
porque las relativas se resuelven contra el `blob:` y Chrome las descarta con
*«property 'start_url' ignored, URL is invalid»* — la página deja de ser
instalable sin decir por qué.

### Cómo está publicado

La raíz del repositorio **es** el sitio: GitHub Pages lo sirve desde
`main` / `(root)`. Por eso `index.html`, `sw.js`, `manifest.webmanifest` y los
iconos viven arriba del todo, y el código fuente está en `src/`.

Para republicar después de tocar el código: `node src/build.js`, que
regenera la raíz a partir de `src/`.

En iPhone y iPad el botón explica el camino de Safari (Compartir → Añadir a
pantalla de inicio), porque iOS no usa el diálogo de instalación estándar.

> **La primera vez, toca la pantalla.** Safari y Chrome en móvil no dejan que
> una página hable hasta que el usuario la toca. El primer toque en cualquier
> sitio la desbloquea.

## Qué enseña, y en qué orden

37 unidades siguiendo el **método silábico**, que es como se aprende a leer en
la escuela española: primero las vocales, luego una consonante nueva cada vez,
y sólo al final lo difícil.

| | Unidades | Contenido |
|---|---|---|
| 1 | 1 | Las cinco vocales |
| 2 | 2–16 | Consonantes de una en una: m, p, l, s, t, n, d, c, b, v, f, r suave, rr, j, g |
| 3 | 17–27 | Las reglas con truco: gue/gui, ge/gi, h muda, ñ, ll, ch, y, que/qui, z/ce/ci, güe/güi, k/w/x |
| 4 | 28–33 | Sílabas trabadas: bl br, cl cr, fl fr, gl gr, pl pr, tr dr |
| 5 | 34–36 | Sílabas inversas, diptongos e hiatos, la tilde y los signos `¿?` `¡!` |
| 6 | 37 | Tres cuentos cortos para leer de corrido |

**La regla de oro:** ninguna palabra usa una letra que no se haya enseñado
antes. Por eso la unidad de la `m` sólo tiene *mamá, mimo, momia, mío, mía* —
son literalmente todas las palabras que se pueden escribir con `m` y las cinco
vocales. Esa restricción es lo que permite **leer** en vez de adivinar, y está
verificada automáticamente (ver *Comprobaciones*).

## Las ocho actividades

Cada unidad recorre la misma secuencia, que va de reconocer a producir:

1. **Mirar y escuchar** — la letra en grande, cómo se llama, cómo suena y un
   truco de pronunciación ("junta los labios y haz mmm").
2. **Tocar cada sílaba** — `ma me mi mo mu`, una a una, hasta tocarlas todas.
3. **Escucha y toca la sílaba** — discriminar entre parecidas.
4. **Leer las palabras** — la palabra troceada en sílabas, con dibujo; cada
   trozo suena por separado y la sílaba tónica va subrayada.
5. **Construye la palabra** — oye una palabra y la monta con fichas de sílabas.
6. **Lee y elige el dibujo** — **sin audio de partida**: aquí hay que leer de
   verdad para acertar. Es el paso que demuestra que está leyendo.
7. **Lee en voz alta al micrófono** — 🎤 lee él, la app le escucha, marca en
   verde/ámbar/rojo cada palabra y le da de cero a tres estrellas con una
   pista concreta. Aquí la app **no** lee el texto antes: si lo hiciera,
   bastaría con repetir de oído. El 🔊 está para cuando se atasca.
   Si el navegador no puede escuchar, este paso vuelve a la autoevaluación.
8. **Frases y textos** — lectura de corrido, palabra a palabra o por sílabas,
   con un 🎤 para leerlas él y que le puntúen. Los cuentos se leen línea a
   línea, porque el reconocedor corta en la primera pausa.

Además, desde la portada:

- **🔤 Leer cualquier cosa** — escribes o pegas *cualquier* texto en español y
  la app lo trocea en sílabas correctamente. Toca una palabra y la dice; toca
  una sílaba y la dice sola. Sirve para los deberes, un cuento o el menú de un
  restaurante.
- **🔁 Repaso** — mezcla palabras de todas las unidades ya superadas.

En el lector libre también puede leer en voz alta lo que él mismo haya escrito
o pegado, y recibir su nota.

## Ajustes (⚙️)

- **Velocidad de la voz** — por defecto va lenta, que es como hay que empezar.
- **Voz** — elige entre las voces españolas instaladas en el sistema.
- **繁體中文** — muestra los enunciados también en chino tradicional. El niño
  lee chino con soltura, así que esto es la diferencia entre necesitar un
  adulto al lado y poder avanzar solo. Los enunciados **siempre** se dicen
  además en voz alta.
- **Ejercicios con micrófono** — se pueden desactivar; entonces vuelve la
  autoevaluación.
- **Comentarios del modelo del navegador** — informa de si este navegador
  trae modelo propio (ver más abajo).
- **MAYÚSCULAS** — algunos niños arrancan mejor con letra de imprenta.
- **Desbloquear todas las unidades** — normalmente cada unidad se abre al
  terminar la anterior; esto salta el candado.
- **Borrar el progreso** — empezar de cero.

El progreso (estrellas, unidades hechas, ajustes) se guarda en el
`localStorage` del navegador. No hay servidor: nada sale del dispositivo.

## Cómo está hecho

JavaScript sin dependencias ni compilación. Seis archivos:

| Archivo | Qué hace |
|---|---|
| `src/js/syllabify.js` | Silabeador español completo: dígrafos, grupos inseparables, diptongos, triptongos, hiatos, `y` semivocal, `ü`, y la sílaba tónica |
| `src/js/speech.js` | Envoltorio de `SpeechSynthesis`: elige la mejor voz española, encadena locuciones con pausas y sortea las rarezas de iOS y Chrome |
| `src/js/escucha.js` | El micrófono: envoltorio de `SpeechRecognition` con sus asperezas y sus errores traducidos |
| `src/js/evaluar.js` | Puntúa la lectura comparando **sonidos**, no letras, y diagnostica qué ha fallado |
| `src/js/modelo.js` | El modelo integrado del navegador, si lo hay (opcional) |
| `src/js/curriculum.js` | Las 37 unidades: letras, sílabas, palabras, frases y cuentos |
| `src/js/progress.js` | Progreso y ajustes en `localStorage` |
| `src/js/textos.js` | Textos de interfaz en español y chino |
| `src/js/pwa.js` | Instalación: genera e inyecta el *manifest*, registra el service worker si lo hay, y explica los pasos de cada navegador |
| `src/js/iconos.js` | Los iconos como `data:` URI (generado por `src/iconos/generar.js`) |
| `src/js/app.js` | Las actividades y toda la interfaz |
| `src/test/` | Las comprobaciones del silabeador, el currículo y la puntuación |
| `src/build.js` | Genera el sitio publicado en la raíz a partir de `src/` |

Para cambiar el icono: edita `src/iconos/icono.svg`, rasterízalo a PNG en
192, 512 y 180 px, y ejecuta `node src/iconos/generar.js`.

### Sobre el silabeador

Es la pieza que permite leer *cualquier* palabra, no sólo las del currículo.
Implementa las reglas de la RAE:

```
obstruir   → obs-truir     (grupo tr inseparable, el resto cierra sílaba)
instrumento→ ins-tru-men-to
pingüino   → pin-güi-no    (la diéresis hace sonar la u)
estudiáis  → es-tu-diáis   (triptongo)
teatro     → te-a-tro      (hiato: dos vocales fuertes)
río        → rí-o          (hiato: tilde en vocal débil)
murciélago → mur-cié-la-go
```

### Sobre la voz

Se usa `SpeechSynthesis`, que va incluido en todos los navegadores modernos.
Un detalle deliberado: para enseñar el **sonido** de una consonante no se le
pide al sintetizador que pronuncie la letra suelta — diría su *nombre*
("eme"), que es justo lo que confunde a quien empieza. En su lugar el sonido
se enseña siempre dentro de la sílaba (`ma me mi mo mu`), que es como lo hacen
los maestros y lo único que suena bien en cualquier motor de voz.

Calidad de la voz por sistema: macOS e iOS traen voces españolas excelentes;
Windows tiene Helena y Elvira; en Android depende del fabricante. Si no hay
ninguna voz española instalada, la app avisa en la portada.

### Sobre el micrófono

Usa `SpeechRecognition` (la otra mitad de la Web Speech API), que va en
Chrome, Edge y Safari. Tres detalles que condicionan el diseño:

- **Puntúa sonidos, no letras.** El reconocedor devuelve ortografía, y en
  español muchas letras distintas suenan igual. Si el niño lee *vaca*
  perfectamente y el micrófono escribe *baca*, eso es una lectura **correcta**
  y no se puede penalizar. Así que ambos textos se pasan primero a una
  transcripción fonética aproximada. Lo que sí se conserva es lo que de verdad
  distingue al leer: `pero` ≠ `perro`. Al reconocedor se le piden **cinco
  alternativas** y se puntúa la mejor, por la misma razón.
- **Las tres estrellas exigen todas las palabras bien**, no una media alta: en
  una frase larga, una media buena puede esconder justo el error que la unidad
  acaba de enseñar.
- **Privacidad.** Aquí sí hay un matiz: Chrome procesa el audio en sus
  servidores. La app pide reconocimiento **en el dispositivo** cuando el
  navegador lo soporta (`processLocally`), pero no siempre está disponible.
  Todo lo demás — progreso, ajustes, el sintetizador de voz — sigue sin salir
  del dispositivo. Si no quieres usar el micrófono, se apaga en ⚙️ y la app
  funciona entera igualmente.
- El micrófono necesita **contexto seguro**: funciona por `https` y desde
  `file://`, pero desde un servidor local sin cifrar puede bloquearse.

### Sobre el modelo del navegador

Chrome incorpora un modelo pequeño (Gemini Nano) mediante la **Prompt API**.
Cuando existe, la app lo usa para una sola cosa: convertir la nota en un
comentario de maestro. `js/modelo.js` detecta las dos formas en que se ha
expuesto la API (`LanguageModel` y el antiguo `window.ai.languageModel`).

Es un extra deliberadamente prescindible: hoy sólo está en Chrome de
escritorio reciente y descarga varios GB la primera vez, así que en una
tableta no habrá nada. Sin él, `evaluar.js` ya da su propio diagnóstico
(erre fuerte, sílaba comida, vocal cambiada, palabra saltada), y ese es el
camino normal. El modelo tiene además una ventana de 1,4 s: si tarda más, se
usa el comentario propio y el niño no espera. Lo que se muestra y lo que se
dice en voz alta son siempre lo mismo — no puede leer su propia corrección.

## Comprobaciones

```bash
node src/test/run.js   # las tres verificaciones
node src/build.js      # regenera el sitio publicado
```

Sin dependencias: sólo hace falta Node. Dos cosas se comprueban solas, y
conviene volver a pasarlas si se toca el silabeador o el currículo:

- **Silabeador** (70 comprobaciones) — los casos donde es fácil equivocarse:
  `obs-truir`, `ins-tru-men-to`, `pin-güi-no`, `te-a-tro`, `es-tu-diáis`,
  `at-lán-ti-co`, `rí-o`, `buey`, `pro-hi-bi-do`… y la sílaba tónica.
- **Currículo** (817 comprobaciones) — recorre cada palabra de cada unidad y
  falla si alguna usa una letra, o una combinación `ce/ci` o `ge/gi`, antes de
  que se haya enseñado. Es la red que sostiene la regla de oro.
- **Lectura en voz alta** (28 comprobaciones) — que *vaca*/*baca*,
  *casa*/*caza*, *pollo*/*poyo* u *hola*/*ola* cuenten como iguales, que
  *pero*/*perro* cuente como distinto, y que las estrellas salgan donde deben.

## Compatibilidad

Chrome, Edge, Safari y Firefox actuales, en ordenador, móvil y tableta.
Funciona desde `file://`, así que no hace falta servidor. El micrófono
necesita Chrome, Edge o Safari (Firefox no trae reconocimiento de voz); si
falta, ese paso vuelve solo a la autoevaluación y el resto no cambia. Se adapta al tema
claro u oscuro del sistema y respeta `prefers-reduced-motion`.

## Licencia y reutilización

MIT. Cógelo, cópialo, cámbialo y úsalo con quien quieras, sin pedir permiso.

Si te sirve para otro idioma, lo que hay que tocar es poco y está localizado:
`src/js/curriculum.js` tiene el plan de lectura entero (letras, sílabas,
palabras y cuentos), `src/js/textos.js` los textos de la interfaz, y
`src/js/syllabify.js` las reglas de división silábica. El resto —la voz, el
micrófono, la puntuación por sonidos, la instalación— es independiente del
idioma salvo los códigos `es-ES` de `src/js/speech.js` y `src/js/escucha.js`.
