import { useEffect, useMemo, useState } from 'react'
import { ASSISTANT_SETTINGS_CHANGED_EVENT, loadSettings, saveSettings, type AssistantMode } from '../../assistant/storage'
import { applyTheme, loadThemePreference, resolveTheme, saveThemePreference, THEME_CHANGED_EVENT, type ThemePreference } from '../../ui/theme'
import { DISPLAY_SETTINGS_CHANGED_EVENT, loadDisplaySettings, saveDisplaySettings, type EventTitleDetail } from '../../ui/display-settings'
import { parseCaptureWithLlm } from '../../nlp/llm-parse'
import { callOpenAiText, openAiApiUrl } from '../../openai'
import { Icon } from '../../ui/icons'
import { defaultTaxonomyRulesText, loadTaxonomyRules, saveTaxonomyRules } from '../../taxonomy/rules'

function normalizeModelId(m: string) {
  return m.trim()
}

function isPreferredGptModel(id: string) {
  const m = normalizeModelId(id)
  return (
    m === 'gpt-5' ||
    m.startsWith('gpt-5-') ||
    m === 'gpt-4.1' ||
    m.startsWith('gpt-4.1-') ||
    m === 'gpt-4o' ||
    m.startsWith('gpt-4o-')
  )
}

function preferredRank(id: string) {
  const m = normalizeModelId(id)
  if (m === 'gpt-5' || m.startsWith('gpt-5-')) return 0
  if (m === 'gpt-4.1' || m.startsWith('gpt-4.1-')) return 1
  if (m === 'gpt-4o' || m.startsWith('gpt-4o-')) return 2
  return 9
}

