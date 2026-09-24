/**
 * Carga de FFmpeg.wasm 100% desde el mismo origen.
 *
 * - coreURL / wasmURL / classWorkerURL apuntan a /ffmpeg/... (carpeta public).
 * - Los archivos los copia scripts/copy-ffmpeg-assets.mjs desde node_modules
 *   en cada "npm install", "npm run dev" y "npm run build".
 * - Nunca se crea un Worker desde un CDN, por lo que el error
 *   "cannot be accessed from origin 'null'" no puede ocurrir.
 * - Se usa el core de un solo hilo: no requiere SharedArrayBuffer ni COOP/COEP.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

let instance = null
let loadPromise = null
const listeners = { log: null, progress: null }

function assetURL(relative) {
  const base = import.meta.env.BASE_URL || '/'
  return new URL(`${base}${relative}`.replace(/\/{2,}/g, '/'), document.baseURI).href
}

export function isFFmpegLoaded() {
  return Boolean(instance && instance.loaded)
}

/**
 * Devuelve una instancia cargada de FFmpeg.
 * @param {{ onLog?: Function, onProgress?: Function }} hooks
 */
export async function getFFmpeg({ onLog, onProgress } = {}) {
  listeners.log = onLog || null
  listeners.progress = onProgress || null

  if (instance && instance.loaded) return instance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', ({ message }) => listeners.log?.(message))
    ffmpeg.on('progress', ({ progress }) => listeners.progress?.(progress))

    try {
      await ffmpeg.load({
        coreURL: assetURL('ffmpeg/ffmpeg-core.js'),
        wasmURL: assetURL('ffmpeg/ffmpeg-core.wasm'),
        classWorkerURL: assetURL('ffmpeg/esm/worker.js'),
      })
    } catch (err) {
      loadPromise = null
      throw new Error(
        'No se pudo cargar FFmpeg. Verifica que la aplicación se esté sirviendo por HTTP ' +
          '(npm run dev / npm run preview) y que exista la carpeta public/ffmpeg ' +
          `(npm run setup:ffmpeg). Detalle: ${err?.message || err}`
      )
    }

    instance = ffmpeg
    return ffmpeg
  })()

  return loadPromise
}

/** Convierte el video grabado (WebM/MP4) a MP4 H.264 + AAC con faststart. */
export async function convertToMp4(blob, { hasAudio = true, onProgress, onLog } = {}) {
  const ffmpeg = await getFFmpeg({ onProgress, onLog })

  const inputName = blob.type.includes('mp4') ? 'grabacion.mp4' : 'grabacion.webm'
  const outputName = 'video-subtitulado.mp4'

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(blob))

    const audioArgs = hasAudio ? ['-c:a', 'aac', '-b:a', '160k', '-ar', '48000'] : ['-an']

    const code = await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'high',
      ...audioArgs,
      '-movflags', '+faststart',
      outputName,
    ])

    if (code !== 0) {
      throw new Error(`FFmpeg terminó con código ${code}.`)
    }

    const data = await ffmpeg.readFile(outputName)
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    if (!bytes.length) throw new Error('FFmpeg generó un archivo vacío.')

    // Copia desacoplada de la memoria de WASM antes de limpiar.
    return new Blob([bytes.slice()], { type: 'video/mp4' })
  } finally {
    // Limpieza de archivos temporales dentro del FS virtual.
    for (const name of [inputName, outputName]) {
      try {
        await ffmpeg.deleteFile(name)
      } catch {
        /* el archivo puede no existir si fallo antes */
      }
    }
  }
}

/** Plan B para extraer audio cuando decodeAudioData falla: WAV PCM 16 kHz mono. */
export async function extractWavWithFFmpeg(file, { onProgress, onLog } = {}) {
  const ffmpeg = await getFFmpeg({ onProgress, onLog })
  const inputName = 'entrada-audio.mp4'
  const outputName = 'audio.wav'

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    const code = await ffmpeg.exec([
      '-i', inputName,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-c:a', 'pcm_s16le',
      outputName,
    ])
    if (code !== 0) throw new Error(`FFmpeg terminó con código ${code}.`)
    const data = await ffmpeg.readFile(outputName)
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    return bytes.slice()
  } finally {
    for (const name of [inputName, outputName]) {
      try {
        await ffmpeg.deleteFile(name)
      } catch {
        /* noop */
      }
    }
  }
}

/** Libera la instancia y su worker. */
export function terminateFFmpeg() {
  try {
    instance?.terminate()
  } catch {
    /* noop */
  }
  instance = null
  loadPromise = null
}
