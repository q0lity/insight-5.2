import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { listEvents, type MobileEvent } from '@/src/storage/events';
import { RadarChart } from '@/src/components/charts/RadarChart';
import { ProgressRing } from '@/src/components/charts/ProgressRing';
import { LuxCard } from '@/components/LuxCard';
import {
  getStreakInfo,
  daysToNextMilestone,
  getStreakMessage,
  type StreakData
} from '@/src/utils/streaks';

type RewardItem = { id: string; name: string; costGold: number; desc: string; icon: InsightIconName };

const STORE: RewardItem[] = [
  { id: 'coffee', name: 'Coffee treat', costGold: 15, desc: 'A small reward after a strong day.', icon: 'smile' },
  { id: 'movie', name: 'Movie night', costGold: 40, desc: 'Unwind and reset.', icon: 'sparkle' },
  { id: 'gear', name: 'Buy gear', costGold: 120, desc: 'Invest in things that help.', icon: 'briefcase' },
  { id: 'dayoff', name: 'Half-day off', costGold: 220, desc: 'Recovery counts as progress.', icon: 'calendar' },
];

type Achievement = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  requirement: number;
  type: 'streak' | 'xp' | 'sessions' | 'gold';
};

const ACHIEVEMENTS: Achievement[] = [
  { id: 'streak7', name: 'Week Warrior', desc: '7-day streak', icon: '🔥', requirement: 7, type: 'streak' },
  { id: 'streak21', name: 'Habit Former', desc: '21-day streak', icon: '💪', requirement: 21, type: 'streak' },
  { id: 'streak30', name: 'Monthly Master', desc: '30-day streak', icon: '🏆', requirement: 30, type: 'streak' },
  { id: 'streak66', name: 'Lifestyle', desc: '66-day streak', icon: '⭐', requirement: 66, type: 'streak' },
  { id: 'xp1000', name: 'XP Hunter', desc: '1,000 XP earned', icon: '✨', requirement: 1000, type: 'xp' },
  { id: 'xp5000', name: 'XP Master', desc: '5,000 XP earned', icon: '💎', requirement: 5000, type: 'xp' },
  { id: 'sessions50', name: 'Consistent', desc: '50 sessions logged', icon: '📊', requirement: 50, type: 'sessions' },
  { id: 'sessions200', name: 'Dedicated', desc: '200 sessions logged', icon: '🎯', requirement: 200, type: 'sessions' },
];

type CharacterStat = 'STR' | 'INT' | 'CON' | 'PER' | 'WIS' | 'CHA';

