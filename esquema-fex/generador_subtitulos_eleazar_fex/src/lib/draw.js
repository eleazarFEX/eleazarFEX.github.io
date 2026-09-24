/**
 * Dibujo de subtitulos sobre un canvas.
 * Se usa EXACTAMENTE la misma funcion en la vista previa y en la exportacion,
 * asi que lo que se ve es lo que se descarga.
 */

const MIN_FONT_SIZE = 14
const MAX_LINES = 2

export const FONT_OPTIONS = [
  { label: 'Arial Black (impacto)', value: '"Arial Black", "Arial Bold", Impact, sans-serif' },
  { label: 'Impact', value: 'Impact, "Arial Black", sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Tahoma, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Courier New (mono)', value: '"Courier New", monospace' },
  { label: 'Sistema', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
]

function layoutLines(ctx, words, maxWidth, uppercase) {
  const spaceWidth = ctx.measureText(' ').width
  const lines = []
  let current = { words: [], width: 0 }

  for (const word of words) {
    const display = uppercase ? word.text.toUpperCase() : word.text
    const width = ctx.measureText(display).width
    const addition = current.words.length ? spaceWidth + width : width

    if (current.words.length && current.width + addition > maxWidth) {
      lines.push(current)
      current = { words: [], width: 0 }
    }

    const finalAddition = current.words.length ? spaceWidth + width : width
    current.words.push({ ...word, display, width })
    current.width += finalAddition
  }

  if (current.words.length) lines.push(current)
  return { lines, spaceWidth }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|null} block  bloque activo {start,end,words:[{text,start,end}]}
 * @param {number} time        segundo actual del video
 * @param {object} style       estilo configurado por el usuario
 * @param {number} W canvas width
 * @param {number} H canvas height
 */
export function drawSubtitles(ctx, block, time, style, W, H) {
  if (!block || !block.words?.length) return

  const maxWidth = W * 0.88
  let fontSize = Math.max(MIN_FONT_SIZE, Math.round((H * style.sizePct) / 100))
  let layout = null

  // Reducimos el tamano hasta que el bloque quepa en dos lineas.
  for (let attempt = 0; attempt < 30; attempt++) {
    ctx.font = `900 ${fontSize}px ${style.fontFamily}`
    layout = layoutLines(ctx, block.words, maxWidth, style.uppercase)
    const fits =
      layout.lines.length <= MAX_LINES && layout.lines.every((l) => l.width <= maxWidth + 1)
    if (fits || fontSize <= MIN_FONT_SIZE) break
    fontSize = Math.max(MIN_FONT_SIZE, Math.round(fontSize * 0.93))
  }

  const lines = layout.lines.slice(0, MAX_LINES)
  const lineHeight = fontSize * 1.16
  const totalHeight = lines.length * lineHeight

  // Posicion vertical del centro del bloque, siempre dentro del area visible.
  const margin = H * 0.035
  let centerY = (H * style.positionPct) / 100
  centerY = Math.min(H - margin - totalHeight / 2, Math.max(margin + totalHeight / 2, centerY))

  ctx.save()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  ctx.lineWidth = Math.max(2, fontSize * 0.17)
  ctx.strokeStyle = '#000000'
  ctx.font = `900 ${fontSize}px ${style.fontFamily}`

  let y = centerY - totalHeight / 2 + lineHeight / 2

  for (const line of lines) {
    let x = (W - line.width) / 2
    for (const word of line.words) {
      const isActive =
        style.highlightWord && time >= word.start - 0.02 && time <= word.end + 0.02

      // Contorno negro grueso (con sombra suave para separar del fondo).
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = fontSize * 0.18
      ctx.shadowOffsetY = fontSize * 0.04
      ctx.strokeText(word.display, x, y)

      // Relleno sin sombra para que el color quede limpio.
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
      ctx.fillStyle = isActive ? style.highlightColor : style.color
      ctx.fillText(word.display, x, y)

      x += word.width + layout.spaceWidth
    }
    y += lineHeight
  }

  ctx.restore()
}
