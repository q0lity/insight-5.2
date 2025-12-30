import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import { pointsForEvent } from '../../scoring/points'
import { Icon } from '../../ui/icons'

function pointsForEventSafe(e: CalendarEvent) {
  if (e.kind === 'log') return 0
  return pointsForEvent(e)
}

function loadOwned() {
  try {
    const raw = localStorage.getItem('insight5.rewards.owned.v1')
    if (!raw) return new Set<string>()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set<string>()
  }
}

function saveOwned(ids: Set<string>) {
  try {
    localStorage.setItem('insight5.rewards.owned.v1', JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

type RewardItem = { id: string; name: string; costGold: number; desc: string; icon: any }

const STORE: RewardItem[] = [
  { id: 'coffee', name: 'Coffee treat', costGold: 15, desc: 'A small reward after a strong day.', icon: 'food' },
  { id: 'movie', name: 'Movie night', costGold: 40, desc: 'Unwind and reset.', icon: 'play' },
  { id: 'gear', name: 'Buy gear', costGold: 120, desc: 'Invest in the things that help you perform.', icon: 'gear' },
  { id: 'dayoff', name: 'Half-day off', costGold: 220, desc: 'Recovery counts as progress.', icon: 'sun' },
]

export function RewardsView(props: { events: CalendarEvent[] }) {
  const [owned, setOwned] = useState<Set<string>>(() => loadOwned())

  const totals = useMemo(() => {
    const total = props.events.reduce((a, e) => a + pointsForEventSafe(e), 0)
    const xp = Math.max(0, total * 10) 
    const level = Math.max(1, Math.floor(xp / 250) + 1)
    const toNext = 250 - (xp % 250)
    const gold = Math.floor(total * 2.5)
    return { totalPoints: total, xp, level, toNext, gold }
  }, [props.events])

  function buy(item: RewardItem) {
    if (owned.has(item.id)) return
    if (totals.gold < item.costGold) return
    const next = new Set(owned)
    next.add(item.id)
    setOwned(next)
    saveOwned(next)
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F7F4] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[#F8F7F4]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Rewards</h1>
            <p className="text-sm text-[#86868B] font-semibold uppercase tracking-widest">Celebrate your consistency.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-white/50 backdrop-blur border border-white/20 rounded-2xl shadow-sm flex items-center gap-3">
                <Icon name="bolt" size={18} className="text-[#D95D39]" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#86868B]">Gold Balance</span>
                    <span className="text-lg font-black text-[#1C1C1E]">{totals.gold}g</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Character Stats */}
            <div className="lg:col-span-1 space-y-8">
                <div className="flex items-center gap-3 px-2">
                    <Icon name="users" size={18} className="text-[#D95D39]" />
                    <h2 className="text-xl font-bold tracking-tight">Progress</h2>
                </div>
                <div className="glassCard space-y-8">
                    <div className="flex items-center justify-center py-6">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-8 border-[#F2F0ED] flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-black text-[#1C1C1E]">{totals.level}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[#86868B]">Level</div>
                                </div>
                            </div>
                            <svg className="absolute inset-0 w-32 h-32 -rotate-90">
                                <circle 
                                    cx="64" cy="64" r="56" 
                                    fill="none" stroke="#D95D39" strokeWidth="8" 
                                    strokeDasharray={`${(1 - totals.toNext/250) * 351} 351`}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[#F2F0ED] rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Total XP</span>
                            <div className="text-xl font-black text-[#1C1C1E]">{Math.round(totals.xp)}</div>
                        </div>
                        <div className="p-4 bg-[#F2F0ED] rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">Next Level</span>
                            <div className="text-xl font-black text-[#D95D39]">{Math.round(totals.toNext)} XP</div>
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-[#86868B] leading-relaxed text-center opacity-60 italic">
                        Earn Gold and XP by completing high-importance tasks and events.
                    </p>
                </div>
            </div>

            {/* Reward Store */}
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center gap-3 px-2">
                    <Icon name="cart" size={18} className="text-[#5B5F97]" />
                    <h2 className="text-xl font-bold tracking-tight">Reward Store</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {STORE.map((it) => {
                        const isOwned = owned.has(it.id)
                        const canBuy = !isOwned && totals.gold >= it.costGold
                        return (
                            <motion.div 
                                key={it.id} 
                                className={`glassCard flex flex-col justify-between gap-6 group transition-all ${isOwned ? 'opacity-60 grayscale' : ''}`}
                                whileHover={!isOwned ? { y: -4 } : {}}
                            >
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-[#F2F0ED] rounded-2xl flex items-center justify-center text-[#D95D39]">
                                        <Icon name={it.icon} size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold">{it.name}</h3>
                                        <p className="text-sm text-[#86868B] font-medium leading-relaxed">{it.desc}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                                    <span className="text-sm font-black text-[#5B5F97]">{it.costGold}g</span>
                                    <button 
                                        className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                            isOwned ? 'bg-[#F2F0ED] text-[#86868B]' : 
                                            canBuy ? 'bg-[#1C1C1E] text-white shadow-lg hover:scale-105 active:scale-95' : 
                                            'bg-black/5 text-[#86868B] cursor-not-allowed'
                                        }`}
                                        onClick={() => buy(it)}
                                        disabled={!canBuy}
                                    >
                                        {isOwned ? 'Owned' : 'Redeem'}
                                    </button>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}