import type { SharedMeta, CharacterTrait } from '../storage/ecosystem'
import { ChipInput, parseCommaList, parseTagList } from './ChipInput'

const CHARACTER_KEYS: CharacterTrait[] = ['STR', 'INT', 'CON', 'PER']

function toggleCharacter(current: CharacterTrait[], key: CharacterTrait) {
  return current.includes(key) ? current.filter((c) => c !== key) : [...current, key]
}

export type MetaSuggestions = {
  tags?: string[]
  contexts?: string[]
  people?: string[]
  locations?: string[]
  skills?: string[]
  categories?: string[]
  subcategories?: string[]
  goals?: string[]
  projects?: string[]
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

function ChipSuggestions(props: {
  label: string
  options?: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  const allOptions = uniqStrings(props.options ?? [])
  const visible = allOptions.slice(0, 12)
  const remaining = allOptions.length - visible.length
  if (!visible.length) return null
  return (
    <div className="detailRow">
      <div className="detailLabel">{props.label}</div>
      <div className="detailChips">
        {visible.map((opt) => {
          const active = props.selected.includes(opt)
          return (
            <button
              key={opt}
              className={active ? 'detailChip active' : 'detailChip'}
              onClick={() => props.onToggle(opt)}
              type="button">
              {opt}
              {active ? <span className="detailChipRemove">×</span> : null}
            </button>
          )
        })}
        {remaining > 0 ? <span className="text-[10px] font-semibold text-[var(--muted)]">+{remaining}</span> : null}
      </div>
    </div>
  )
}

function SingleChipSuggestions(props: {
  label: string
  options?: string[]
  selected: string | null
  onSelect: (value: string | null) => void
}) {
  const allOptions = uniqStrings(props.options ?? [])
  const visible = allOptions.slice(0, 12)
  const remaining = allOptions.length - visible.length
  if (!visible.length) return null
  return (
    <div className="detailRow">
      <div className="detailLabel">{props.label}</div>
      <div className="detailChips">
        {visible.map((opt) => {
          const active = props.selected === opt
          return (
            <button
              key={opt}
              className={active ? 'detailChip active' : 'detailChip'}
              onClick={() => props.onSelect(active ? null : opt)}
              type="button">
              {opt}
              {active ? <span className="detailChipRemove">×</span> : null}
            </button>
          )
        })}
        {remaining > 0 ? <span className="text-[10px] font-semibold text-[var(--muted)]">+{remaining}</span> : null}
      </div>
    </div>
  )
}

export function MetaEditor(props: { value: SharedMeta; onChange: (next: SharedMeta) => void; suggestions?: MetaSuggestions }) {
  const meta = props.value
  const locations = parseCommaList(meta.location ?? '')
  const importanceValue = meta.importance ?? 5
  const importancePct = Math.round(importanceValue * 10)

  return (
    <div className="space-y-4">
      <ChipInput label="Tags" value={meta.tags} parse={parseTagList} onChange={(tags) => props.onChange({ ...meta, tags })} placeholder="#work #health" />
      <ChipSuggestions
        label="Tag linkers"
        options={props.suggestions?.tags}
        selected={meta.tags}
        onToggle={(value) => {
          const next = meta.tags.includes(value) ? meta.tags.filter((t) => t !== value) : [...meta.tags, value]
          props.onChange({ ...meta, tags: next })
        }}
      />
      <ChipInput label="Context" value={meta.contexts} parse={parseCommaList} onChange={(contexts) => props.onChange({ ...meta, contexts })} placeholder="at computer, at gym" />
      <ChipSuggestions
        label="Context linkers"
        options={props.suggestions?.contexts}
        selected={meta.contexts}
        onToggle={(value) => {
          const next = meta.contexts.includes(value) ? meta.contexts.filter((t) => t !== value) : [...meta.contexts, value]
          props.onChange({ ...meta, contexts: next })
        }}
      />
      <ChipInput label="People" value={meta.people} parse={parseCommaList} onChange={(people) => props.onChange({ ...meta, people })} placeholder="Mom, Alex" />
      <ChipSuggestions
        label="People linkers"
        options={props.suggestions?.people}
        selected={meta.people}
        onToggle={(value) => {
          const next = meta.people.includes(value) ? meta.people.filter((t) => t !== value) : [...meta.people, value]
          props.onChange({ ...meta, people: next })
        }}
      />
      <ChipInput
        label="Location"
        value={locations}
        parse={parseCommaList}
        onChange={(next) => props.onChange({ ...meta, location: next.length ? next.join(', ') : null })}
        placeholder="Home, Gym"
      />
      <ChipSuggestions
        label="Location linkers"
        options={props.suggestions?.locations}
        selected={locations}
        onToggle={(value) => {
          const next = locations.includes(value) ? locations.filter((t) => t !== value) : [...locations, value]
          props.onChange({ ...meta, location: next.length ? next.join(', ') : null })
        }}
      />
      <ChipInput label="Skills" value={meta.skills} parse={parseCommaList} onChange={(skills) => props.onChange({ ...meta, skills })} placeholder="communication, lifting" />
      <ChipSuggestions
        label="Skill linkers"
        options={props.suggestions?.skills}
        selected={meta.skills}
        onToggle={(value) => {
          const next = meta.skills.includes(value) ? meta.skills.filter((t) => t !== value) : [...meta.skills, value]
          props.onChange({ ...meta, skills: next })
        }}
      />

      <div className="detailGrid">
        <label>
          Category
          <input
            className="detailSmall"
            value={meta.category ?? ''}
            onChange={(e) => props.onChange({ ...meta, category: e.target.value.trim() || null })}
            placeholder="Work / Health"
          />
        </label>
        <label>
          Subcategory
          <input
            className="detailSmall"
            value={meta.subcategory ?? ''}
            onChange={(e) => props.onChange({ ...meta, subcategory: e.target.value.trim() || null })}
            placeholder="Clinic / Gym"
          />
        </label>
      </div>
      <SingleChipSuggestions
        label="Category chips"
        options={props.suggestions?.categories}
        selected={meta.category}
        onSelect={(value) => props.onChange({ ...meta, category: value })}
      />
      <SingleChipSuggestions
        label="Subcategory chips"
        options={props.suggestions?.subcategories}
        selected={meta.subcategory}
        onSelect={(value) => props.onChange({ ...meta, subcategory: value })}
      />

      <div className="detailGrid">
        <label>
          Goal
          <input
            className="detailSmall"
            value={meta.goal ?? ''}
            onChange={(e) => props.onChange({ ...meta, goal: e.target.value.trim() || null })}
            placeholder="Get shredded"
          />
        </label>
        <label>
          Project
          <input
            className="detailSmall"
            value={meta.project ?? ''}
            onChange={(e) => props.onChange({ ...meta, project: e.target.value.trim() || null })}
            placeholder="Workout plan"
          />
        </label>
      </div>
      <SingleChipSuggestions
        label="Goal linkers"
        options={props.suggestions?.goals}
        selected={meta.goal}
        onSelect={(value) => props.onChange({ ...meta, goal: value })}
      />
      <SingleChipSuggestions
        label="Project linkers"
        options={props.suggestions?.projects}
        selected={meta.project}
        onSelect={(value) => props.onChange({ ...meta, project: value })}
      />

      <div className="detailGrid">
        <label>
          Importance
          <div className="detailRangeRow">
            <input
              className="detailRange"
              type="range"
              min={0}
              max={10}
              step={1}
              value={meta.importance ?? 5}
              onChange={(e) => props.onChange({ ...meta, importance: Number(e.target.value) })}
            />
            <span className="detailRangeValue">{meta.importance ?? '—'}</span>
            <button
              className="detailRangeClear"
              type="button"
              onClick={() => props.onChange({ ...meta, importance: null })}
              disabled={meta.importance == null}
              aria-label="Clear importance">
              ×
            </button>
          </div>
        </label>
        <label>
          Difficulty / Energy
          <div className="detailRangeRow">
            <input
              className="detailRange"
              type="range"
              min={0}
              max={10}
              step={1}
              value={meta.difficulty ?? 5}
              onChange={(e) => props.onChange({ ...meta, difficulty: Number(e.target.value) })}
            />
            <span className="detailRangeValue">{meta.difficulty ?? '—'}</span>
            <button
              className="detailRangeClear"
              type="button"
              onClick={() => props.onChange({ ...meta, difficulty: null })}
              disabled={meta.difficulty == null}
              aria-label="Clear difficulty">
              ×
            </button>
          </div>
        </label>
        <label>
          Estimate (min)
          <input
            className="detailSmall"
            value={meta.estimateMinutes ?? ''}
            onChange={(e) => {
              const num = Number(e.target.value)
              props.onChange({ ...meta, estimateMinutes: Number.isFinite(num) ? num : null })
            }}
            placeholder="30"
          />
        </label>
      </div>
      <div className="detailRow">
        <div className="detailLabel">Importance multiplier</div>
        <div className="text-xs text-[var(--muted)] font-semibold">
          {meta.importance == null ? 'Default 5/10' : `${importanceValue}/10`} → {importancePct}%
        </div>
      </div>

      <div className="detailRow">
        <div className="detailLabel">Character</div>
        <div className="detailCharacterRow">
          {CHARACTER_KEYS.map((k) => {
            const selected = meta.character.includes(k)
            return (
              <button
                key={k}
                className={selected ? 'detailCharacterBtn active' : 'detailCharacterBtn'}
                onClick={() => props.onChange({ ...meta, character: toggleCharacter(meta.character, k) })}
                type="button">
                {k}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