const STAT_CATEGORIES: Record<string, CharacterStat> = {
  'Health': 'CON',
  'Fitness': 'STR',
  'Work': 'INT',
  'Learning': 'WIS',
  'Social': 'CHA',
  'Personal': 'PER',
};

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function RewardsScreen() {
  const router = useRouter();
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [streakData, setStreakData] = useState<StreakData & { multiplier: number; multiplierPercent: string } | null>(null);

  useEffect(() => {
    listEvents().then(setEvents);
    getStreakInfo().then(setStreakData);
  }, []);

  const nextMilestone = useMemo(
    () => streakData ? daysToNextMilestone(streakData.currentStreak) : null,
    [streakData?.currentStreak]
  );
  const streakMessage = useMemo(
    () => streakData ? getStreakMessage(streakData.currentStreak) : '',
    [streakData?.currentStreak]
  );

  const totals = useMemo(() => {
    const total = events.reduce((acc, ev) => acc + (ev.points ?? 0), 0);
    const xp = Math.max(0, total * 10);
    const level = Math.max(1, Math.floor(xp / 250) + 1);
    const toNext = 250 - (xp % 250);
    const gold = Math.floor(total * 2.5);
    const progress = (250 - toNext) / 250;
    return { xp, level, toNext, gold, progress, totalPoints: total };
  }, [events]);

  // Calculate character stats from event categories
  const characterStats = useMemo(() => {
    const stats: Record<CharacterStat, number> = {
      STR: 0, INT: 0, CON: 0, PER: 0, WIS: 0, CHA: 0,
    };
    const counts: Record<CharacterStat, number> = {
      STR: 0, INT: 0, CON: 0, PER: 0, WIS: 0, CHA: 0,
    };

    events.forEach((e) => {
      const cat = e.category || 'Personal';
      const stat = STAT_CATEGORIES[cat] || 'PER';
      const mins = e.endAt ? Math.round((e.endAt - e.startAt) / 60000) : (e.estimateMinutes ?? 0);
      stats[stat] += mins;
      counts[stat] += 1;
    });

    // Normalize to 0-100 scale (10 hours = 100)
    const maxMinutes = 600;
    return Object.entries(stats).map(([key, value]) => ({
      label: key,
      shortLabel: key,
      value: Math.min(100, Math.round((value / maxMinutes) * 100)),
      minutes: value,
      sessions: counts[key as CharacterStat],
    }));
  }, [events]);

  // Points history (last 7 days)
  const pointsHistory = useMemo(() => {
    const now = Date.now();
    const days: { date: string; points: number }[] = [];

    for (let d = 6; d >= 0; d--) {
      const dayStart = new Date(now - d * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(
        (e) => e.startAt >= dayStart.getTime() && e.startAt <= dayEnd.getTime()
      );
      const pts = dayEvents.reduce((acc, e) => acc + (e.points ?? 0), 0);

      days.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        points: pts,
      });
    }
    return days;
  }, [events]);

  // Unlocked achievements
  const unlockedAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter((a) => {
      if (a.type === 'streak') {
        return (streakData?.longestStreak ?? 0) >= a.requirement;
      }
      if (a.type === 'xp') {
        return totals.xp >= a.requirement;
      }
      if (a.type === 'sessions') {
        return events.length >= a.requirement;
      }
      return false;
    });
  }, [streakData, totals.xp, events.length]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <InsightIcon name="chevronLeft" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>Rewards</Text>
        <View style={[styles.goldBadge, { backgroundColor: 'rgba(234, 179, 8, 0.12)' }]}>
          <Text style={styles.goldText}>{totals.gold}g</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Level Progress */}
        <View style={[styles.levelCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.progressContainer}>
            <Svg width={120} height={120} viewBox="0 0 120 120">
              <Circle cx="60" cy="60" r="54" stroke={palette.borderLight} strokeWidth="8" fill="none" />
              <Circle
                cx="60" cy="60" r="54"
                stroke={palette.tint} strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - totals.progress)}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </Svg>
            <View style={styles.levelInfo}>
              <Text style={[styles.levelLabel, { color: palette.textSecondary }]}>LEVEL</Text>
              <Text style={[styles.levelValue, { color: palette.text }]}>{totals.level}</Text>
            </View>
          </View>

          <View style={styles.xpRow}>
            <View style={styles.xpItem}>
              <Text style={[styles.xpLabel, { color: palette.textSecondary }]}>TOTAL XP</Text>
              <Text style={[styles.xpValue, { color: palette.text }]}>{Math.round(totals.xp)}</Text>
            </View>
            <View style={styles.xpItem}>
              <Text style={[styles.xpLabel, { color: palette.textSecondary }]}>NEXT LEVEL</Text>
              <Text style={[styles.xpValue, { color: palette.tint }]}>{Math.round(totals.toNext)} XP</Text>
            </View>
          </View>
        </View>

        {/* Character Stats Radar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Character Stats</Text>
            <View style={styles.radarContainer}>
              <RadarChart
                data={characterStats}
                size={200}
                color={palette.tint}
                showLabels
              />
            </View>
            <View style={styles.statsGrid}>
              {characterStats.map((stat) => (
                <View key={stat.label} style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: palette.textSecondary }]}>{stat.label}</Text>
                  <Text style={[styles.statValue, { color: palette.text }]}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </LuxCard>
        </Animated.View>

        {/* 1% Journey Section */}
        {streakData && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.streakHeader}>
                <Text style={{ fontSize: 17 }}>🔥</Text>
                <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 0 }]}>1% Journey</Text>
              </View>

              <View style={styles.xpRow}>
                <View style={styles.xpItem}>
                  <Text style={[styles.xpLabel, { color: palette.textSecondary }]}>STREAK</Text>
                  <Text style={[styles.xpValue, { color: palette.text }]}>
                    {streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.xpItem}>
                  <Text style={[styles.xpLabel, { color: palette.textSecondary }]}>MULTIPLIER</Text>
                  <Text style={[styles.xpValue, { color: palette.tint }]}>{streakData.multiplier.toFixed(2)}x</Text>
                </View>
              </View>

              {nextMilestone && (
                <View style={styles.milestoneProgress}>
                  <View style={styles.milestoneLabels}>
                    <Text style={[styles.milestoneText, { color: palette.textSecondary }]}>
                      {nextMilestone.days} days to {nextMilestone.badge}
                    </Text>
                    <Text style={[styles.milestoneText, { color: palette.textSecondary }]}>
                      Day {nextMilestone.milestone}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: palette.borderLight }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: palette.tint,
                          width: `${Math.min(100, (streakData.currentStreak / nextMilestone.milestone) * 100)}%`
                        }
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={[styles.messageBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.messageText, { color: palette.text }]}>"{streakMessage}"</Text>
              </View>

              <View style={styles.xpRow}>
                <View style={styles.xpItem}>
                  <Text style={[styles.xpLabel, { color: palette.textSecondary }]}>LONGEST</Text>
                  <Text style={[styles.xpValue, { color: palette.text }]}>{streakData.longestStreak}</Text>
                </View>
                <View style={styles.xpItem}>
                  <Text style={[styles.xpLabel, { color: palette.textSecondary }]}>TOTAL DAYS</Text>
                  <Text style={[styles.xpValue, { color: palette.text }]}>{streakData.totalActiveDays}</Text>
                </View>
              </View>
            </LuxCard>
          </Animated.View>
        )}

        {/* Achievement Badges */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Achievements</Text>
            <View style={styles.badgesGrid}>
              {ACHIEVEMENTS.map((a) => {
                const unlocked = unlockedAchievements.some((u) => u.id === a.id);
                return (
                  <View
                    key={a.id}
                    style={[
                      styles.badge,
                      { backgroundColor: unlocked ? `${palette.tint}15` : palette.borderLight },
                      !unlocked && styles.badgeLocked,
                    ]}
                  >
                    <Text style={[styles.badgeIcon, !unlocked && styles.badgeIconLocked]}>
                      {a.icon}
                    </Text>
                    <Text
                      style={[
                        styles.badgeName,
                        { color: unlocked ? palette.text : palette.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {a.name}
                    </Text>
                    <Text
                      style={[styles.badgeDesc, { color: palette.textSecondary }]}
                      numberOfLines={1}
                    >
                      {a.desc}
                    </Text>
                  </View>
                );
              })}
            </View>
          </LuxCard>
        </Animated.View>

        {/* Points History */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <LuxCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Points History</Text>
            <View style={styles.historyRow}>
              {pointsHistory.map((day, idx) => {
                const maxPts = Math.max(1, ...pointsHistory.map((d) => d.points));
                const height = (day.points / maxPts) * 60;
                return (
                  <View key={idx} style={styles.historyItem}>
                    <View style={styles.historyBarContainer}>
                      <View
                        style={[
                          styles.historyBar,
                          { height, backgroundColor: day.points > 0 ? palette.tint : palette.borderLight },
                        ]}
                      />
                    </View>
                    <Text style={[styles.historyLabel, { color: palette.textSecondary }]}>{day.date}</Text>
                    <Text style={[styles.historyValue, { color: palette.text }]}>
                      {day.points > 0 ? day.points.toFixed(1) : '-'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </LuxCard>
        </Animated.View>

        {/* Reward Store */}
        <Text style={[styles.sectionTitle, { color: palette.text, marginTop: 6 }]}>Reward Store</Text>

        <View style={styles.grid}>
          {STORE.map((item) => (
            <View key={item.id} style={[styles.rewardCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={[styles.iconCircle, { backgroundColor: palette.tint + '15' }]}>
                <InsightIcon name={item.icon} size={24} color={palette.tint} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={[styles.rewardName, { color: palette.text }]}>{item.name}</Text>
                <Text style={[styles.rewardDesc, { color: palette.textSecondary }]}>{item.desc}</Text>
              </View>
              <View style={styles.rewardFooter}>
                <Text style={[styles.rewardCost, { color: palette.text }]}>{item.costGold}g</Text>
                <TouchableOpacity
                  style={[styles.redeemBtn, { backgroundColor: totals.gold >= item.costGold ? palette.text : palette.borderLight }]}
                  disabled={totals.gold < item.costGold}
                >
                  <Text style={[styles.redeemText, { color: palette.background }]}>Redeem</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 6,
  },
  goldBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  goldText: {
    color: '#EAB308',
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  scroll: {
    padding: 14,
    gap: 14,
    paddingBottom: 42,
  },
  levelCard: {
    padding: 21,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    gap: 17,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  card: {
    padding: 17,
    borderRadius: 17,
    borderWidth: 1,
    gap: 14,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: {
    position: 'absolute',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelValue: {
    fontSize: 25,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  xpRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 11,
  },
  xpItem: {
    flex: 1,
    padding: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
    gap: 4,
  },
  xpLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  xpValue: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
    width: 35,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestoneProgress: {
    width: '100%',
    gap: 6,
  },
  milestoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneText: {
    fontSize: 8,
    fontWeight: '700',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  messageBox: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 11,
    width: '100%',
  },
  messageText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: '47%',
    padding: 10,
    borderRadius: 11,
    alignItems: 'center',
    gap: 4,
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 20,
  },
  badgeIconLocked: {
    opacity: 0.4,
    filter: 'grayscale(1)',
  },
  badgeName: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  historyItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  historyBarContainer: {
    height: 42,
    justifyContent: 'flex-end',
  },
  historyBar: {
    width: 17,
    borderRadius: 6,
    minHeight: 12,
  },
  historyLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  historyValue: {
    fontSize: 8,
    fontWeight: '800',
  },
  grid: {
    gap: 11,
  },
  rewardCard: {
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    gap: 11,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardContent: {
    gap: 4,
  },
  rewardName: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  rewardDesc: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  rewardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  rewardCost: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  redeemBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  redeemText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
