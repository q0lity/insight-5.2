# 1C: Gamification System Research Report

**Task**: Analyze spec 06 for XP/streak/RPG UI elements
**Bead**: hq-p6n
**Agent**: guzzoline (polecat)
**Date**: 2026-01-20

---

## Executive Summary

Insight 5 implements a comprehensive gamification system inspired by **Habitica** for RPG metaphors and **Atomic Habits** for streak/compound growth mechanics. The system uses XP, levels, gold, streaks, and achievements to motivate users without punitive mechanics.

**Key Design Principle**: "Provide a motivating gamification layer without punitive mechanics" (PRD)

---

## 1. XP (Experience Points) System

### 1.1 Core XP Formula

From `PRD/MASTER_PRD_V3.md` Section 4.1:

```
xp = difficulty × importance × durationMinutes × goalMultiplier
```

**Parameters**:
- **difficulty**: 1-10 scale (inferred from language like "brutal" → 9, or user-specified)
- **importance**: 1-10 scale
- **durationMinutes**: Integer minutes (from timer, utterance, or estimated)
- **goalMultiplier**: `1 + goalImportance/10`
  - Goal importance 10 → 2.0x (+100%)
  - Goal importance 5 → 1.5x (+50%)
  - Multiple goals: uses max multiplier

### 1.2 Implementation in Desktop

From `apps/desktop/src/scoring/points.ts`:

```typescript
export function basePoints(importance, difficulty) {
  const i = importance ?? 5
  const d = difficulty ?? 5
  return clamp(i, 1, 10) * clamp(d, 1, 10)
}

export function pointsForMinutes(base, minutes, mult = 1, includeStreak = true) {
  const streakMult = includeStreak ? getStreakMultiplier() : 1
  return base * Math.max(0, minutes) / 60 * mult * streakMult
}
```

### 1.3 XP to Level Conversion

From `apps/insight-mobile/app/rewards.tsx`:

```typescript
const xp = Math.max(0, total * 10);  // Points converted to XP
const level = Math.max(1, Math.floor(xp / 250) + 1);  // 250 XP per level
const toNext = 250 - (xp % 250);  // XP remaining to next level
```

**Level Progression**:
- 250 XP per level
- Level 1 at 0 XP
- Level 10 at 2,250 XP
- Level 100 at 24,750 XP

### 1.4 Gold Currency

```typescript
const gold = Math.floor(total * 2.5);  // Points → Gold conversion
```

Gold is used for the **Reward Store** to "buy" real-world treats.

---

## 2. Streak System (Atomic Habits "1% Better")

### 2.1 Philosophy

From `apps/desktop/src/scoring/streaks.ts`:

> "If you get 1% better each day for one year, you'll end up 37x better"

The streak system implements the compound growth principle from James Clear's *Atomic Habits*.

### 2.2 Streak Multiplier Formula

```typescript
streakMultiplier = 1 + (streak_days × 0.01)
```

**Multiplier Examples**:
| Streak Days | Multiplier | Bonus |
|-------------|------------|-------|
| 1           | 1.01x      | +1%   |
| 7           | 1.07x      | +7%   |
| 30          | 1.30x      | +30%  |
| 66          | 1.66x      | +66%  |
| 100         | 2.00x      | +100% (DOUBLE XP!) |
| 365         | 4.65x      | +365% |

### 2.3 Streak Data Model

From `apps/insight-mobile/src/utils/streaks.ts`:

```typescript
type StreakData = {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string  // YYYY-MM-DD format
  totalActiveDays: number
  streakHistory: Array<{ date: string; streak: number }>
}
```

### 2.4 Streak Validation Rules

```typescript
function validateStreak(data: StreakData): StreakData {
  const today = getTodayKey()
  const yesterday = getYesterdayKey()

  // Valid: last active was today or yesterday
  if (data.lastActiveDate === today || data.lastActiveDate === yesterday) {
    return data
  }

  // Streak breaks if >1 day gap (NON-PUNITIVE: keeps longest streak)
  if (daysBetween(data.lastActiveDate, today) > 1) {
    return {
      ...data,
      currentStreak: 0,  // Reset current
      // longestStreak preserved (achievement)
      // totalActiveDays preserved
    }
  }

  return data
}
```

**Non-Punitive Design**: When a streak breaks, only `currentStreak` resets. `longestStreak` and `totalActiveDays` are preserved as permanent achievements.

### 2.5 Milestone Badges

```typescript
const milestones = [
  { days: 7, badge: 'Week Warrior', message: '7 days of 1% better' },
  { days: 21, badge: 'Habit Former', message: '21 days - habit forming!' },
  { days: 30, badge: 'Monthly Master', message: '30 days of compound growth' },
  { days: 66, badge: 'Automatic', message: '66 days - truly automatic' },
  { days: 100, badge: 'Centurion', message: '100 days = DOUBLE XP!' },
  { days: 365, badge: 'Annual Legend', message: '37x better than day 1' },
]
```

### 2.6 Motivational Messages

```typescript
function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your 1% journey today"
  if (streak === 1) return "Day 1. Every journey begins here."
  if (streak < 7) return `Day ${streak}. Small habits, big results.`
  if (streak < 21) return `Day ${streak}. You're building momentum.`
  if (streak < 30) return `Day ${streak}. The compound effect is real.`
  if (streak < 66) return `Day ${streak}. You're becoming who you want to be.`
  if (streak < 100) return `Day ${streak}. This is who you are now.`
  if (streak < 365) return `Day ${streak}. ${bonus}% multiplier active!`
  return `Day ${streak}. Legend status achieved.`
}
```

---

## 3. RPG UI Elements

### 3.1 Character Stats (D&D-Style)

From `apps/insight-mobile/app/rewards.tsx`:

```typescript
type CharacterStat = 'STR' | 'INT' | 'CON' | 'PER' | 'WIS' | 'CHA';

