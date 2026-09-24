import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Preview from './components/Preview.jsx'
import StyleControls from './components/StyleControls.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import { extractAudio } from './lib/audio.js'
import { transcribe, disposeTranscriber } from './lib/transcriber.js'
import { normalizeWords, groupWords, blocksToSrt } from './lib/subtitles.js'
import { renderVideoWithSubtitles } from './lib/render.js'
import { convertToMp4, getFFmpeg, terminateFFmpeg } from './lib/ffmpegClient.js'

const MODELS = [
  { value: 'Xenova/whisper-base', label: 'Whisper Base (equilibrado, ~150 MB)' },
  { value: 'Xenova/whisper-small', label: 'Whisper Small (más preciso, ~500 MB)' },
]

const DEFAULT_STYLE = {
  fontFamily: '"Arial Black", "Arial Bold", Impact, sans-serif',
  sizePct: 7,
  color: '#ffffff',
  highlightColor: '#ffd400',
  positionPct: 76,
  wordsPerBlock: 4,
  highlightWord: true,
  uppercase: false,
}

export default function App() {
  const [file, setFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [model, setModel] = useState(MODELS[0].value)
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [words, setWords] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [phase, setPhase] = useState('idle')
  const [status, setStatus] = useState('Selecciona un video MP4 para empezar.')
  const [progress, setProgress] = useState(null)
  const [warning, setWarning] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const audioRef = useRef(null) // { samples, hasAudio, duration }
  const stageRef = useRef('inicio')
  const downloadUrlRef = useRef(null)

  const blocks = useMemo(
    () => (words ? groupWords(words, style.wordsPerBlock) : null),
    [words, style.wordsPerBlock]
  )

  const busy = ['audio', 'model', 'transcribing', 'building', 'rendering', 'converting'].includes(
    phase
  )
  const canDownload = Boolean(blocks && blocks.length && !busy)

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
      disposeTranscriber()
      terminateFFmpeg()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetResults = useCallback(() => {
    setWords(null)
    setTranscript('')
    setWarning(null)
    setError(null)
    setProgress(null)
    audioRef.current = null
  }, [])

  const handleFile = useCallback(
    (selected) => {
      if (!selected) return
      if (!selected.type.startsWith('video/')) {
        setError({
          stage: 'Selección de archivo',
          message: 'El archivo no es un video. Selecciona un MP4.',
        })
        return
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current)
        downloadUrlRef.current = null
      }
      resetResults()
      setFile(selected)
      setVideoUrl(URL.createObjectURL(selected))
      setPhase('loaded')
      setStatus('Video cargado')
    },
    [resetResults, videoUrl]
  )

  const onDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  // Corrige el texto de una sola palabra (por índice dentro de `words`)
  // sin tocar sus tiempos. blocks/preview/render/SRT se recalculan solos
  // porque todos dependen de `words` vía useMemo / props reactivas.
  const updateWordText = useCallback((index, text) => {
    setWords((prev) => {
      if (!prev || index < 0 || index >= prev.length) return prev
      const next = prev.slice()
      next[index] = { ...next[index], text }
      return next
    })
  }, [])

  async function handleGenerate() {
    if (!file) return
    setError(null)
    setWarning(null)
    setWords(null)
    setTranscript('')

    try {
      stageRef.current = 'Extracción de audio'
      setPhase('audio')
      setStatus('Extrayendo audio...')
      setProgress(null)

      const audio = await extractAudio(file, { onStatus: setStatus })
      if (!audio.hasAudio || audio.samples.length === 0) {
        throw new Error('El video no tiene una pista de audio con voz audible.')
      }
      audioRef.current = audio

      stageRef.current = 'Carga del modelo de reconocimiento'
      setPhase('model')
      setStatus('Cargando modelo de reconocimiento...')

      const result = await transcribe(audio.samples, {
        model,
        language: 'spanish',
        onStage: (stage) => {
          if (stage === 'transcribing') {
            stageRef.current = 'Transcripción'
            setPhase('transcribing')
            setStatus('Transcribiendo...')
            setProgress(null)
          }
        },
        onModelProgress: (p) => {
          if (p?.status === 'progress' && typeof p.progress === 'number') {
            setProgress(p.progress / 100)
            setStatus(`Cargando modelo de reconocimiento... ${Math.round(p.progress)}%`)
          }
        },
        onWarn: (message) => setWarning(message),
      })

      stageRef.current = 'Preparación de subtítulos'
      setPhase('building')
      setStatus('Preparando subtítulos...')

      const normalized = normalizeWords(result.chunks, {
        segmentLevel: result.segmentLevel,
        duration: audio.duration,
      })
      if (!normalized.length) {
        throw new Error('No se detectaron palabras en el audio.')
      }

      setWords(normalized)
      setTranscript(result.text?.trim() || normalized.map((w) => w.text).join(' '))
      setPhase('ready')
      setProgress(null)
      setStatus('¡Listo! Revisa la vista previa y ajusta el estilo.')
    } catch (err) {
      setPhase('error')
      setProgress(null)
      setError({ stage: stageRef.current, message: err?.message || String(err) })
      setStatus('Se detuvo el proceso.')
    }
  }

  async function handleDownload() {
    if (!file || !blocks?.length) return
    setError(null)

    try {
      // Aseguramos que las fuentes estén listas antes de medir texto.
      if (document.fonts?.ready) await document.fonts.ready

      stageRef.current = 'Renderizado del video'
      setPhase('rendering')
      setStatus('Renderizando video...')
      setProgress(0)

      const { blob, mimeType } = await renderVideoWithSubtitles({
        file,
        blocks,
        style,
        hasAudio: audioRef.current?.hasAudio !== false,
        onProgress: (p) => setProgress(p),
      })

      let finalBlob = blob
      if (!mimeType.includes('mp4')) {
        stageRef.current = 'Conversión a MP4'
        setPhase('converting')
        setStatus('Convirtiendo a MP4...')
        setProgress(0)

        // Carga explícita para que un fallo de FFmpeg se reporte aquí y no al final.
        await getFFmpeg({ onProgress: (p) => setProgress(Math.min(1, Math.max(0, p))) })

        finalBlob = await convertToMp4(blob, {
          hasAudio: audioRef.current?.hasAudio !== false,
          onProgress: (p) => setProgress(Math.min(1, Math.max(0, p))),
        })
      }

      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
      const url = URL.createObjectURL(finalBlob)
      downloadUrlRef.current = url

      const link = document.createElement('a')
      link.href = url
      link.download = 'video-subtitulado.mp4'
      document.body.appendChild(link)
      link.click()
      link.remove()

      setPhase('done')
      setProgress(1)
      setStatus(`¡Listo! video-subtitulado.mp4 (${(finalBlob.size / 1024 / 1024).toFixed(1)} MB)`)
    } catch (err) {
      setPhase('error')
      setProgress(null)
      setError({ stage: stageRef.current, message: err?.message || String(err) })
      setStatus('Se detuvo el proceso.')
    }
  }

  function downloadSrt() {
    if (!blocks?.length) return
    const blob = new Blob([blocksToSrt(blocks)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'subtitulos.srt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const retry = () => {
    const stage = stageRef.current
    setError(null)
    if (stage === 'Renderizado del video' || stage === 'Conversión a MP4') handleDownload()
    else handleGenerate()
  }

  return (
    <div className="app">
      <header className="masthead">
        <h1>Generador de Subtítulos</h1>
        <p>Subtítulos automáticos directamente en tu navegador.</p>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>1. Tu video</h2>

          <div
            className={`dropzone${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input
              id="file-input"
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              hidden
            />
            <label htmlFor="file-input" className="btn btn-secondary">
              📁 Seleccionar video
            </label>
            <p className="hint">
              {file ? file.name : 'o arrastra aquí tu MP4 (videos cortos, hasta ~2 minutos)'}
            </p>
          </div>

          {videoUrl && <Preview src={videoUrl} blocks={blocks} style={style} />}

          <label className="field">
            <span>Modelo de reconocimiento</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy}>
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary" onClick={handleGenerate} disabled={!file || busy}>
            🎙️ GENERAR SUBTÍTULOS
          </button>

          <button
            className="btn btn-download"
            onClick={handleDownload}
            disabled={!canDownload}
            title={canDownload ? '' : 'Primero genera los subtítulos'}
          >
            ⬇️ DESCARGAR MP4 CON SUBTÍTULOS
          </button>

          {canDownload && (
            <button className="btn btn-ghost" onClick={downloadSrt}>
              Descargar subtítulos .srt
            </button>
          )}

          <div className="status">
            <p className={`status-text${busy ? ' is-busy' : ''}`}>{status}</p>
            {(busy || phase === 'done') && (
              <div className="bar">
                <div
                  className={`bar-fill${progress === null ? ' is-indeterminate' : ''}`}
                  style={progress === null ? undefined : { width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </div>

          {warning && <p className="note warn">{warning}</p>}

          {error && (
            <div className="note error" role="alert">
              <strong>Falló en: {error.stage}</strong>
              <span>{error.message}</span>
              <button className="btn btn-ghost" onClick={retry}>
                Volver a intentarlo
              </button>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>2. Estilo</h2>
          <StyleControls style={style} onChange={setStyle} disabled={busy} />

          {blocks && blocks.length > 0 && (
            <div className="transcript">
              <h3>Transcripción ({blocks.length} bloques)</h3>
              <p className="transcript-hint">
                Toca una palabra para corregirla si el reconocimiento se equivocó. Los tiempos no
                cambian, así que la sincronía se mantiene.
              </p>
              <TranscriptEditor blocks={blocks} onChangeWord={updateWordText} disabled={busy} />
            </div>
          )}
        </section>
      </main>

      <footer className="foot">
        <p>
          Todo el procesamiento ocurre en tu equipo. La primera transcripción descarga el modelo
          desde Hugging Face y queda en caché del navegador.
        </p>
      </footer>
    </div>
  )
}
