import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useTheme } from '@/src/state/theme';

export type HeatmapRange = 'week' | 'month' | 'quarter' | 'year';

export type DayData = {
  date: Date;
  value: number;
};

type MobileHeatmapProps = {
  /** Daily values keyed by date string (YYYY-MM-DD) */
  data: Record<string, number>;
  /** Initial selected range */
  initialRange?: HeatmapRange;
  /** Callback when range changes */
  onRangeChange?: (range: HeatmapRange) => void;
  /** Callback when a day is tapped */
  onDayPress?: (date: Date, value: number) => void;
  /** Custom accent color (defaults to theme tint) */
  accentColor?: string;
};

const RANGE_OPTIONS: { key: HeatmapRange; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'quarter', label: 'Quarter', days: 90 },
  { key: 'year', label: 'Year', days: 365 },
];

const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysArray(endDate: Date, count: number): Date[] {
  const end = startOfDay(endDate);
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function getWeeksGrid(days: Date[]): Date[][] {
  if (days.length === 0) return [];

  // Organize days into weeks (columns) with rows for each day of week
  const firstDay = days[0];
  const startDow = firstDay.getDay(); // 0=Sunday

  // Pad the start with nulls to align with day of week
  const paddedDays: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) {
    paddedDays.push(null);
  }
  paddedDays.push(...days);

  // Calculate number of weeks
  const totalCells = paddedDays.length;
  const numWeeks = Math.ceil(totalCells / 7);

  // Create grid: 7 rows (days) x N columns (weeks)
  const grid: (Date | null)[][] = Array.from({ length: 7 }, () => []);

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      grid[d].push(idx < paddedDays.length ? paddedDays[idx] : null);
    }
  }

  return grid as Date[][];
}

function getCalendarGrid(days: Date[]): (Date | null)[][] {
  if (days.length === 0) return [];

  const firstDay = days[0];
  const startDow = firstDay.getDay();
  const padded: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) {
    padded.push(null);
  }
  padded.push(...days);

  const totalCells = Math.ceil(padded.length / 7) * 7;
  while (padded.length < totalCells) {
    padded.push(null);
  }

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

function getMonthLabels(days: Date[]): { label: string; weekIndex: number }[] {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  let currentWeek = 0;

  const firstDay = days[0];
  const startDow = firstDay?.getDay() ?? 0;

  days.forEach((day, idx) => {
    const month = day.getMonth();
    const weekIdx = Math.floor((idx + startDow) / 7);

    if (month !== lastMonth) {
      labels.push({ label: MONTH_LABELS[month], weekIndex: weekIdx });
      lastMonth = month;
    }
  });

  return labels;
}

