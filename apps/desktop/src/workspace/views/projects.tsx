import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import type { Task } from '../../storage/tasks'
import { loadMultipliers, saveMultipliers } from '../../storage/multipliers'
import { loadCustomTaxonomy, saveCustomTaxonomy, upsertCategory } from '../../taxonomy/custom'
import { categoriesFromStarter, subcategoriesFromStarter } from '../../taxonomy/starter'
import { Icon } from '../../ui/icons'

type MultiplierRow = { key: string; label: string; value: number }

function normalizeKey(raw: string | null | undefined) {
  return (raw ?? '').trim().toLowerCase()
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function ProjectsView(props: { events: CalendarEvent[]; tasks: Task[] }) {
  const [multipliers, setMultipliers] = useState(() => loadMultipliers())
  const [customTaxonomy, setCustomTaxonomy] = useState(() => loadCustomTaxonomy())
  const [goalDraft, setGoalDraft] = useState('')
  const [projectDraft, setProjectDraft] = useState('')
  const [categoryDraft, setCategoryDraft] = useState('')
  const [subcategoryDraft, setSubcategoryDraft] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const goals = useMemo(() => {
    const keys = new Set<string>()
    for (const e of props.events) if ((e.goal ?? '').trim()) keys.add(e.goal!.trim())
    for (const t of props.tasks) if ((t.goal ?? '').trim()) keys.add(t.goal!.trim())
    return Array.from(keys)
  }, [props.events, props.tasks])

  const projects = useMemo(() => {
    const keys = new Set<string>()
    for (const e of props.events) if ((e.project ?? '').trim()) keys.add(e.project!.trim())
    for (const t of props.tasks) if ((t.project ?? '').trim()) keys.add(t.project!.trim())
    return Array.from(keys)
  }, [props.events, props.tasks])

  const goalRows = useMemo<MultiplierRow[]>(() => {
    return goals.map((g) => ({
      key: normalizeKey(g),
      label: g,
      value: multipliers.goals[normalizeKey(g)] ?? 1,
    }))
  }, [goals, multipliers.goals])

  const projectRows = useMemo<MultiplierRow[]>(() => {
    return projects.map((p) => ({
      key: normalizeKey(p),
      label: p,
      value: multipliers.projects[normalizeKey(p)] ?? 1,
    }))
  }, [multipliers.projects, projects])

  const categories = useMemo(() => categoriesFromStarter(), [])

  function updateMultipliers(next: typeof multipliers) {
    setMultipliers(next)
    saveMultipliers(next)
  }

  function updateGoalMultiplier(goal: string, value: number) {
    const key = normalizeKey(goal)
    if (!key) return
    updateMultipliers({
      ...multipliers,
      goals: { ...multipliers.goals, [key]: clamp(value, 0.1, 3) },
    })
  }

  function updateProjectMultiplier(project: string, value: number) {
    const key = normalizeKey(project)
    if (!key) return
    updateMultipliers({
      ...multipliers,
      projects: { ...multipliers.projects, [key]: clamp(value, 0.1, 3) },
    })
  }

  function addCustomCategory() {
    const category = categoryDraft.trim()
    if (!category) return
    upsertCategory(category, [])
    setCustomTaxonomy(loadCustomTaxonomy())
    setCategoryDraft('')
  }

  function addSubcategory() {
    const category = (activeCategory ?? '').trim()
    const sub = subcategoryDraft.trim()
    if (!category || !sub) return
    const current = loadCustomTaxonomy()
    const idx = current.findIndex((c) => c.category.toLowerCase() === category.toLowerCase())
    if (idx >= 0) {
      const existing = current[idx]!
      const subs = Array.from(new Set([...existing.subcategories, sub]))
      current[idx] = { category: existing.category, subcategories: subs }
    } else {
      current.push({ category, subcategories: [sub] })
    }
    saveCustomTaxonomy(current)
    setCustomTaxonomy(loadCustomTaxonomy())
    setSubcategoryDraft('')
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Ecosystem</h1>
            <p className="text-sm text-[var(--muted)] font-semibold">Define the structures that organize your digital life.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Goals & Multipliers */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Icon name="target" size={18} className="text-[var(--accent)]" />
                    <h2 className="text-xl font-bold tracking-tight">Goal Multipliers</h2>
                </div>
                <div className="glassCard space-y-6">
                    <div className="space-y-4">
                        {goalRows.length === 0 ? (
                            <div className="py-6 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No goals yet</div>
                        ) : (
                            goalRows.map((g) => (
                            <div key={g.key} className="flex items-center justify-between p-4 bg-[var(--panel)] rounded-2xl group transition-all hover:bg-[var(--panel)] hover:shadow-md">
                                <div className="space-y-1">
                                    <div className="font-bold text-[var(--text)]">{g.label}</div>
                                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Growth Weight</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[var(--accent)]">{g.value}x</span>
                                    <input
                                        className="w-16 h-8 bg-[var(--panel)] border border-black/5 rounded-lg px-2 text-xs font-bold text-center outline-none focus:border-[#D95D39]/30 transition-all"
                                        type="number"
                                        min={0.1}
                                        max={3}
                                        step={0.1}
                                        value={g.value}
                                        onChange={(e) => updateGoalMultiplier(g.label, Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-black/5">
                        <input
                            className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#D95D39]/10 transition-all"
                            value={goalDraft}
                            onChange={(e) => setGoalDraft(e.target.value)}
                            placeholder="Add goal name…"
                        />
                        <button
                            className="h-11 px-6 bg-[#1C1C1E] text-white rounded-xl font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
                            onClick={() => {
                                if (!goalDraft.trim()) return
                                updateGoalMultiplier(goalDraft.trim(), 1)
                                setGoalDraft('')
                            }}>
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Projects & Multipliers */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Icon name="folder" size={18} className="text-[var(--accent)]" />
                    <h2 className="text-xl font-bold tracking-tight">Project Multipliers</h2>
                </div>
                <div className="glassCard space-y-6">
                    <div className="space-y-4">
                        {projectRows.length === 0 ? (
                            <div className="py-6 text-center opacity-30 text-xs font-bold uppercase tracking-widest">No projects yet</div>
                        ) : (
                            projectRows.map((p) => (
                            <div key={p.key} className="flex items-center justify-between p-4 bg-[var(--panel)] rounded-2xl group transition-all hover:bg-[var(--panel)] hover:shadow-md">
                                <div className="space-y-1">
                                    <div className="font-bold text-[var(--text)]">{p.label}</div>
                                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Project Focus</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[var(--accent)]">{p.value}x</span>
                                    <input
                                        className="w-16 h-8 bg-[var(--panel)] border border-black/5 rounded-lg px-2 text-xs font-bold text-center outline-none focus:border-[var(--accent)]/30 transition-all"
                                        type="number"
                                        min={0.1}
                                        max={3}
                                        step={0.1}
                                        value={p.value}
                                        onChange={(e) => updateProjectMultiplier(p.label, Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-black/5">
                        <input
                            className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                            value={projectDraft}
                            onChange={(e) => setProjectDraft(e.target.value)}
                            placeholder="Add project name…"
                        />
                        <button
                            className="h-11 px-6 bg-[#1C1C1E] text-white rounded-xl font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
                            onClick={() => {
                                if (!projectDraft.trim()) return
                                updateProjectMultiplier(projectDraft.trim(), 1)
                                setProjectDraft('')
                            }}>
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Icon name="tag" size={18} className="text-[var(--accent)]" />
                    <h2 className="text-xl font-bold tracking-tight">Taxonomy</h2>
                </div>
                <div className="glassCard flex flex-col md:flex-row gap-10 min-h-[400px]">
                    <div className="w-full md:w-1/3 space-y-6">
                        <div className="space-y-3">
                            {categories.map((c) => (
                                <button key={c} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex justify-between items-center group ${activeCategory === c ? 'bg-[var(--panel)] border-[var(--accent)]/30 shadow-lg' : 'bg-[var(--panel)] border-transparent hover:bg-[var(--panel)] hover:border-black/5'}`} onClick={() => setActiveCategory(c)}>
                                    <span className={`font-bold transition-colors ${activeCategory === c ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>{c}</span>
                                    <span className="text-[10px] font-bold text-[var(--muted)] opacity-40">{subcategoriesFromStarter(c).length}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-black/5">
                            <input
                                className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                                value={categoryDraft}
                                onChange={(e) => setCategoryDraft(e.target.value)}
                                placeholder="New category…"
                            />
                            <button className="h-11 px-4 bg-[#1C1C1E] text-white rounded-xl font-bold text-xs" onClick={addCustomCategory}>
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-[var(--panel)] rounded-3xl p-8 flex flex-col">
                        {!activeCategory ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                                <Icon name="tag" size={48} />
                                <p className="font-bold uppercase tracking-[0.2em] text-xs">Select a category</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-bold">{activeCategory}</h3>
                                    <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Subcategories</span>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                                    {subcategoriesFromStarter(activeCategory).map((s) => (
                                        <div key={s} className="p-4 bg-[var(--panel)] rounded-2xl shadow-sm border border-black/5 font-bold text-sm text-[var(--text)]">
                                            {s}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-8 mt-auto border-t border-black/5">
                                    <input
                                        className="flex-1 h-11 bg-[var(--panel)] border-none rounded-xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                                        value={subcategoryDraft}
                                        onChange={(e) => setSubcategoryDraft(e.target.value)}
                                        placeholder="Add subcategory…"
                                    />
                                    <button className="h-11 px-6 bg-[#1C1C1E] text-white rounded-xl font-bold text-xs" onClick={addSubcategory}>
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