async function fetchOpenAiModels(apiKey: string) {
  const res = await fetch(openAiApiUrl('/v1/models'), {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  const json = (await res.json()) as any
  const ids: string[] = Array.isArray(json?.data) ? json.data.map((m: any) => String(m?.id ?? '')).filter(Boolean) : []
  return ids
}

async function testChatCompletions(apiKey: string, model: string) {
  const out = await callOpenAiText({
    apiKey,
    model,
    messages: [
      { role: 'system', content: 'Reply with exactly: OK' },
      { role: 'user', content: 'ping' },
    ],
    temperature: 0,
    maxOutputTokens: 40,
  })
  return out.trim()
}

export function SettingsView() {
  const initial = useMemo(() => loadSettings(), [])
  const [saved, setSaved] = useState(() => loadSettings())
  const [themePref, setThemePref] = useState<ThemePreference>(() => loadThemePreference())
  const [displaySettings, setDisplaySettings] = useState(() => loadDisplaySettings())
  const [eventTitleDetail, setEventTitleDetail] = useState<EventTitleDetail>(() => loadDisplaySettings().eventTitleDetail)

  const [draftKey, setDraftKey] = useState(initial.openAiKey ?? '')
  const [draftChatModel, setDraftChatModel] = useState(initial.chatModel ?? 'gpt-4.1-mini')
  const [draftParseModel, setDraftParseModel] = useState(initial.parseModel ?? 'gpt-4.1-mini')

  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [models, setModels] = useState<string[]>(['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o'])
  const [showAllGptModels, setShowAllGptModels] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [rulesText, setRulesText] = useState(() => loadTaxonomyRules().text)
  const [rulesSaved, setRulesSaved] = useState(() => loadTaxonomyRules().text)
  const [rulesStatus, setRulesStatus] = useState('')

  function onThemeChange(next: ThemePreference) {
    setThemePref(next)
    saveThemePreference(next)
    applyTheme(resolveTheme(next))
    window.dispatchEvent(new Event(THEME_CHANGED_EVENT))
  }

  function onTitleDetailChange(next: EventTitleDetail) {
    const updated = { ...displaySettings, eventTitleDetail: next }
    setDisplaySettings(updated)
    setEventTitleDetail(next)
    saveDisplaySettings(updated)
  }

  const dirty =
    (draftKey ?? '') !== (saved.openAiKey ?? '') ||
    normalizeModelId(draftChatModel) !== normalizeModelId(saved.chatModel ?? 'gpt-4.1-mini') ||
    normalizeModelId(draftParseModel) !== normalizeModelId(saved.parseModel ?? 'gpt-4.1-mini')

  useEffect(() => {
    function onChange() {
      const next = loadSettings()
      setSaved(next)
      setDraftKey(next.openAiKey ?? '')
      setDraftChatModel(next.chatModel ?? 'gpt-4.1-mini')
      setDraftParseModel(next.parseModel ?? 'gpt-4.1-mini')
    }
    window.addEventListener(ASSISTANT_SETTINGS_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ASSISTANT_SETTINGS_CHANGED_EVENT, onChange)
  }, [])

  useEffect(() => {
    function onDisplayChange() {
      const next = loadDisplaySettings()
      setDisplaySettings(next)
      setEventTitleDetail(next.eventTitleDetail)
    }
    window.addEventListener(DISPLAY_SETTINGS_CHANGED_EVENT, onDisplayChange)
    return () => window.removeEventListener(DISPLAY_SETTINGS_CHANGED_EVENT, onDisplayChange)
  }, [])

  function onSave() {
    const merged = {
      mode: 'hybrid' as AssistantMode,
      openAiKey: draftKey,
      chatModel: normalizeModelId(draftChatModel) || 'gpt-4.1-mini',
      parseModel: normalizeModelId(draftParseModel) || normalizeModelId(draftChatModel) || 'gpt-4.1-mini',
    }
    saveSettings(merged)
    setSaved(merged)
    setStatus('Saved.')
    setError('')
    window.setTimeout(() => setStatus(''), 1500)
  }

  function onReset() {
    setDraftKey(saved.openAiKey ?? '')
    setDraftChatModel(saved.chatModel ?? 'gpt-4.1-mini')
    setDraftParseModel(saved.parseModel ?? 'gpt-4.1-mini')
    setStatus('')
    setError('')
  }

  async function onRefreshModels() {
    const key = draftKey.trim()
    if (!key) {
      setError('Add an OpenAI API key first.')
      return
    }
    setLoadingModels(true)
    setError('')
    setStatus('Fetching models…')
    try {
      const ids = await fetchOpenAiModels(key)
      const gptIds = ids.filter((id) => id.startsWith('gpt-'))
      const preferred = gptIds.filter(isPreferredGptModel).sort((a, b) => preferredRank(a) - preferredRank(b) || a.localeCompare(b))
      const allSorted = gptIds.sort((a, b) => preferredRank(a) - preferredRank(b) || a.localeCompare(b))
      const list = (showAllGptModels ? allSorted : preferred.length ? preferred : allSorted).slice(0, 200)
      setModels(list.length ? list : models)
      const hasGpt5 = gptIds.some((m) => m === 'gpt-5' || m.startsWith('gpt-5-'))
      setStatus(`Loaded ${list.length} of ${gptIds.length} GPT model(s).${hasGpt5 ? '' : ' (No gpt-5 models returned for this key.)'}`)
    } catch (e: any) {
      setError(e?.message ? String(e.message) : String(e))
      setStatus('')
    } finally {
      setLoadingModels(false)
      window.setTimeout(() => setStatus(''), 2500)
    }
  }

  async function onTestChatModel() {
    const key = draftKey.trim()
    const model = normalizeModelId(draftChatModel)
    if (!key) return setError('Add an OpenAI API key first.')
    if (!model) return setError('Choose a chat model first.')
    setError('')
    setStatus('Testing chat model…')
    try {
      const out = await testChatCompletions(key, model)
      setStatus(out.toUpperCase().includes('OK') ? 'Chat model test: OK' : `Chat model responded: ${out.slice(0, 40)}`)
    } catch (e: any) {
      setError(e?.message ? String(e.message) : String(e))
      setStatus('')
    } finally {
      window.setTimeout(() => setStatus(''), 2500)
    }
  }

  async function onTestParseModel() {
    const key = draftKey.trim()
    const model = normalizeModelId(draftParseModel)
    if (!key) return setError('Add an OpenAI API key first.')
    if (!model) return setError('Choose a parser model first.')
    setError('')
    setStatus('Testing parser model…')
    try {
      const res = await parseCaptureWithLlm({ apiKey: key, model, anchorMs: Date.now(), text: 'call mom tomorrow 8-9pm feeling great 8/10' })
      setStatus(`Parser test: OK (${res.tasks.length} tasks, ${res.events.length} events)`)
    } catch (e: any) {
      setError(e?.message ? String(e.message) : String(e))
      setStatus('')
    } finally {
      window.setTimeout(() => setStatus(''), 2500)
    }
  }

  function onSaveRules() {
    const next = rulesText.trim()
    saveTaxonomyRules(next)
    setRulesSaved(next)
    setRulesStatus('Rules saved.')
    window.setTimeout(() => setRulesStatus(''), 1500)
  }

  function onResetRules() {
    const { text } = loadTaxonomyRules()
    setRulesText(text)
    setRulesSaved(text)
    setRulesStatus('')
  }

  function onTemplateRules() {
    const text = defaultTaxonomyRulesText()
    setRulesText(text)
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="title">Settings</div>
          <div className="subhead">Local settings for AI, parsing, and personalization.</div>
        </div>
      </div>

      <div className="glassCard" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 950 }}>Appearance</div>
        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
            Theme
            <div className="segmented" style={{ justifySelf: 'start' }}>
              {(['light', 'dark', 'system'] as const).map((k) => (
                <button key={k} className={themePref === k ? 'segBtn active' : 'segBtn'} onClick={() => onThemeChange(k)}>
                  {k}
                </button>
              ))}
            </div>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800, marginTop: 12 }}>
            Event titles
            <div className="segmented" style={{ justifySelf: 'start' }}>
              {(['auto', 'full', 'focus'] as const).map((k) => (
                <button key={k} className={eventTitleDetail === k ? 'segBtn active' : 'segBtn'} onClick={() => onTitleDetailChange(k)}>
                  {k}
                </button>
              ))}
            </div>
          </label>
        </div>
      </div>

      <div className="glassCard" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 950 }}>Taxonomy rules</div>
          <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 12 }}>Applied during capture parsing</div>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <textarea
            className="settingsTextarea"
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder={`- match: "drive|commute"\n  category: "Transport"\n  subcategory: "Driving"\n  tags: ["#transport"]`}
            rows={8}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="secondaryButton" onClick={onSaveRules} disabled={rulesText.trim() === rulesSaved.trim()}>
              Save rules
            </button>
            <button className="secondaryButton" onClick={onResetRules} disabled={rulesText.trim() === rulesSaved.trim()}>
              Reset
            </button>
            <button className="secondaryButton" onClick={onTemplateRules}>
              Insert template
            </button>
            <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>
              {rulesText.trim() === rulesSaved.trim() ? 'Up to date' : 'Unsaved changes'}
            </span>
            {rulesStatus ? <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>{rulesStatus}</span> : null}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, lineHeight: 1.35 }}>
            Rules are simple YAML-style lists. Each <code>match</code> is a regex (case-insensitive).
          </div>
        </div>
      </div>

      <div className="glassCard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 950 }}>AI</div>
          <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 12, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Icon name="bolt" size={14} /> Used by Chat + Capture parsing
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="secondaryButton" onClick={onSave} disabled={!dirty}>
              Save
            </button>
            <button className="secondaryButton" onClick={onReset} disabled={!dirty}>
              Reset
            </button>
            <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>{dirty ? 'Unsaved changes' : 'Up to date'}</span>
            {status ? <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800 }}>{status}</span> : null}
            {error ? <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 900 }}>{error}</span> : null}
          </div>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
            OpenAI API key
            <input
              className="detailSmall"
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="sk-…"
            />
          </label>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="secondaryButton" onClick={() => void onRefreshModels()} disabled={loadingModels || draftKey.trim().length === 0}>
              {loadingModels ? 'Loading…' : 'Refresh models'}
            </button>
            <label className="eventCheck" style={{ marginLeft: 2 }}>
              <input type="checkbox" checked={showAllGptModels} onChange={(e) => setShowAllGptModels(e.target.checked)} />
              Show all GPT models
            </label>
            <button className="secondaryButton" onClick={() => void onTestChatModel()} disabled={draftKey.trim().length === 0 || !normalizeModelId(draftChatModel)}>
              Test chat
            </button>
            <button className="secondaryButton" onClick={() => void onTestParseModel()} disabled={draftKey.trim().length === 0 || !normalizeModelId(draftParseModel)}>
              Test parser
            </button>
          </div>

          <div className="eventGrid">
            <label>
              Chat model
              <select
                className="detailSmall"
                value={models.includes(normalizeModelId(draftChatModel)) ? normalizeModelId(draftChatModel) : '__custom__'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__custom__') return
                  setDraftChatModel(v)
                }}>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
              {models.includes(normalizeModelId(draftChatModel)) ? null : (
                <input
                  className="detailSmall"
                  style={{ marginTop: 6 }}
                  value={draftChatModel}
                  onChange={(e) => setDraftChatModel(e.target.value)}
                  placeholder="custom model id"
                />
              )}
            </label>

            <label>
              Parser model
              <select
                className="detailSmall"
                value={models.includes(normalizeModelId(draftParseModel)) ? normalizeModelId(draftParseModel) : '__custom__'}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__custom__') return
                  setDraftParseModel(v)
                }}>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
              {models.includes(normalizeModelId(draftParseModel)) ? null : (
                <input
                  className="detailSmall"
                  style={{ marginTop: 6 }}
                  value={draftParseModel}
                  onChange={(e) => setDraftParseModel(e.target.value)}
                  placeholder="custom model id"
                />
              )}
            </label>
          </div>

          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)', fontWeight: 700, lineHeight: 1.35 }}>
            Note: chat + parsing prefer <code>/v1/responses</code> when supported and fall back to <code>/v1/chat/completions</code>.
          </div>
        </div>
      </div>
    </div>
  )
}
