/**
 * Extraccion de audio del MP4 -> Float32Array PCM mono a 16 kHz.
 *
 * IMPORTANTE: Whisper (transformers.js) espera un Float32Array, NO un Blob.
 * Pasar un Blob produce el error "e.subarray is not a function".
 * Aqui siempre devolvemos un TypedArray listo para el modelo.
 */
import { extractWavWithFFmpeg } from './ffmpegClient.js'

const TARGET_SAMPLE_RATE = 16000

function getAudioContextClass() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) throw new Error('Tu navegador no soporta Web Audio API.')
  return AC
}

async function decode(arrayBuffer) {
  const AC = getAudioContextClass()
  const ctx = new AC()
  try {
    // decodeAudioData consume el ArrayBuffer: se pasa una copia.
    return await ctx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    // Liberamos el contexto siempre.
    if (ctx.state !== 'closed') await ctx.close()
  }
}

async function toMono16k(audioBuffer) {
  const frames = Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE)
  if (frames <= 0) throw new Error('La pista de audio está vacía.')

  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const offline = new OAC(1, frames, TARGET_SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offline.destination) // mezcla a mono automaticamente
  source.start(0)
  const rendered = await offline.startRendering()

  // Copia del canal 0: Float32Array normal, transferible al worker.
  return new Float32Array(rendered.getChannelData(0))
}

/**
 * @param {File} file
 * @param {{ onStatus?: (msg:string)=>void }} opts
 * @returns {Promise<{ samples: Float32Array, duration: number, hasAudio: boolean }>}
 */
export async function extractAudio(file, { onStatus } = {}) {
  const buffer = await file.arrayBuffer()

  let audioBuffer = null
  try {
    audioBuffer = await decode(buffer)
  } catch (err) {
    // Algunos MP4 (audio poco comun) no los decodifica el navegador:
    // segundo intento re-codificando con FFmpeg a WAV PCM 16 kHz mono.
    onStatus?.('El navegador no pudo decodificar el audio. Reintentando con FFmpeg...')
    try {
      const wav = await extractWavWithFFmpeg(file)
      audioBuffer = await decode(wav.buffer)
    } catch (err2) {
      throw new Error(
        `No se pudo extraer el audio. ${err2?.message || err?.message || 'Formato no soportado.'}`
      )
    }
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    return { samples: new Float32Array(0), duration: 0, hasAudio: false }
  }

  const samples = await toMono16k(audioBuffer)

  // Comprobacion de silencio total / pista inexistente.
  let peak = 0
  for (let i = 0; i < samples.length; i += 37) {
    const v = Math.abs(samples[i])
    if (v > peak) peak = v
  }

  return {
    samples,
    duration: audioBuffer.duration,
    hasAudio: peak > 0.0005,
  }
}
