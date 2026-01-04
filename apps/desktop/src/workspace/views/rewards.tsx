import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CalendarEvent } from '../../storage/calendar'
import { pointsForEvent } from '../../scoring/points'
import { getStreakInfo, daysToNextMilestone, getStreakMessage } from '../../scoring/streaks'
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
  const [streakInfo, setStreakInfo] = useState(() => getStreakInfo())

  // Refresh streak info when component mounts
  useEffect(() => {
    setStreakInfo(getStreakInfo())
  }, [props.events])

  const nextMilestone = useMemo(() => daysToNextMilestone(streakInfo.currentStreak), [streakInfo.currentStreak])
  const streakMessage = useMemo(() => getStreakMessage(streakInfo.currentStreak), [streakInfo.currentStreak])

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
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      <div className="px-10 pt-10 pb-6 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Rewards</h1>
            <p className="text-sm text-[var(--muted)] font-semibold uppercase tracking-widest">Celebrate your consistency.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-white/50 backdrop-blur border border-white/20 rounded-2xl shadow-sm flex items-center gap-3">
                <Icon name="bolt" size={18} className="text-[var(--accent)]" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Gold Balance</span>
                    <span className="text-lg font-black text-[var(--text)]">{totals.gold}g</span>
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
                    <Icon name="users" size={18} className="text-[var(--accent)]" />
                    <h2 className="text-xl font-bold tracking-tight">Progress</h2>
                </div>
                <div className="glassCard space-y-8">
                    <div className="flex items-center justify-center py-6">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-8 border-[#F2F0ED] flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-black text-[var(--text)]">{totals.level}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Level</div>
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
                        <div className="p-4 bg-[var(--panel)] rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Total XP</span>
                            <div className="text-xl font-black text-[var(--text)]">{Math.round(totals.xp)}</div>
                        </div>
                        <div className="p-4 bg-[var(--panel)] rounded-2xl space-y-1">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Next Level</span>
                            <div className="text-xl font-black text-[var(--accent)]">{Math.round(totals.toNext)} XP</div>
                        </div>
                    </div>
                </div>

                {/* 1% Journey Section - Atomic Habits */}
                <div className="flex items-center gap-3 px-2 mt-8">
                    <span className="text-lg">🔥</span>
                    <h2 className="text-xl font-bold tracking-tight">1% Journey</h2>
                </div>
                <div className="glassCard space-y-6">
                    {/* Streak Stats */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Current Streak</span>
                            <div className="text-3xl font-black text-[var(--text)] flex items-center gap-2">
                                {streakInfo.currentStreak}
                                <span className="text-lg">day{streakInfo.currentStreak !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">XP Multiplier</span>
                            <div className="text-3xl font-black text-[var(--accent)]">
                                {streakInfo.multiplier.toFixed(2)}x
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar to Next Milestone */}
                    {nextMilestone && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-[var(--muted)]">
                                <span>{nextMilestone.days} days to {nextMilestone.badge}</span>
                                <span>Day {nextMilestone.milestone}</span>
                            </div>
                            <div className="h-2 bg-[var(--panel)] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((streakInfo.currentStreak % (nextMilestone.milestone - (nextMilestone.milestone === 7 ? 0 : [7,21,30,66,100,365].find(m => m < nextMilestone.milestone) || 0))) / nextMilestone.days) * 100}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Atomic Habits Message */}
                    <p className="text-sm font-semibold text-[var(--text)] text-center py-2 px-4 bg-[var(--panel)] rounded-xl">
                        "{streakMessage}"
                    </p>

                    {/* Lifetime Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black/5">
                        <div className="text-center">
                            <div className="text-lg font-black text-[var(--text)]">{streakInfo.longestStreak}</div>
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Longest Streak</span>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-black text-[var(--text)]">{streakInfo.totalActiveDays}</div>
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Total Active Days</span>
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-[var(--muted)] leading-relaxed text-center opacity-60 italic">
                        "Get 1% better every day. After one year, you'll be 37x better."
                    </p>
                </div>
            </div>

            {/* Reward Store */}
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center gap-3 px-2">
                    <Icon name="cart" size={18} className="text-[var(--accent)]" />
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
                                    <div className="w-12 h-12 bg-[var(--panel)] rounded-2xl flex items-center justify-center text-[var(--accent)]">
                                        <Icon name={it.icon} size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold">{it.name}</h3>
                                        <p className="text-sm text-[var(--muted)] font-medium leading-relaxed">{it.desc}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                                    <span className="text-sm font-black text-[var(--accent)]">{it.costGold}g</span>
                                    <button 
                                        className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                            isOwned ? 'bg-[var(--panel)] text-[var(--muted)]' : 
                                            canBuy ? 'bg-[#1C1C1E] text-white shadow-lg hover:scale-105 active:scale-95' : 
                                            'bg-black/5 text-[var(--muted)] cursor-not-allowed'
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