import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ASSISTANT_SETTINGS_CHANGED_EVENT, loadSettings, saveSettings, type AssistantMode, AI_MODELS, type WeightUnit, type DistanceUnit } from '../../assistant/storage'
import { applyTheme, loadThemePreference, resolveTheme, saveThemePreference, THEME_CHANGED_EVENT, THEME_LABELS, THEME_PREVIEWS, type ThemePreference, type ResolvedTheme } from '../../ui/theme'
import { DISPLAY_SETTINGS_CHANGED_EVENT, loadDisplaySettings, saveDisplaySettings, type EventTitleDetail } from '../../ui/display-settings'
import { parseCaptureWithLlm } from '../../nlp/llm-parse'
import { callOpenAiText, openAiApiUrl } from '../../openai'
import { Icon } from '../../ui/icons'
import { defaultTaxonomyRulesText, loadTaxonomyRules, saveTaxonomyRules } from '../../taxonomy/rules'
import { getSupabaseClient } from '../../supabase/client'

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
  const [draftNutritionModel, setDraftNutritionModel] = useState(initial.nutritionModel ?? 'gpt-4o-mini')
  const [draftWeightUnit, setDraftWeightUnit] = useState<WeightUnit>(initial.preferredWeightUnit ?? 'lbs')
  const [draftDistanceUnit, setDraftDistanceUnit] = useState<DistanceUnit>(initial.preferredDistanceUnit ?? 'mi')

  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [models, setModels] = useState<string[]>(['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o'])
  const [showAllGptModels, setShowAllGptModels] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [rulesText, setRulesText] = useState(() => loadTaxonomyRules().text)
  const [rulesSaved, setRulesSaved] = useState(() => loadTaxonomyRules().text)
  const [rulesStatus, setRulesStatus] = useState('')
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authBusy, setAuthBusy] = useState(false)
  const [authStatus, setAuthStatus] = useState('')
  const [authError, setAuthError] = useState('')
  const supabaseConfigured = Boolean(getSupabaseClient())

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
    normalizeModelId(draftParseModel) !== normalizeModelId(saved.parseModel ?? 'gpt-4.1-mini') ||
    normalizeModelId(draftNutritionModel) !== normalizeModelId(saved.nutritionModel ?? 'gpt-4o-mini') ||
    draftWeightUnit !== (saved.preferredWeightUnit ?? 'lbs') ||
    draftDistanceUnit !== (saved.preferredDistanceUnit ?? 'mi')

  useEffect(() => {
    function onChange() {
      const next = loadSettings()
      setSaved(next)
      setDraftKey(next.openAiKey ?? '')
      setDraftChatModel(next.chatModel ?? 'gpt-4.1-mini')
      setDraftParseModel(next.parseModel ?? 'gpt-4.1-mini')
      setDraftNutritionModel(next.nutritionModel ?? 'gpt-4o-mini')
      setDraftWeightUnit(next.preferredWeightUnit ?? 'lbs')
      setDraftDistanceUnit(next.preferredDistanceUnit ?? 'mi')
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

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthSession(data.session ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthSession(session)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  function onSave() {
    const merged = {
      mode: 'hybrid' as AssistantMode,
      openAiKey: draftKey,
      chatModel: normalizeModelId(draftChatModel) || 'gpt-4.1-mini',
      parseModel: normalizeModelId(draftParseModel) || normalizeModelId(draftChatModel) || 'gpt-4.1-mini',
      nutritionModel: normalizeModelId(draftNutritionModel) || 'gpt-4o-mini',
      preferredWeightUnit: draftWeightUnit,
      preferredDistanceUnit: draftDistanceUnit,
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
    setDraftNutritionModel(saved.nutritionModel ?? 'gpt-4o-mini')
    setDraftWeightUnit(saved.preferredWeightUnit ?? 'lbs')
    setDraftDistanceUnit(saved.preferredDistanceUnit ?? 'mi')
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

  async function onAuthSubmit() {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setAuthError('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    const email = authEmail.trim()
    const password = authPassword.trim()
    if (!email || !password) {
      setAuthError('Email and password are required.')
      return
    }
    setAuthBusy(true)
    setAuthError('')
    setAuthStatus('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (data.session) {
          setAuthStatus('Account created and signed in.')
        } else {
          setAuthStatus('Check your email to confirm your account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setAuthStatus(data.session ? 'Signed in.' : 'Signed in.')
      }
    } catch (e: any) {
      setAuthError(e?.message ? String(e.message) : String(e))
    } finally {
      setAuthBusy(false)
    }
  }

  async function onAuthSignOut() {
    const supabase = getSupabaseClient()
    if (!supabase) return
    await supabase.auth.signOut()
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
        <div style={{ fontWeight: 950 }}>Account</div>
        {!supabaseConfigured ? (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sync.
          </div>
        ) : authSession ? (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Signed in</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {authSession.user.email ?? authSession.user.id}
              </div>
            </div>
            <button className="secondaryButton" type="button" onClick={onAuthSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                Email
              </label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                Password
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="password"
              />
            </div>
            {authError ? (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#CF423C' }}>{authError}</div>
            ) : null}
            {authStatus ? (
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{authStatus}</div>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button className="primaryButton" type="button" onClick={onAuthSubmit} disabled={authBusy}>
                {authBusy ? 'Working...' : authMode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              >
                {authMode === 'signin' ? 'Create account' : 'Have an account? Sign in'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glassCard" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 950 }}>Appearance</div>
        <div style={{ marginTop: 16 }}>
          {/* Theme selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10 }}>
              Theme
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
              {(['dark', 'light', 'warm', 'olive', 'oliveOrange'] as const).map((theme) => {
                const preview = THEME_PREVIEWS[theme]
                const isActive = themePref === theme
                return (
                  <button
                    key={theme}
                    onClick={() => onThemeChange(theme)}
                    style={{
                      padding: 0,
                      border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      borderRadius: 12,
                      background: 'transparent',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'border-color 150ms ease, transform 150ms ease',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {/* Theme preview card */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        background: preview.bg,
                        borderRadius: 10,
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      {/* Mock surface */}
                      <div
                        style={{
                          flex: 1,
                          background: preview.surface,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'flex-end',
                          padding: 6,
                        }}
                      >
                        {/* Accent bar */}
                        <div
                          style={{
                            width: '60%',
                            height: 6,
                            background: preview.accent,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                    {/* Label */}
                    <div
                      style={{
                        padding: '8px 0',
                        fontSize: 11,
                        fontWeight: 700,
                        color: isActive ? 'var(--accent)' : 'var(--muted)',
                        textAlign: 'center',
                      }}
                    >
                      {THEME_LABELS[theme]}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Follow System toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                padding: '12px 14px',
                background: 'var(--panel)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Follow System</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Auto-switch based on device settings</div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  background: themePref === 'system' ? 'var(--accent)' : 'var(--border2)',
                  padding: 2,
                  transition: 'background 150ms ease',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transform: themePref === 'system' ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 150ms ease',
                  }}
                />
              </div>
              <input
                type="checkbox"
                checked={themePref === 'system'}
                onChange={(e) => onThemeChange(e.target.checked ? 'system' : 'warm')}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Event titles */}
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
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

      {/* Health Preferences */}
      <div className="glassCard" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 950 }}>Health Preferences</div>
          <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 12, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <Icon name="workout" size={14} /> Workout & Nutrition tracking
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gap: 16 }}>
          <div className="eventGrid">
            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
              Weight Unit
              <div className="segmented" style={{ justifySelf: 'start' }}>
                {(['lbs', 'kg'] as const).map((unit) => (
                  <button
                    key={unit}
                    className={draftWeightUnit === unit ? 'segBtn active' : 'segBtn'}
                    onClick={() => setDraftWeightUnit(unit)}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
              Distance Unit
              <div className="segmented" style={{ justifySelf: 'start' }}>
                {(['mi', 'km'] as const).map((unit) => (
                  <button
                    key={unit}
                    className={draftDistanceUnit === unit ? 'segBtn active' : 'segBtn'}
                    onClick={() => setDraftDistanceUnit(unit)}
                  >
                    {unit === 'mi' ? 'Miles' : 'Kilometers'}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
            Nutrition Estimation Model
            <select
              className="detailSmall"
              value={draftNutritionModel}
              onChange={(e) => setDraftNutritionModel(e.target.value)}
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
              Used for AI-powered calorie & nutrient estimation from food descriptions
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
