# Generador de Subtítulos

Subtítulos automáticos en español, en el navegador, con exportación a **MP4 con los subtítulos incrustados**.

MP4 de entrada → audio → Whisper (transformers.js) → subtítulos sincronizados → render en canvas → **video-subtitulado.mp4** (H.264 + AAC).

---

## Requisitos

- **Node.js 18 o superior** (recomendado 20+).
- Navegador de escritorio moderno: **Chrome o Edge** (recomendado), Firefox o Safari 17+.
- Conexión a internet **la primera vez**, para descargar los pesos del modelo desde Hugging Face. Después quedan en la caché del navegador.

## Instalar

```bash
npm install
```

`npm install` ejecuta automáticamente `scripts/copy-ffmpeg-assets.mjs`, que copia desde `node_modules` a `public/ffmpeg/`:

```
public/ffmpeg/ffmpeg-core.js
public/ffmpeg/ffmpeg-core.wasm
public/ffmpeg/esm/…        (worker.js de @ffmpeg/ffmpeg y sus imports)
```

Así **FFmpeg y su Worker siempre se cargan desde el mismo origen** que la aplicación.

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`).

> No abras `index.html` con doble clic. La app necesita servirse por HTTP: desde `file://` el origen es `null` y el navegador bloquea los Workers y el WASM. `npm run dev` ya resuelve esto.

## Compilar para producción

```bash
npm run build
npm run preview
```

`npm run build` genera la carpeta `dist/` (incluye `dist/ffmpeg/…`). `npm run preview` la sirve en `http://localhost:4173`. Para publicarla, sube el contenido de `dist/` a cualquier hosting estático (Netlify, Vercel, Nginx, GitHub Pages). La base es relativa, así que funciona también en un subdirectorio.

---

## Cómo se usa

1. **1. Tu video** → `📁 Seleccionar video` o arrastra el MP4.
2. Elige el modelo (Base por defecto; Small es más preciso y más pesado).
3. `🎙️ GENERAR SUBTÍTULOS`: extrae el audio, carga el modelo, transcribe y arma los bloques.
4. **2. Estilo**: tipografía, tamaño, color, color de resaltado, posición vertical, palabras por bloque, resaltado de palabra y mayúsculas. La vista previa se actualiza al instante y se puede reproducir, pausar y mover la barra de tiempo.
5. `⬇️ DESCARGAR MP4 CON SUBTÍTULOS` → descarga `video-subtitulado.mp4`.

También hay un botón extra para bajar los subtítulos en `.srt`.

---

## Decisiones técnicas

**Audio para Whisper.** El MP4 se decodifica con `decodeAudioData` y se remuestrea con `OfflineAudioContext` a **mono 16 kHz**, entregando un `Float32Array` al modelo. Nunca se pasa un `Blob` al pipeline, que es lo que producía `e.subarray is not a function`. Si el navegador no puede decodificar el audio, hay un plan B que lo extrae con FFmpeg a WAV PCM 16 kHz mono.

**Transcripción.** `@huggingface/transformers` (Whisper Base / Small, cuantizado q8) en un **Web Worker propio del proyecto**, con `language: "spanish"`, `task: "transcribe"` y `return_timestamps: "word"`. Si el modelo no entrega timestamps por palabra, se reintenta con timestamps por segmento y se reparte el tiempo entre las palabras del segmento; en ese caso la app lo avisa en pantalla. La transcripción no se altera: las palabras son las que devuelve el modelo.

**FFmpeg.** Se usa el core de **un solo hilo**, que no necesita `SharedArrayBuffer`, por lo que no hace falta activar COOP/COEP (activarlas rompería la descarga del modelo desde Hugging Face). `coreURL`, `wasmURL` y `classWorkerURL` apuntan a `/ffmpeg/…` en el mismo origen, nunca a un CDN.

**Render y exportación.** El video se dibuja fotograma a fotograma en un canvas (con `requestVideoFrameCallback`) junto con los subtítulos, y se captura con `MediaRecorder` usando el audio original enrutado por `MediaStreamDestination`. En Safari la grabación ya sale en MP4 (H.264/AAC) y se descarga directo; en Chrome/Firefox sale WebM y FFmpeg lo transcodifica a `libx264` + `aac` con `-movflags +faststart`. El archivo final siempre es `video-subtitulado.mp4`.

La misma función `drawSubtitles` se usa en la vista previa y en la exportación, así que el resultado descargado coincide con lo que se ve.

**Notas de rendimiento.** El render corre a velocidad de reproducción real: un video de 60 s tarda ~60 s en renderizar más el tiempo de conversión. Está pensado para clips cortos de redes sociales. Al terminar se liberan Object URLs, AudioContexts, tracks, buffers y los archivos temporales del sistema de archivos virtual de FFmpeg.

## Estructura

```
.
├── index.html
├── package.json
├── vite.config.js
├── scripts/
│   └── copy-ffmpeg-assets.mjs     # copia core + worker a public/ffmpeg
├── public/ffmpeg/                 # generado (no se versiona)
└── src/
    ├── main.jsx
    ├── App.jsx                    # flujo completo, estados y errores
    ├── styles.css
    ├── components/
    │   ├── Preview.jsx            # video + canvas de subtítulos
    │   └── StyleControls.jsx
    └── lib/
        ├── audio.js               # MP4 → Float32Array PCM 16 kHz mono
        ├── whisper.worker.js      # Whisper en Web Worker
        ├── transcriber.js         # puente UI ↔ worker
        ├── subtitles.js           # palabras → bloques, SRT
        ├── draw.js                # dibujo de subtítulos en canvas
        ├── render.js              # canvas + MediaRecorder
        └── ffmpegClient.js        # carga de FFmpeg y conversión a MP4
```

## Si algo falla

La app muestra la etapa exacta y el mensaje, con un botón para reintentar. Casos típicos:

- **“No se pudo cargar FFmpeg”**: falta `public/ffmpeg`. Ejecuta `npm run setup:ffmpeg` y recarga.
- **“El video no tiene una pista de audio con voz audible”**: el MP4 está mudo o el audio es silencio.
- **Descarga del modelo lenta**: Whisper Base pesa ~150 MB la primera vez; Small, ~500 MB.
- **Modelo sin timestamps por palabra**: la app cae a timestamps por segmento automáticamente; puedes desactivar “Resaltar palabra actual” si el resaltado te parece impreciso.
