/**
 * Puente entre la UI y el worker de Whisper.
 * El worker se crea desde el mismo origen (Vite lo compila como modulo ES).
 */
let worker = null

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./whisper.worker.js', import.meta.url), {
    type: 'module',
    name: 'whisper',
  })
  return worker
}

/**
 * @param {Float32Array} samples PCM mono 16 kHz
 * @param {{model:string, language:string, onStage?:Function, onModelProgress?:Function, onWarn?:Function}} opts
 */
export function transcribe(samples, { model, language, onStage, onModelProgress, onWarn }) {
  return new Promise((resolve, reject) => {
    const w = getWorker()

    const handleMessage = (event) => {
      const msg = event.data || {}
      switch (msg.type) {
        case 'stage':
          onStage?.(msg.stage)
          break
        case 'model-progress':
          onModelProgress?.(msg.payload)
          break
        case 'warn':
          onWarn?.(msg.message)
          break
        case 'result':
          cleanup()
          resolve(msg)
          break
        case 'error':
          cleanup()
          reject(new Error(msg.message))
          break
        default:
          break
      }
    }

    const handleError = (err) => {
      cleanup()
      reject(new Error(err?.message || 'Fallo interno del worker de transcripción.'))
    }

    function cleanup() {
      w.removeEventListener('message', handleMessage)
      w.removeEventListener('error', handleError)
    }

    w.addEventListener('message', handleMessage)
    w.addEventListener('error', handleError)

    // Copia transferible: el buffer original queda vacío en el hilo principal,
    // por eso se envía una copia y así el audio sigue disponible para reintentos.
    const copy = new Float32Array(samples)
    w.postMessage({ type: 'transcribe', audio: copy, model, language }, [copy.buffer])
  })
}

export function disposeTranscriber() {
  if (!worker) return
  try {
    worker.postMessage({ type: 'dispose' })
    worker.terminate()
  } catch {
    /* noop */
  }
  worker = null
}
