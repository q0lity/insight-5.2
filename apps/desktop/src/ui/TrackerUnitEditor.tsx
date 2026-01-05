import { useEffect, useState } from 'react'
import type { TrackerUnit } from '../storage/ecosystem'

function numberOrNull(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function presetsToString(presets: number[]) {
  return presets.join(', ')
}

function parsePresets(raw: string) {
  return raw
    .split(/[,\s]+/)
    .map((p) => Number(p))
    .filter((p) => Number.isFinite(p))
}

export function TrackerUnitEditor(props: { unit: TrackerUnit; onChange: (next: TrackerUnit) => void }) {
  const { unit } = props
  const [presetDraft, setPresetDraft] = useState(() => presetsToString(unit.presets))

  useEffect(() => {
    setPresetDraft(presetsToString(unit.presets))
  }, [unit.presets])

  return (
    <div className="space-y-3">
      <div className="detailGrid">
        <label>
          Unit label
          <input
            className="detailSmall"
            value={unit.label}
            onChange={(e) => {
              const label = e.target.value.trim() || 'value'
              props.onChange({ ...unit, label })
            }}
            placeholder="score / oz"
          />
        </label>
        <label>
          Step
          <input
            className="detailSmall"
            value={unit.step ?? ''}
            onChange={(e) => props.onChange({ ...unit, step: numberOrNull(e.target.value) })}
            placeholder="1"
          />
        </label>
      </div>

      <div className="detailGrid">
        <label>
          Min
          <input
            className="detailSmall"
            value={unit.min ?? ''}
            onChange={(e) => props.onChange({ ...unit, min: numberOrNull(e.target.value) })}
            placeholder="0"
          />
        </label>
        <label>
          Max
          <input
            className="detailSmall"
            value={unit.max ?? ''}
            onChange={(e) => props.onChange({ ...unit, max: numberOrNull(e.target.value) })}
            placeholder="10"
          />
        </label>
      </div>

      <label>
        Presets
        <input
          className="detailSmall"
          value={presetDraft}
          onChange={(e) => setPresetDraft(e.target.value)}
          onBlur={() => props.onChange({ ...unit, presets: parsePresets(presetDraft) })}
          placeholder="1, 5, 10"
        />
      </label>
    </div>
  )
}
