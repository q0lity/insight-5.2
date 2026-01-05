import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/src/state/theme';
import { InsightIcon, type InsightIconName } from '@/src/components/InsightIcon';
import { listEvents } from '@/src/storage/events';

type RewardItem = { id: string; name: string; costGold: number; desc: string; icon: InsightIconName };

const STORE: RewardItem[] = [
  { id: 'coffee', name: 'Coffee treat', costGold: 15, desc: 'A small reward after a strong day.', icon: 'smile' },
  { id: 'movie', name: 'Movie night', costGold: 40, desc: 'Unwind and reset.', icon: 'sparkle' },
  { id: 'gear', name: 'Buy gear', costGold: 120, desc: 'Invest in things that help.', icon: 'briefcase' },
  { id: 'dayoff', name: 'Half-day off', costGold: 220, desc: 'Recovery counts as progress.', icon: 'calendar' },
];

export default function RewardsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [points, setPoints] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    listEvents().then(events => {
      const total = events.reduce((acc, ev) => acc + (ev.points ?? 0), 0);
      setPoints(total);
    });
  }, []);

  const totals = useMemo(() => {
    const xp = Math.max(0, points * 10);
    const level = Math.max(1, Math.floor(xp / 250) + 1);
    const toNext = 250 - (xp % 250);
    const gold = Math.floor(points * 2.5);
    const progress = (250 - toNext) / 250;
    return { xp, level, toNext, gold, progress };
  }, [points]);

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

        <Text style={[styles.sectionTitle, { color: palette.text }]}>Reward Store</Text>
        
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Figtree',
    letterSpacing: -0.5,
  },
  backButton: {
    padding: 8,
  },
  goldBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  goldText: {
    color: '#EAB308',
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  scroll: {
    padding: 20,
    gap: 24,
    paddingBottom: 60,
  },
  levelCard: {
    padding: 30,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelValue: {
    fontSize: 36,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  xpRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  xpItem: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
    gap: 4,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Figtree',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Figtree',
    marginTop: 8,
  },
  grid: {
    gap: 16,
  },
  rewardCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardContent: {
    gap: 4,
  },
  rewardName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  rewardDesc: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  rewardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  rewardCost: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
  redeemBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  redeemText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Figtree',
  },
});
