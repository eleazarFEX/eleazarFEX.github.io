import { useEffect, useState } from 'react'

/**
 * Editor de la transcripción palabra por palabra.
 *
 * Solo se corrige el TEXTO; los tiempos (start/end) de cada palabra
 * no cambian, así que el resaltado por palabra y la sincronía con el
 * video siguen siendo correctos después de editar.
 *
 * Recibe `blocks` (no `words` sueltas) para poder mostrar la transcripción
 * agrupada tal como se ve en los subtítulos, pero calcula el índice global
 * de cada palabra dentro del arreglo `words` de App para poder actualizarlo
 * ahí. Esto asume que `groupWords` reparte TODAS las palabras en orden y
 * sin descartar ninguna (así es como está implementado en subtitles.js).
 */
export default function TranscriptEditor({ blocks, onChangeWord, disabled }) {
  if (!blocks || !blocks.length) return null

  let globalIndex = -1

  return (
    <div className="transcript-editor">
      {blocks.map((block, bi) => {
        return (
          <div className="transcript-block" key={bi}>
            {block.words.map((word) => {
              globalIndex += 1
              const index = globalIndex
              return (
                <WordInput
                  key={index}
                  word={word}
                  disabled={disabled}
                  onCommit={(text) => onChangeWord(index, text)}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function WordInput({ word, disabled, onCommit }) {
  const [value, setValue] = useState(word.text)

  // Si llega una transcripción nueva (o se corrige desde otro lado),
  // sincronizamos el valor mostrado con el dato real.
  useEffect(() => {
    setValue(word.text)
  }, [word.text])

  const commit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      // No se permiten palabras vacías: dejarían un hueco en el subtítulo
      // y una línea vacía en el .srt. Revertimos al texto anterior.
      setValue(word.text)
      return
    }
    if (trimmed !== word.text) onCommit(trimmed)
    else setValue(trimmed)
  }

  return (
    <input
      className="word-input"
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setValue(word.text)
          e.currentTarget.blur()
        }
      }}
      style={{ width: `${Math.max(2, value.length + 1)}ch` }}
      title={`${word.start.toFixed(2)}s – ${word.end.toFixed(2)}s`}
      spellCheck={false}
      autoComplete="off"
      aria-label={`Palabra en ${word.start.toFixed(2)}s`}
    />
  )
}
