/**
 * Atomic Habits Streak System (Mobile)
 * "If you get 1% better each day for one year, you'll end up 37x better"
 *
 * Streak multiplier: 1 + (streak_days × 0.01)
 * Day 1:   1.01x
 * Day 30:  1.30x
 * Day 100: 2.00x (DOUBLE XP!)
 * Day 365: 4.65x
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'insight5.streaks.v1'

export type StreakData = {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string  // YYYY-MM-DD format
  totalActiveDays: number
  streakHistory: Array<{ date: string; streak: number }>
}

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  totalActiveDays: 0,
  streakHistory: [],
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

function getYesterdayKey(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// In-memory cache for sync access
let cachedData: StreakData | null = null

export async function loadStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cachedData = DEFAULT_STREAK_DATA
      return DEFAULT_STREAK_DATA
    }
    const parsed = JSON.parse(raw) as StreakData
    const validated = validateStreak(parsed)
    cachedData = validated
    return validated
  } catch {
    cachedData = DEFAULT_STREAK_DATA
    return DEFAULT_STREAK_DATA
  }
}

function validateStreak(data: StreakData): StreakData {
  const today = getTodayKey()
  const yesterday = getYesterdayKey()

  // If last active was today or yesterday, streak is valid
  if (data.lastActiveDate === today || data.lastActiveDate === yesterday) {
    return data
  }

  // If last active was more than 1 day ago, streak breaks (but we're non-punitive)
  if (data.lastActiveDate && daysBetween(data.lastActiveDate, today) > 1) {
    return {
      ...data,
      currentStreak: 0,  // Reset streak
      // Keep longest streak and total days as achievements
    }
  }

  return data
}

export async function saveStreakData(data: StreakData): Promise<void> {
  try {
    cachedData = data
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable
  }
}

/**
 * Record activity for today - extends streak
 * Call this when user logs any event, completes a task, or logs a habit
 */
export async function recordActivity(): Promise<StreakData> {
  const data = await loadStreakData()
  const today = getTodayKey()

  // Already recorded today
  if (data.lastActiveDate === today) {
    return data
  }

  const yesterday = getYesterdayKey()
  const isConsecutive = data.lastActiveDate === yesterday || data.lastActiveDate === ''

  const newStreak = isConsecutive ? data.currentStreak + 1 : 1
  const newLongest = Math.max(data.longestStreak, newStreak)

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActiveDate: today,
    totalActiveDays: data.totalActiveDays + 1,
    streakHistory: [
      ...data.streakHistory.slice(-364),  // Keep last 365 entries
      { date: today, streak: newStreak }
    ]
  }

  await saveStreakData(updated)
  return updated
}

/**
 * Sync version for immediate UI use (uses cached value)
 */
export function getStreakMultiplierSync(): number {
  const streak = cachedData?.currentStreak ?? 0
  return 1 + (streak * 0.01)
}

/**
 * Calculate streak multiplier: 1 + (streak × 0.01)
 * This is the core Atomic Habits "1% better" mechanic
 */
export async function getStreakMultiplier(): Promise<number> {
  const data = await loadStreakData()
  return 1 + (data.currentStreak * 0.01)
}

/**
 * Get current streak data with calculated multiplier
 */
export async function getStreakInfo(): Promise<StreakData & { multiplier: number; multiplierPercent: string }> {
  const data = await loadStreakData()
  const multiplier = 1 + (data.currentStreak * 0.01)
  return {
    ...data,
    multiplier,
    multiplierPercent: `${((multiplier - 1) * 100).toFixed(0)}%`
  }
}

/**
 * Sync version for immediate UI use
 */
export function getStreakInfoSync(): StreakData & { multiplier: number; multiplierPercent: string } {
  const data = cachedData ?? DEFAULT_STREAK_DATA
  const multiplier = 1 + (data.currentStreak * 0.01)
  return {
    ...data,
    multiplier,
    multiplierPercent: `${((multiplier - 1) * 100).toFixed(0)}%`
  }
}

/**
 * Check if user hit a milestone
 */
export function checkMilestone(streak: number): {
  hit: boolean
  milestone?: number
  badge?: string
  message?: string
} {
  const milestones = [
    { days: 7, badge: 'Week Warrior', message: '7 days of 1% better' },
    { days: 21, badge: 'Habit Former', message: '21 days - habit forming!' },
    { days: 30, badge: 'Monthly Master', message: '30 days of compound growth' },
    { days: 66, badge: 'Automatic', message: '66 days - truly automatic' },
    { days: 100, badge: 'Centurion', message: '100 days = DOUBLE XP!' },
    { days: 365, badge: 'Annual Legend', message: '37x better than day 1' },
  ]

  const milestone = milestones.find(m => m.days === streak)
  if (milestone) {
    return { hit: true, milestone: milestone.days, badge: milestone.badge, message: milestone.message }
  }
  return { hit: false }
}

/**
 * Days until next milestone
 */
export function daysToNextMilestone(streak: number): { days: number; milestone: number; badge: string } | null {
  const milestones = [7, 21, 30, 66, 100, 365]
  const badges = ['Week Warrior', 'Habit Former', 'Monthly Master', 'Automatic', 'Centurion', 'Annual Legend']

  for (let i = 0; i < milestones.length; i++) {
    if (streak < milestones[i]) {
      return {
        days: milestones[i] - streak,
        milestone: milestones[i],
        badge: badges[i]
      }
    }
  }
  return null
}

/**
 * Atomic Habits inspired messages
 */
export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your 1% journey today"
  if (streak === 1) return "Day 1. Every journey begins here."
  if (streak < 7) return `Day ${streak}. Small habits, big results.`
  if (streak < 21) return `Day ${streak}. You're building momentum.`
  if (streak < 30) return `Day ${streak}. The compound effect is real.`
  if (streak < 66) return `Day ${streak}. You're becoming who you want to be.`
  if (streak < 100) return `Day ${streak}. This is who you are now.`
  if (streak < 365) return `Day ${streak}. ${((1 + streak * 0.01) * 100 - 100).toFixed(0)}% multiplier active!`
  return `Day ${streak}. Legend status achieved.`
}

/**
 * Get level-up celebration message based on Atomic Habits principles
 */
export function getLevelUpMessage(level: number): string {
  const messages: Record<number, string> = {
    5: "Small habits, remarkable results. You're 5 levels into your transformation.",
    10: "The aggregation of marginal gains. Each choice compounds.",
    15: "You're not just changing what you do. You're changing who you are.",
    20: "You don't rise to the level of your goals. You fall to the level of your systems. Yours are SOLID.",
    25: "The most powerful outcomes come from compound growth. Keep stacking.",
    30: "Every action is a vote for the person you want to become. 30 levels of votes.",
    40: "Habits are the compound interest of self-improvement.",
    50: "50 levels. The difference is not your goals, it's your systems.",
    75: "Success is the product of daily habits—not once-in-a-lifetime transformations.",
    100: "The most powerful outcomes are delayed. But YOU persisted. 100 levels of compound growth.",
  }

  // Find closest milestone
  const milestones = Object.keys(messages).map(Number).sort((a, b) => a - b)
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (level >= milestones[i]) {
      return messages[milestones[i]]
    }
  }

  return `Level ${level}. Another 1% in the bank.`
}

// Initialize cache on import
loadStreakData()
