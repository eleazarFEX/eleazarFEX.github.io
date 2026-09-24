import { useEffect, useRef, useState } from 'react'
import { drawSubtitles } from '../lib/draw.js'
import { getActiveBlock } from '../lib/subtitles.js'

/**
 * Vista previa: el <video> nativo (reproducir, pausar, mover la barra de tiempo)
 * con un canvas encima que dibuja los subtitulos del timestamp actual.
 * Usa la misma funcion de dibujo que la exportacion.
 */
export default function Preview({ src, blocks, style }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const stateRef = useRef({ blocks, style })
  const [ratio, setRatio] = useState(16 / 9)

  stateRef.current = { blocks, style }

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const handleMeta = () => {
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      if (video.videoWidth && video.videoHeight) {
        setRatio(video.videoWidth / video.videoHeight)
      }
    }

    video.addEventListener('loadedmetadata', handleMeta)
    if (video.readyState >= 1) handleMeta()

    const ctx = canvas.getContext('2d')
    const loop = () => {
      const { blocks: b, style: s } = stateRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (b && b.length) {
        const time = video.currentTime
        const block = getActiveBlock(b, time)
        drawSubtitles(ctx, block, time, s, canvas.width, canvas.height)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      video.removeEventListener('loadedmetadata', handleMeta)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [src])

  return (
    <div className="preview" style={{ aspectRatio: String(ratio) }}>
      <video ref={videoRef} src={src} controls playsInline preload="metadata" />
      <canvas ref={canvasRef} className="preview-overlay" />
    </div>
  )
}
