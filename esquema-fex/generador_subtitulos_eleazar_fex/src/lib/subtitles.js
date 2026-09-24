/**
 * Palabras -> bloques de subtitulos sincronizados.
 * Las marcas de tiempo provienen SIEMPRE de la transcripcion.
 */

const END_OF_SENTENCE = /[.!?…]$/
const SOFT_BREAK = /[,;:]$/

/**
 * Convierte los chunks de transformers.js en una lista plana de palabras
 * con start/end saneados y monotonos.
 */
export function normalizeWords(chunks, { segmentLevel = false, duration = 0 } = {}) {
  const raw = []

  for (const chunk of chunks || []) {
    const text = (chunk.text ?? '').trim()
    if (!text) continue
    const [rawStart, rawEnd] = chunk.timestamp || []

    if (!segmentLevel) {
      raw.push({ text, start: numberOrNull(rawStart), end: numberOrNull(rawEnd) })
      continue
    }

    // Timestamps por segmento: repartimos el tiempo entre las palabras
    // proporcionalmente a su longitud (aproximacion estable y sin inventar texto).
    const words = text.split(/\s+/).filter(Boolean)
    const start = numberOrNull(rawStart) ?? 0
    const end = numberOrNull(rawEnd) ?? start + Math.max(0.4, words.length * 0.32)
    const totalChars = words.reduce((acc, w) => acc + w.length, 0) || 1
    let cursor = start
    for (const w of words) {
      const share = ((end - start) * w.length) / totalChars
      raw.push({ text: w, start: cursor, end: cursor + share })
      cursor += share
    }
  }

  // Saneado: rellenar nulos, forzar orden creciente y duracion minima.
  const words = []
  let previousEnd = 0
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    let start = item.start ?? previousEnd
    if (start < previousEnd) start = previousEnd
    let end = item.end ?? start + estimateDuration(item.text)
    if (end <= start) end = start + estimateDuration(item.text)
    if (duration > 0) {
      start = Math.min(start, duration)
      end = Math.min(end, duration)
      if (end <= start) end = Math.min(duration, start + 0.08)
    }
    words.push({ text: item.text, start, end })
    previousEnd = end
  }

  return words
}

function numberOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function estimateDuration(text) {
  return Math.min(0.9, Math.max(0.18, text.length * 0.07))
}

/**
 * Agrupa palabras en bloques: por cantidad maxima, por pausa larga
 * y por final de frase.
 */
export function groupWords(words, wordsPerBlock = 4) {
  const max = Math.max(1, Math.min(10, wordsPerBlock | 0))
  const blocks = []
  let current = []

  const push = () => {
    if (!current.length) return
    blocks.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      words: current,
    })
    current = []
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const previous = current[current.length - 1]
    const gap = previous ? word.start - previous.end : 0

    if (previous && gap > 0.7) push()

    current.push(word)

    const isLast = i === words.length - 1
    if (current.length >= max) push()
    else if (END_OF_SENTENCE.test(word.text)) push()
    else if (SOFT_BREAK.test(word.text) && current.length >= Math.max(2, max - 1)) push()
    else if (isLast) push()
  }
  push()

  // Un bloque no debe desaparecer antes de poder leerse.
  return blocks.map((b, i) => {
    const next = blocks[i + 1]
    const minEnd = b.start + 0.45
    let end = Math.max(b.end, minEnd)
    if (next) end = Math.min(end, next.start)
    if (end <= b.start) end = b.start + 0.2
    return { ...b, end }
  })
}

/** Bloque visible en el segundo indicado (busqueda binaria). */
export function getActiveBlock(blocks, time) {
  if (!blocks || !blocks.length) return null
  let low = 0
  let high = blocks.length - 1
  while (low <= high) {
    const mid = (low + high) >> 1
    const b = blocks[mid]
    if (time < b.start) high = mid - 1
    else if (time > b.end) low = mid + 1
    else return b
  }
  return null
}

/** Export opcional en formato SRT. */
export function blocksToSrt(blocks) {
  return blocks
    .map((b, i) => {
      const text = b.words.map((w) => w.text).join(' ')
      return `${i + 1}\n${srtTime(b.start)} --> ${srtTime(b.end)}\n${text}\n`
    })
    .join('\n')
}

function srtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000))
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  const milli = String(ms % 1000).padStart(3, '0')
  return `${h}:${m}:${s},${milli}`
}
