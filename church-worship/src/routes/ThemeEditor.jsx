import { useState } from 'react'
import SlideCanvas from '../components/SlideCanvas'
import { useContent, DEFAULT_THEME } from '../store/useContent'

const SAMPLE = {
  id: 'sample',
  label: 'Preview',
  body: 'Amazing grace how sweet the sound\nThat saved a wretch like me',
}

const FONTS = [
  "'Inter', system-ui, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "'Courier New', monospace",
]

export default function ThemeEditor() {
  const themes = useContent((s) => s.themes)
  const updateTheme = useContent((s) => s.updateTheme)
  const addTheme = useContent((s) => s.addTheme)
  const removeTheme = useContent((s) => s.removeTheme)

  const [selectedId, setSelectedId] = useState(themes[0]?.id ?? DEFAULT_THEME.id)
  const theme = themes.find((t) => t.id === selectedId) ?? themes[0] ?? DEFAULT_THEME
  const set = (patch) => updateTheme(theme.id, patch)

  return (
    <div className="themes">
      <div className="theme-list">
        <div className="row between">
          <h3>Themes</h3>
          <button className="btn btn-ghost" onClick={() => setSelectedId(addTheme(theme))}>
            + New
          </button>
        </div>
        <ul>
          {themes.map((t) => (
            <li key={t.id}>
              <button className={t.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(t.id)}>
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="theme-preview">
        <SlideCanvas slide={SAMPLE} theme={theme} />
      </div>

      <div className="theme-controls">
        <label className="field">
          <span>Name</span>
          <input value={theme.name} onChange={(e) => set({ name: e.target.value })} />
        </label>

        <label className="field">
          <span>Font</span>
          <select value={theme.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f.split(',')[0].replace(/'/g, '')}
              </option>
            ))}
          </select>
        </label>

        <Range label="Size" min={24} max={140} value={theme.fontSize} onChange={(v) => set({ fontSize: v })} />
        <Range
          label="Weight"
          min={300}
          max={900}
          step={100}
          value={theme.fontWeight}
          onChange={(v) => set({ fontWeight: v })}
        />
        <Range
          label="Line height"
          min={1}
          max={2}
          step={0.05}
          value={theme.lineHeight}
          onChange={(v) => set({ lineHeight: v })}
        />
        <Range
          label="Padding"
          min={0}
          max={320}
          step={10}
          value={theme.padding}
          onChange={(v) => set({ padding: v })}
        />

        <label className="field">
          <span>Text colour</span>
          <input type="color" value={theme.color} onChange={(e) => set({ color: e.target.value })} />
        </label>

        <label className="field">
          <span>Background</span>
          <input
            type="color"
            value={theme.background.kind === 'color' ? theme.background.value : '#000000'}
            onChange={(e) => set({ background: { kind: 'color', value: e.target.value } })}
          />
        </label>

        <Segmented
          label="Align"
          options={['left', 'center', 'right']}
          value={theme.align}
          onChange={(v) => set({ align: v })}
        />
        <Segmented
          label="Vertical"
          options={['top', 'middle', 'bottom']}
          value={theme.valign}
          onChange={(v) => set({ valign: v })}
        />

        <div className="row">
          <Toggle label="Uppercase" value={theme.uppercase} onChange={(v) => set({ uppercase: v })} />
          <Toggle label="Shadow" value={theme.shadow} onChange={(v) => set({ shadow: v })} />
          <Toggle label="Outline" value={theme.outline} onChange={(v) => set({ outline: v })} />
        </div>

        {theme.id !== DEFAULT_THEME.id && (
          <button
            className="btn danger"
            onClick={() => {
              removeTheme(theme.id)
              setSelectedId(DEFAULT_THEME.id)
            }}
          >
            Delete theme
          </button>
        )}
      </div>
    </div>
  )
}

function Range({ label, value, onChange, min, max, step = 1 }) {
  return (
    <label className="field">
      <span>
        {label} <em className="muted">{value}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="segmented">
        {options.map((o) => (
          <button key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
