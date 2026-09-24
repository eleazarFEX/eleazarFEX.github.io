/**
 * Renderizado: video original + subtitulos quemados en un canvas,
 * capturado con MediaRecorder junto con el audio original.
 *
 * El resultado es un blob intermedio (WebM VP8/Opus en Chrome y Firefox,
 * MP4 H.264/AAC en Safari). Despues ffmpegClient.convertToMp4 lo entrega
 * siempre como MP4 H.264 + AAC.
 */
import { drawSubtitles } from './draw.js'
import { getActiveBlock } from './subtitles.js'

const CANDIDATE_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // Safari: ya es MP4
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Tu navegador no soporta MediaRecorder. Usa Chrome, Edge, Firefox o Safari 17+.')
  }
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  throw new Error('No se encontró un formato de grabación soportado por el navegador.')
}

const waitFor = (el, event) =>
  new Promise((resolve, reject) => {
    const ok = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error(`Fallo al preparar el video (evento ${event}).`))
    }
    const cleanup = () => {
      el.removeEventListener(event, ok)
      el.removeEventListener('error', fail)
    }
    el.addEventListener(event, ok, { once: true })
    el.addEventListener('error', fail, { once: true })
  })

/**
 * @param {{file:File, blocks:Array, style:object, hasAudio:boolean,
 *          onProgress?:(n:number)=>void}} params
 * @returns {Promise<{blob:Blob, mimeType:string}>}
 */
export async function renderVideoWithSubtitles({ file, blocks, style, hasAudio, onProgress }) {
  const mimeType = pickMimeType()
  const url = URL.createObjectURL(file)

  const video = document.createElement('video')
  video.src = url
  video.crossOrigin = 'anonymous'
  video.playsInline = true
  video.preload = 'auto'
  video.muted = false
  video.volume = 1

  let audioContext = null
  let canvasStream = null
  let recorder = null
  let rafId = null
  let frameCallbackId = null

  try {
    await waitFor(video, 'loadedmetadata')
    if (video.readyState < 2) await waitFor(video, 'loadeddata')

    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('No se pudo leer la duración del video.')
    }

    // H.264 requiere dimensiones pares.
    const width = Math.max(2, Math.floor(video.videoWidth / 2) * 2)
    const height = Math.max(2, Math.floor(video.videoHeight / 2) * 2)
    if (!width || !height) throw new Error('El video no tiene pista de imagen válida.')

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })

    const drawFrame = () => {
      ctx.drawImage(video, 0, 0, width, height)
      const block = getActiveBlock(blocks, video.currentTime)
      drawSubtitles(ctx, block, video.currentTime, style, width, height)
    }

    // Primer fotograma antes de empezar a grabar.
    video.currentTime = 0
    await waitFor(video, 'seeked')
    drawFrame()

    canvasStream = canvas.captureStream(30)
    const tracks = [...canvasStream.getVideoTracks()]

    if (hasAudio) {
      const AC = window.AudioContext || window.webkitAudioContext
      audioContext = new AC()
      if (audioContext.state === 'suspended') await audioContext.resume()
      const source = audioContext.createMediaElementSource(video)
      const destination = audioContext.createMediaStreamDestination()
      // Solo al stream: la reproducción durante el render es silenciosa.
      source.connect(destination)
      tracks.push(...destination.stream.getAudioTracks())
    }

    const stream = new MediaStream(tracks)
    const bitrate = Math.min(16_000_000, Math.max(3_000_000, Math.round(width * height * 0.25)))
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
      audioBitsPerSecond: 160_000,
    })

    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    const recorded = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve()
      recorder.onerror = (e) =>
        reject(new Error(`Fallo la grabación del video: ${e?.error?.message || 'error desconocido'}`))
    })

    const loop = () => {
      drawFrame()
      onProgress?.(Math.min(0.999, video.currentTime / duration))
      if (video.ended || video.paused) return
      if (video.requestVideoFrameCallback) {
        frameCallbackId = video.requestVideoFrameCallback(loop)
      } else {
        rafId = requestAnimationFrame(loop)
      }
    }

    recorder.start(500)
    await video.play()
    loop()

    // Fin normal + red de seguridad por si "ended" no llega.
    await Promise.race([
      waitFor(video, 'ended'),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('El renderizado tardó demasiado y se canceló.')),
          (duration + 30) * 1000
        )
      ),
    ])

    drawFrame()
    // Pequeño margen para que el último fragmento entre en la grabación.
    await new Promise((r) => setTimeout(r, 350))
    if (recorder.state !== 'inactive') recorder.stop()
    await recorded

    const blob = new Blob(chunks, { type: mimeType.split(';')[0] })
    if (!blob.size) throw new Error('La grabación quedó vacía.')

    onProgress?.(1)
    return { blob, mimeType }
  } finally {
    if (frameCallbackId && video.cancelVideoFrameCallback) {
      video.cancelVideoFrameCallback(frameCallbackId)
    }
    if (rafId) cancelAnimationFrame(rafId)
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop()
    } catch {
      /* noop */
    }
    canvasStream?.getTracks().forEach((t) => t.stop())
    try {
      video.pause()
    } catch {
      /* noop */
    }
    video.removeAttribute('src')
    video.load()
    if (audioContext && audioContext.state !== 'closed') {
      try {
        await audioContext.close()
      } catch {
        /* noop */
      }
    }
    URL.revokeObjectURL(url)
  }
}
