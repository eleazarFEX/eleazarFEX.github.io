import { FONT_OPTIONS } from '../lib/draw.js'

export default function StyleControls({ style, onChange, disabled }) {
  const set = (key) => (event) => {
    const target = event.target
    const value =
      target.type === 'checkbox'
        ? target.checked
        : target.type === 'range' || target.type === 'number'
          ? Number(target.value)
          : target.value
    onChange({ ...style, [key]: value })
  }

  return (
    <div className="controls">
      <label className="field">
        <span>Tipografía</span>
        <select value={style.fontFamily} onChange={set('fontFamily')} disabled={disabled}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>
          Tamaño <em>{style.sizePct}% de la altura</em>
        </span>
        <input
          type="range"
          min="3"
          max="14"
          step="0.5"
          value={style.sizePct}
          onChange={set('sizePct')}
          disabled={disabled}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Color</span>
          <input type="color" value={style.color} onChange={set('color')} disabled={disabled} />
        </label>
        <label className="field">
          <span>Resaltado</span>
          <input
            type="color"
            value={style.highlightColor}
            onChange={set('highlightColor')}
            disabled={disabled}
          />
        </label>
      </div>

      <label className="field">
        <span>
          Posición <em>{style.positionPct}% desde arriba</em>
        </span>
        <input
          type="range"
          min="10"
          max="92"
          step="1"
          value={style.positionPct}
          onChange={set('positionPct')}
          disabled={disabled}
        />
      </label>

      <label className="field">
        <span>
          Palabras por bloque <em>{style.wordsPerBlock}</em>
        </span>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          value={style.wordsPerBlock}
          onChange={set('wordsPerBlock')}
          disabled={disabled}
        />
      </label>

      <label className="field check">
        <input
          type="checkbox"
          checked={style.highlightWord}
          onChange={set('highlightWord')}
          disabled={disabled}
        />
        <span>Resaltar palabra actual</span>
      </label>

      <label className="field check">
        <input
          type="checkbox"
          checked={style.uppercase}
          onChange={set('uppercase')}
          disabled={disabled}
        />
        <span>Texto en mayúsculas</span>
      </label>
    </div>
  )
}