const STAT_CATEGORIES: Record<string, CharacterStat> = {
  'Health': 'CON',    // Constitution
  'Fitness': 'STR',   // Strength
  'Work': 'INT',      // Intelligence
  'Learning': 'WIS',  // Wisdom
  'Social': 'CHA',    // Charisma
  'Personal': 'PER',  // Perception
};
```

Stats are calculated from time spent in each category and displayed on a **Radar Chart**.

### 3.2 UI Components

#### Level Progress Ring
- Circular SVG progress indicator
- Shows current level in center
- Progress arc shows XP to next level

#### XP/Gold Display
```jsx
<View style={styles.xpRow}>
  <View><Text>TOTAL XP</Text><Text>{totals.xp}</Text></View>
  <View><Text>NEXT LEVEL</Text><Text>{totals.toNext} XP</Text></View>
</View>
```

#### Streak Journey ("1% Journey")
- Current streak display with fire emoji
- XP multiplier badge
- Progress bar to next milestone
- Motivational message box
- Lifetime stats (longest streak, total active days)

#### Achievement Badges Grid
```typescript
const ACHIEVEMENTS: Achievement[] = [
  { id: 'streak7', name: 'Week Warrior', icon: '🔥', requirement: 7, type: 'streak' },
  { id: 'streak21', name: 'Habit Former', icon: '💪', requirement: 21, type: 'streak' },
  { id: 'xp1000', name: 'XP Hunter', icon: '✨', requirement: 1000, type: 'xp' },
  { id: 'sessions50', name: 'Consistent', icon: '📊', requirement: 50, type: 'sessions' },
  // ...
];
```

Badges show locked (grayscale) or unlocked (colored with tint) states.

#### Points History Chart
- 7-day bar chart showing daily points
- Visual feedback on consistency

### 3.3 Reward Store

```typescript
const STORE: RewardItem[] = [
  { id: 'coffee', name: 'Coffee treat', costGold: 15, desc: 'A small reward after a strong day.' },
  { id: 'movie', name: 'Movie night', costGold: 40, desc: 'Unwind and reset.' },
  { id: 'gear', name: 'Buy gear', costGold: 120, desc: 'Invest in things that help.' },
  { id: 'dayoff', name: 'Half-day off', costGold: 220, desc: 'Recovery counts as progress.' },
];
```

Users "redeem" rewards with earned gold - ties virtual progress to real-world treats.

---

## 4. Database Schema Support

From `DB/SUPABASE_SCHEMA_V1.sql`:

### 4.1 Entries Table (XP Storage)

```sql
create table public.entries (
  ...
  difficulty smallint check (difficulty between 1 and 10),
  importance smallint check (importance between 1 and 10),
  goal_multiplier numeric,
  xp numeric,  -- Pre-computed for fast UI
  ...
);
```

### 4.2 Goals Table (Multiplier Source)

```sql
create table public.goals (
  ...
  importance smallint not null default 5 check (importance between 1 and 10),
  ...
);
```

### 4.3 Habit Definitions (Streak Source)

```sql
create table public.habit_definitions (
  ...
  importance smallint not null default 5,
  difficulty smallint not null default 5,
  schedule jsonb not null default '{}',  -- frequency, days, times
  ...
);
```

---

## 5. Habitica-Inspired Interactions (MVP UX)

From `PRD/MASTER_PRD_V3.md` Section 4.4:

> "Habits page supports 'did it' (positive) taps; optional 'missed' taps exist but do not punish—only track."

**Key Behaviors**:
- Habits have quick "did it" positive tap buttons
- "Missed" tracking is optional and non-punitive
- Counters and streak visuals are prominent
- No HP loss or death mechanics

---

## 6. Future Enhancements (Phase 2)

From `PRD/MASTER_PRD_V3.md` Section 4.5:

### 6.1 Trait/Skill Analytics
- Dedicated "Traits" and "Skills" modules
- Radar charts for trait visualization
- Goal-linked skill progression

### 6.2 Referenced Features
- Trackers can represent traits/skills (`#focus(7)`, `#resilience(6)`)
- Skill trees and progression systems

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `PRD/MASTER_PRD_V3.md` | Section 4: Scoring & Gamification spec |
| `apps/desktop/src/scoring/points.ts` | XP calculation implementation |
| `apps/desktop/src/scoring/streaks.ts` | Streak system (desktop) |
| `apps/insight-mobile/src/utils/streaks.ts` | Streak system (mobile) |
| `apps/insight-mobile/app/rewards.tsx` | Mobile Rewards screen |
| `apps/desktop/src/workspace/views/rewards.tsx` | Desktop Rewards view |
| `DB/SUPABASE_SCHEMA_V1.sql` | Database schema (xp, goals, habits) |
| `AGENTS/04_TIMERS_XP_LIVE_ACTIVITY.md` | Timer & XP accrual spec |

---

## 8. Summary

The Insight 5 gamification system combines:

1. **XP Points**: `difficulty × importance × duration × goalMultiplier × streakMultiplier`
2. **Levels**: 250 XP per level progression
3. **Gold**: Spendable currency for real-world rewards
4. **Streaks**: Atomic Habits "1% daily" compound multiplier
5. **Achievements**: Milestone badges for streaks, XP, and sessions
6. **Character Stats**: D&D-style stat visualization (STR/INT/CON/WIS/CHA/PER)
7. **Reward Store**: Convert gold to real-world treats

**Design Philosophy**: Motivating without punishing. No HP loss, no death. Streaks reset but achievements persist. The system rewards consistency through compound growth.

---

*Report generated by polecat guzzoline*
