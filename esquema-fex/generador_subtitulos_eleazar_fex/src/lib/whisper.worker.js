/**
 * Worker de transcripcion (Whisper via transformers.js).
 *
 * Recibe SIEMPRE un Float32Array PCM mono 16 kHz. Nunca un Blob.
 * Devuelve chunks con timestamps por palabra; si el modelo no soporta
 * timestamps por palabra, reintenta con timestamps por segmento.
 */
import { pipeline, env } from '@huggingface/transformers'

// Los pesos se descargan desde Hugging Face (no hay modelos locales).
env.allowLocalModels = false

let transcriber = null
let loadedModel = null

async function getTranscriber(model) {
  if (transcriber && loadedModel === model) return transcriber

  if (transcriber) {
    try {
      await transcriber.dispose()
    } catch {
      /* noop */
    }
    transcriber = null
  }

  transcriber = await pipeline('automatic-speech-recognition', model, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p) => {
      self.postMessage({ type: 'model-progress', payload: p })
    },
  })
  loadedModel = model
  return transcriber
}

self.onmessage = async (event) => {
  const { type } = event.data || {}

  if (type === 'dispose') {
    try {
      await transcriber?.dispose()
    } catch {
      /* noop */
    }
    transcriber = null
    loadedModel = null
    return
  }

  if (type !== 'transcribe') return

  const { audio, model, language } = event.data

  try {
    if (!(audio instanceof Float32Array)) {
      throw new Error('El audio recibido no es un Float32Array PCM.')
    }

    self.postMessage({ type: 'stage', stage: 'model' })
    const asr = await getTranscriber(model)

    self.postMessage({ type: 'stage', stage: 'transcribing' })

    const baseOptions = {
      language, // "spanish"
      task: 'transcribe', // nunca traducir
      chunk_length_s: 30,
      stride_length_s: 5,
      temperature: 0,
      no_repeat_ngram_size: 0,
    }

    let output
    let segmentLevel = false

    try {
      output = await asr(audio, { ...baseOptions, return_timestamps: 'word' })
    } catch (err) {
      self.postMessage({
        type: 'warn',
        message:
          'Este modelo no entregó timestamps por palabra (' +
          (err?.message || 'error desconocido') +
          '). Se usarán timestamps por segmento.',
      })
      output = await asr(audio, { ...baseOptions, return_timestamps: true })
      segmentLevel = true
    }

    const chunks = Array.isArray(output?.chunks) ? output.chunks : []
    if (!chunks.length && !output?.text) {
      throw new Error('La transcripción quedó vacía. ¿El video tiene voz audible?')
    }

    self.postMessage({
      type: 'result',
      text: output?.text || '',
      chunks: chunks.map((c) => ({
        text: c.text,
        timestamp: [c.timestamp?.[0] ?? null, c.timestamp?.[1] ?? null],
      })),
      segmentLevel,
    })
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message || String(err) })
  }
}