export function MobileHeatmap({
  data,
  initialRange = 'month',
  onRangeChange,
  onDayPress,
  accentColor,
}: MobileHeatmapProps) {
  const { palette, sizes, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [selectedRange, setSelectedRange] = useState<HeatmapRange>(initialRange);

  const accent = accentColor ?? palette.tint;

  const rangeConfig = useMemo(
    () => RANGE_OPTIONS.find((r) => r.key === selectedRange) ?? RANGE_OPTIONS[1],
    [selectedRange]
  );

  const days = useMemo(() => getDaysArray(new Date(), rangeConfig.days), [rangeConfig.days]);

  const maxValue = useMemo(() => {
    let max = 0;
    days.forEach((day) => {
      const key = formatDateKey(day);
      const val = data[key] ?? 0;
      if (val > max) max = val;
    });
    return Math.max(max, 1);
  }, [days, data]);

  const weeksGrid = useMemo(() => getWeeksGrid(days), [days]);
  const monthLabels = useMemo(() => getMonthLabels(days), [days]);
  const numWeeks = weeksGrid[0]?.length ?? 0;

  const isLateral = selectedRange === 'week' || selectedRange === 'month' || selectedRange === 'quarter';
  const useFullDayNames = selectedRange === 'week';
  const dayLabels = useFullDayNames ? DAY_LABELS_FULL : DAY_LABELS_SHORT;

  // Calculate cell size based on available width
  const labelWidth = isLateral ? 0 : useFullDayNames ? 80 : 20;
  const horizontalPadding = 32;
  const availableWidth = screenWidth - horizontalPadding - labelWidth;

  const cellGap = selectedRange === 'week' ? 6 : selectedRange === 'month' ? 5 : selectedRange === 'quarter' ? 4 : 2;
  const columns = isLateral ? 7 : Math.max(1, numWeeks);
  const rawCellSize = Math.floor((availableWidth - (columns - 1) * cellGap) / columns);

  const cellSize = isLateral
    ? Math.min(36, Math.max(12, rawCellSize))
    : selectedRange === 'month'
      ? Math.min(36, rawCellSize)
      : selectedRange === 'quarter'
        ? Math.min(16, rawCellSize)
        : Math.min(10, rawCellSize);

  const handleRangeChange = useCallback(
    (range: HeatmapRange) => {
      setSelectedRange(range);
      onRangeChange?.(range);
    },
    [onRangeChange]
  );

  const getColorForValue = useCallback(
    (value: number) => {
      if (value === 0) {
        return palette.borderLight;
      }
      const intensity = Math.min(1, value / maxValue);
      // Tint gradient based on intensity using theme accent
      if (intensity < 0.25) {
        return `${accent}40`; // 25% opacity
      }
      if (intensity < 0.5) {
        return `${accent}73`; // 45% opacity
      }
      if (intensity < 0.75) {
        return `${accent}B3`; // 70% opacity
      }
      return accent;
    },
    [maxValue, accent, palette.borderLight]
  );

  const today = startOfDay(new Date());

  return (
    <View style={[styles.container, { gap: sizes.rowGap }]}>
      {/* Range Selector */}
      <View style={[styles.rangeSelectorContainer, { backgroundColor: palette.borderLight, borderRadius: sizes.borderRadiusSmall }]}>
        {RANGE_OPTIONS.map((option) => {
          const isSelected = option.key === selectedRange;
          return (
            <Pressable
              key={option.key}
              onPress={() => handleRangeChange(option.key)}
              style={[
                styles.rangeOption,
                { paddingVertical: sizes.spacingSmall, paddingHorizontal: sizes.chipPadding, borderRadius: sizes.borderRadiusSmall - 2 },
                isSelected && [styles.rangeOptionSelected, { backgroundColor: accent }],
              ]}>
              <Text
                style={[
                  styles.rangeOptionText,
                  { color: isSelected ? '#FFFFFF' : palette.textSecondary, fontSize: sizes.smallText },
                  isSelected && styles.rangeOptionTextSelected,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Month Labels */}
      {!isLateral && selectedRange !== 'week' && monthLabels.length > 0 && (
        <View style={styles.monthLabelsContainer}>
          <View style={{ width: labelWidth }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.monthLabelsRow, { width: numWeeks * (cellSize + cellGap) }]}>
              {monthLabels.map((item, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.monthLabel,
                    { color: palette.textSecondary, left: item.weekIndex * (cellSize + cellGap), fontSize: sizes.tinyText },
                  ]}>
                  {item.label}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Heatmap Grid */}
      {isLateral ? (
        <View style={styles.lateralContainer}>
          <View style={[styles.dayLabelsRow, { marginBottom: cellGap }]}>
            {DAY_LABELS_SHORT.map((label, idx) => (
              <View key={idx} style={[styles.dayLabelCell, { width: cellSize, height: cellSize }]}>
                <Text style={[styles.dayLabel, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.weeksColumn, { gap: cellGap }]}>
            {getCalendarGrid(days).map((week, weekIdx) => (
              <View key={weekIdx} style={[styles.weekRow, { gap: cellGap }]}>
                {week.map((day, dayIdx) => {
                  if (!day) {
                    return (
                      <View
                        key={dayIdx}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: palette.borderLight,
                            borderRadius: Math.max(3, Math.round(cellSize * 0.25)),
                          },
                        ]}
                      />
                    );
                  }

                  const key = formatDateKey(day);
                  const value = data[key] ?? 0;
                  const isToday = day.getTime() === today.getTime();

                  return (
                    <Pressable
                      key={dayIdx}
                      onPress={() => onDayPress?.(day, value)}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: getColorForValue(value),
                          borderRadius: Math.max(3, Math.round(cellSize * 0.25)),
                        },
                        isToday && [styles.todayCell, { borderColor: accent }],
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.gridContainer}>
          <View style={[styles.dayLabelsColumn, { width: labelWidth }]}>
            {dayLabels.map((label, idx) => (
              <View key={idx} style={[styles.dayLabelCell, { height: cellSize }]}>
                {(useFullDayNames || idx === 0 || idx === 3 || idx === 6) && (
                  <Text
                    style={[
                      styles.dayLabel,
                      { color: palette.textSecondary, fontSize: sizes.tinyText },
                      useFullDayNames && { fontSize: sizes.smallText, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View style={[styles.weeksRow, { gap: sizes.heatmapGap }]}>
              {Array.from({ length: numWeeks }).map((_, weekIdx) => (
                <View key={weekIdx} style={[styles.weekColumn, { gap: cellGap }]}>
                  {weeksGrid.map((row, dayIdx) => {
                    const day = row[weekIdx];
                    if (!day) {
                      return (
                        <View
                          key={dayIdx}
                          style={[
                            styles.cell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: palette.borderLight,
                              borderRadius: cellSize > 20 ? 6 : cellSize > 12 ? 4 : 2,
                            },
                          ]}
                        />
                      );
                    }

                    const key = formatDateKey(day);
                    const value = data[key] ?? 0;
                    const isToday = day.getTime() === today.getTime();

                    return (
                      <Pressable
                        key={dayIdx}
                        onPress={() => onDayPress?.(day, value)}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: getColorForValue(value),
                            borderRadius: cellSize > 20 ? 6 : cellSize > 12 ? 4 : 2,
                          },
                          isToday && [styles.todayCell, { borderColor: accent }],
                        ]}>
                        {selectedRange === 'week' && (
                          <Text
                            style={[
                              styles.cellDayNumber,
                              { color: value > 0 ? '#FFFFFF' : palette.textSecondary, fontSize: sizes.smallText },
                            ]}>
                            {day.getDate()}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Legend */}
      <View style={[styles.legendContainer, { gap: sizes.spacingSmall }]}>
        <Text style={[styles.legendText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
          Less
        </Text>
        <View style={[styles.legendCells, { gap: sizes.heatmapGap }]}>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
            <View
              key={idx}
              style={[
                styles.legendCell,
                { backgroundColor: getColorForValue(intensity * maxValue), width: sizes.heatmapCell, height: sizes.heatmapCell },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.legendText, { color: palette.textSecondary, fontSize: sizes.tinyText }]}>
          More
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  rangeSelectorContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  rangeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rangeOptionSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  rangeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rangeOptionTextSelected: {
    fontWeight: '700',
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthLabelsRow: {
    position: 'relative',
    height: 16,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  lateralContainer: {
    gap: 6,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeksColumn: {
    flexDirection: 'column',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayLabelsColumn: {
    justifyContent: 'space-between',
  },
  dayLabelCell: {
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayLabelFull: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingRight: 8,
  },
  weeksRow: {
    flexDirection: 'row',
    gap: 3,
  },
  weekColumn: {
    flexDirection: 'column',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: {
    borderWidth: 2,
  },
  cellDayNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  legendCells: {
    flexDirection: 'row',
    gap: 3,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
