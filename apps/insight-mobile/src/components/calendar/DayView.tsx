import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import type { CalendarEvent } from '@/src/storage/events';

const HOURS = Array.from({ length: 24 }).map((_, i) => i);

function formatHour(h: number) {
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour} ${period}`;
}

function formatTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

type Props = {
  date: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onEventUpdate?: (eventId: string, patch: { startAt: number; endAt: number }) => void;
  onCreateEvent?: (range: { startAt: number; endAt: number }) => void;
  hourHeight?: number;
};

type DragState = {
  id: string;
  mode: 'move' | 'resize';
  startMin: number;
  endMin: number;
};

type DraftRange = {
  startMin: number;
  endMin: number;
};

function clampMinutes(mins: number) {
  return Math.max(0, Math.min(24 * 60, mins));
}

function roundToStep(mins: number, step = 15) {
  return Math.round(mins / step) * step;
}

export function DayView({ date, events, onEventPress, onEventUpdate, onCreateEvent, hourHeight = 60 }: Props) {
  const { palette } = useTheme();
  const dragRef = useRef<DragState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [draftRange, setDraftRange] = useState<DraftRange | null>(null);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const dayEvents = useMemo(
    () => events.filter((e) => e.startAt >= dayStartMs && e.startAt < dayEndMs),
    [events, dayStartMs, dayEndMs]
  );

  const minuteHeight = hourHeight / 60;

  const applyDragDelta = (initial: DragState, dy: number) => {
    const deltaMinutes = roundToStep(dy / minuteHeight);
    if (initial.mode === 'resize') {
      const nextEnd = clampMinutes(initial.endMin + deltaMinutes);
      return {
        ...initial,
        endMin: Math.max(initial.startMin + 15, nextEnd),
      };
    }
    const duration = initial.endMin - initial.startMin;
    const nextStart = clampMinutes(initial.startMin + deltaMinutes);
    const nextEnd = clampMinutes(nextStart + duration);
    return { ...initial, startMin: nextStart, endMin: nextEnd };
  };

  const createPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const startMin = clampMinutes(roundToStep(evt.nativeEvent.locationY / minuteHeight));
          const endMin = clampMinutes(startMin + 30);
          setDraftRange({ startMin, endMin });
        },
        onPanResponderMove: (_, gestureState) => {
          setDraftRange((prev) => {
            if (!prev) return prev;
            const deltaMinutes = roundToStep(gestureState.dy / minuteHeight);
            const nextEnd = clampMinutes(prev.startMin + Math.max(15, deltaMinutes));
            return { startMin: prev.startMin, endMin: nextEnd };
          });
        },
        onPanResponderRelease: () => {
          setDraftRange((prev) => {
            if (prev && onCreateEvent) {
              const startAt = dayStartMs + prev.startMin * 60 * 1000;
              const endAt = dayStartMs + Math.max(prev.endMin, prev.startMin + 15) * 60 * 1000;
              onCreateEvent({ startAt, endAt });
            }
            return null;
          });
        },
      }),
    [dayStartMs, minuteHeight, onCreateEvent]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.grid} {...createPanResponder.panHandlers}>
        {HOURS.map((h) => (
          <View key={h} style={[styles.hourRow, { height: hourHeight }]}>
            <View style={styles.hourLabelCol}>
              <Text style={[styles.hourLabel, { color: palette.textSecondary }]}>
                {h === 0 ? '' : formatHour(h)}
              </Text>
            </View>
            <View style={[styles.hourLine, { borderTopColor: palette.border }]} />
          </View>
        ))}

        {draftRange ? (
          <View
            style={[
              styles.draftBlock,
              {
                top: (draftRange.startMin / 60) * hourHeight,
                height: Math.max(((draftRange.endMin - draftRange.startMin) / 60) * hourHeight, 30),
                borderColor: palette.tint,
              },
            ]}
          />
        ) : null}

        {dayEvents.map((ev) => {
          const start = new Date(ev.startAt);
          const resolvedEnd = ev.endAt ?? ev.startAt + 30 * 60 * 1000;
          const end = new Date(resolvedEnd);
          const startMins = start.getHours() * 60 + start.getMinutes();
          const endMins = end.getHours() * 60 + end.getMinutes();
          const durationMins = Math.max(15, endMins - startMins);
          const preview = dragState && dragState.id === ev.id ? dragState : null;
          const displayStart = preview ? preview.startMin : startMins;
          const displayEnd = preview ? preview.endMin : startMins + durationMins;
          const top = (displayStart / 60) * hourHeight;
          const height = ((displayEnd - displayStart) / 60) * hourHeight;
          const responder = PanResponder.create({
            onStartShouldSetPanResponder: (evt) => {
              if (evt.nativeEvent.locationY >= height - 12) {
                dragRef.current = { id: ev.id, mode: 'resize', startMin: startMins, endMin: endMins };
                setDragState(dragRef.current);
                return true;
              }
              dragRef.current = { id: ev.id, mode: 'move', startMin: startMins, endMin: endMins };
              setDragState(dragRef.current);
              return true;
            },
            onPanResponderMove: (_, gestureState) => {
              if (!dragRef.current) return;
              const next = applyDragDelta(dragRef.current, gestureState.dy);
              setDragState(next);
            },
            onPanResponderRelease: (_, gestureState) => {
              if (!dragRef.current) return;
              const next = applyDragDelta(dragRef.current, gestureState.dy);
              dragRef.current = null;
              setDragState(null);
              if (Math.abs(gestureState.dy) < 4 && onEventPress) {
                onEventPress(ev);
                return;
              }
              if (onEventUpdate) {
                const nextStartAt = dayStartMs + next.startMin * 60 * 1000;
                const nextEndAt = dayStartMs + next.endMin * 60 * 1000;
                onEventUpdate(ev.id, { startAt: nextStartAt, endAt: nextEndAt });
              }
            },
          });

          return (
            <TouchableOpacity
              key={ev.id}
              {...responder.panHandlers}
              style={[
                styles.eventBlock,
                {
                  top,
                  height: Math.max(height, 30),
                  backgroundColor: ev.active ? palette.tintLight : `rgba(217, 93, 57, 0.15)`,
                  borderColor: ev.active ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.eventStripe, { backgroundColor: palette.tint }]} />
              <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>
                {ev.title}
              </Text>
              <Text style={[styles.eventTime, { color: palette.textSecondary }]}>
                {formatTime(ev.startAt)} - {formatTime(ev.endAt)}
              </Text>
              {ev.tags && ev.tags.length > 0 && (
                <Text style={[styles.eventTags, { color: palette.tint }]} numberOfLines={1}>
                  {ev.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
                </Text>
              )}
              <View style={[styles.resizeHandle, { backgroundColor: palette.tint }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  grid: { flex: 1, paddingRight: 16 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hourLabelCol: { width: 60, alignItems: 'center', marginTop: -8 },
  hourLabel: { fontSize: 11, fontWeight: '600' },
  hourLine: { flex: 1, borderTopWidth: 1, marginTop: 8 },
  eventBlock: {
    position: 'absolute',
    left: 60,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    overflow: 'hidden',
  },
  eventStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  eventTitle: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
  eventTime: { fontSize: 11, marginLeft: 4, marginTop: 2 },
  eventTags: { fontSize: 10, marginLeft: 4, marginTop: 2 },
  resizeHandle: {
    position: 'absolute',
    height: 4,
    left: 12,
    right: 12,
    bottom: 6,
    borderRadius: 2,
    opacity: 0.8,
  },
  draftBlock: {
    position: 'absolute',
    left: 60,
    right: 0,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 93, 57, 0.08)',
  },
});
