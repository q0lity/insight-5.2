import { useState } from 'react'

type ChipInputProps = {
  label?: string
  value: string[]
  placeholder?: string
  parse: (raw: string) => string[]
  onChange: (next: string[]) => void
}

function uniqStrings(items: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

export function ChipInput(props: ChipInputProps) {
  const [draft, setDraft] = useState('')

  function commitDraft() {
    const next = props.parse(draft)
    if (!next.length) return
    props.onChange(uniqStrings([...props.value, ...next]))
    setDraft('')
  }

  return (
    <div className="detailRow">
      {props.label ? <div className="detailLabel">{props.label}</div> : null}
      <div className="detailChips">
        {props.value.map((item) => (
          <button
            key={item}
            className="detailChip"
            onClick={() => props.onChange(props.value.filter((x) => x !== item))}
            type="button">
            {item}
            <span className="detailChipRemove">×</span>
          </button>
        ))}
        <input
          className="detailChipInput"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ',') return
            e.preventDefault()
            commitDraft()
          }}
          onBlur={() => commitDraft()}
          placeholder={props.placeholder}
        />
      </div>
    </div>
  )
}

export function parseCommaList(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseTagList(raw: string) {
  return raw
    .split(/[, ]+/)
    .map((item) => {
      const trimmed = item.trim()
      if (!trimmed) return ''
      return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
    })
    .filter(Boolean)
}
