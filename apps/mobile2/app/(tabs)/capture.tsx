import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, type PressableStateCallbackType, ScrollView, Share, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { Text, View } from '@/components/Themed';
import { useTheme } from '@/src/state/theme';
import { addInboxCapture, listInboxCaptures, updateInboxCapture, updateInboxCaptureText, type CaptureAttachment, type InboxCapture } from '@/src/storage/inbox';
import { useSession } from '@/src/state/session';
import { createTask } from '@/src/storage/tasks';
import { createTrackerLog } from '@/src/storage/trackers';
import { getEvent, startEvent, stopEvent, updateEvent } from '@/src/storage/events';
import { autoCategorize, detectIntent, formatSegmentsPreview, parseCapture } from '@/src/lib/schema';
import { parseCaptureNatural, type ParsedEvent } from '@/src/lib/nlp/natural';
import { estimateWorkoutCalories, parseMealFromText, parseWorkoutFromText } from '@/src/lib/health';
import { RECORDING_OPTIONS } from '@/src/lib/audio';
import { invokeCaptureParse } from '@/src/supabase/functions';
import { upsertTranscriptSegment } from '@/src/supabase/segments';
import { uploadCaptureAudio } from '@/src/supabase/storage';
import { saveMeal } from '@/src/storage/nutrition';
import { saveWorkout } from '@/src/storage/workouts';
import {
  CHARACTER_KEYS,
  CATEGORY_SHORTCUTS,
  SUBCATEGORY_SHORTCUTS,
  parseCommaList,
  parseTagList,
  uniqStrings,
} from '@/src/utils/frontmatter';
import { computeXp, formatXp, resolveGoalMultiplier } from '@/src/utils/points';

function extractTags(rawText: string) {
  const out = new Set<string>();
  for (const m of rawText.matchAll(/#([a-zA-Z][\\w/-]*)/g)) out.add(m[1].toLowerCase());
  return [...out].slice(0, 8);
}

function extractContexts(rawText: string) {
  const out = new Set<string>();
  for (const m of rawText.matchAll(/(^|[\\s(])\\+([a-zA-Z][\\w/-]*)/g)) {
    out.add(m[2].toLowerCase());
  }
  return [...out].slice(0, 8);
}

function formatTimeMarker(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `[${hh}:${mm}] `;
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const TIMESTAMP_LINE_RE = /^\[\d{2}:\d{2}(?::\d{2})?\]\s*$/;
const PAUSE_FOR_MARKER_MS = 5000;
const PAUSE_FOR_DIVIDER_MS = 15000;
const MIN_MARKER_GAP_MS = 12000;

function lastNonEmptyLine(text: string) {
  const lines = text.trimEnd().split('\n').filter((line) => line.trim());
  return lines.length ? lines[lines.length - 1] : '';
}

function hasSemanticContent(text: string) {
  return text.split('\n').some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (TIMESTAMP_LINE_RE.test(trimmed)) return false;
    if (trimmed.startsWith('---')) return false;
    return true;
  });
}

function buildAutoInsertion(current: string, opts: { divider: boolean; timestamp: boolean }) {
  if (!opts.divider && !opts.timestamp) return '';
  const hasText = current.trim().length > 0;
  const prefix = hasText ? (opts.divider ? '\n\n' : '\n') : '';
  const lines: string[] = [];
  if (opts.divider) lines.push('---');
  if (opts.timestamp) lines.push(formatTimeMarker().trim());
  return `${prefix}${lines.join('\n')}\n`;
}

function normalizeCaptureText(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.replace(/^- \\*\\*(\\d{1,2}:\\d{2})\\*\\* -\\s*/, '[$1] '))
    .join('\n')
    .trim();
}

function countSegments(normalized: string) {
  const dividerCount = normalized.split('\n').filter((line) => line.trim().startsWith('---')).length;
  return dividerCount ? dividerCount + 1 : 0;
}

function detectDrivingCommand(text: string) {
  const lower = text.toLowerCase();
  if (/(driving right now|started driving|start driving|on my way)/.test(lower)) {
    return {
      action: 'start' as const,
      title: 'Commute',
      trackerKey: 'transport',
      category: 'Transport',
      subcategory: 'Driving',
      contexts: ['car'],
    };
  }
  if (/(stopped driving|stop driving|done driving|arrived)/.test(lower)) {
    return { action: 'stop' as const, title: 'Commute', trackerKey: 'transport' };
  }
  return null;
}

type TaxonomyRule = {
  match: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
};

const STARTER_TAXONOMY: Array<{ category: string; subcategories: string[] }> = [
  { category: 'Work', subcategories: ['Clinic', 'Surgery', 'Didactics', 'Admin', 'Research', 'Call'] },
  { category: 'Health', subcategories: ['Workout', 'Sleep', 'Nutrition', 'Recovery', 'Meditation'] },
  { category: 'Personal', subcategories: ['Errands', 'Groceries', 'Family', 'Friends', 'Home'] },
  { category: 'Learning', subcategories: ['Reading', 'Practice', 'Coursework'] },
  { category: 'Transport', subcategories: ['Driving', 'Flight', 'Transit', 'Commute', 'Parking'] },
  { category: 'Finance', subcategories: ['Banking', 'Budget', 'Bills', 'Expenses', 'Income'] },
];

function categoriesFromStarter() {
  return STARTER_TAXONOMY.map((entry) => entry.category);
}

function subcategoriesFromStarter(category: string | null | undefined) {
  const match = (category ?? '').trim().toLowerCase();
  if (!match) return [];
  const found = STARTER_TAXONOMY.find((entry) => entry.category.toLowerCase() === match);
  return found?.subcategories ?? [];
}

function toTitleCase(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

function parseInlineList(raw: string) {
  return raw
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseSimpleFrontmatter(lines: string[]) {
  const out: Record<string, unknown> = {};
  let activeKey: string | null = null;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (activeKey) out[activeKey] = [...listBuffer];
    activeKey = null;
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && activeKey) {
      listBuffer.push(listMatch[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    if (activeKey) flushList();
    const match = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!match?.[1]) continue;
    const key = match[1];
    const value = (match[2] ?? '').trim();
    if (!value) {
      activeKey = key;
      listBuffer = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = parseInlineList(value);
      continue;
    }
    const unquoted = value.replace(/^['"]|['"]$/g, '');
    if (/^(true|false)$/i.test(unquoted)) {
      out[key] = unquoted.toLowerCase() === 'true';
      continue;
    }
    const num = Number(unquoted);
    out[key] = Number.isFinite(num) && unquoted !== '' ? num : unquoted;
  }
  if (activeKey) flushList();
  return out;
}

function extractFrontmatter(rawText: string) {
  const lines = rawText.split(/\r?\n/);
  if ((lines[0] ?? '').trim() !== '---') return { frontmatter: null as Record<string, unknown> | null, body: rawText };
  const endIdx = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (endIdx === -1) return { frontmatter: null as Record<string, unknown> | null, body: rawText };
  const fmLines = lines.slice(1, endIdx + 1);
  const body = lines.slice(endIdx + 2).join('\n').trim();
  const frontmatter = parseSimpleFrontmatter(fmLines);
  return { frontmatter, body };
}

function toStringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string') return value.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function extractContextTokens(rawText: string) {
  const out = new Set<string>();
  for (const match of rawText.matchAll(/(^|[\s(])\+([a-zA-Z][\w/-]*)/g)) {
    const name = (match[2] ?? '').trim();
    if (name) out.add(name);
  }
  return [...out].slice(0, 16);
}

function extractDurationToken(rawText: string) {
  const text = rawText.toLowerCase();
  const hm = text.match(/~\s*(\d{1,2})\s*h(?:ours?)?\s*(\d{1,2})\s*m(?:in(?:ute)?s?)?\b/);
  if (hm?.[1]) {
    const h = Number(hm[1]);
    const m = Number(hm[2] ?? 0);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }
  const h = text.match(/~\s*(\d{1,2})(?:\.(\d))?\s*h(?:ours?)?\b/);
  if (h?.[1]) {
    const whole = Number(h[1]);
    const tenth = h[2] ? Number(h[2]) / 10 : 0;
    if (Number.isFinite(whole)) return Math.max(1, Math.round((whole + tenth) * 60));
  }
  const m = text.match(/~\s*(\d{1,3})\s*(m|min|mins|minute|minutes)\b/);
  if (m?.[1]) {
    const mins = Number(m[1]);
    if (Number.isFinite(mins)) return Math.max(1, Math.min(24 * 60, mins));
  }
  return null;
}

function extractImportanceToken(rawText: string) {
  const match = rawText.match(/!(\d{1,2})\b/);
  const v = match?.[1] ? Number(match[1]) : null;
  const kv = rawText.match(/\bimportance[:=]\s*(\d{1,2})\b/i)?.[1];
  const vv = kv ? Number(kv) : null;
  const val = Number.isFinite(v ?? NaN) ? v : Number.isFinite(vv ?? NaN) ? vv : null;
  return val != null ? Math.max(1, Math.min(10, val)) : null;
}

function extractDifficultyToken(rawText: string) {
  const match = rawText.match(/\^(\d{1,2})\b/);
  const v = match?.[1] ? Number(match[1]) : null;
  const kv = rawText.match(/\b(?:difficulty|energy)[:=]\s*(\d{1,2})\b/i)?.[1];
  const ratio = rawText.match(/\b(\d{1,2})\s*\/\s*10\b/)?.[1];
  const vv = kv ? Number(kv) : ratio ? Number(ratio) : null;
  const val = Number.isFinite(v ?? NaN) ? v : Number.isFinite(vv ?? NaN) ? vv : null;
  return val != null ? Math.max(1, Math.min(10, val)) : null;
}

function hasExplicitTimeRange(rawText: string) {
  const text = rawText.toLowerCase();
  if (/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|\s+to\s+)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/.test(text)) return true;
  if (/\b(at|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/.test(text)) return true;
  return false;
}

function extractTagTokens(rawText: string) {
  const out = new Set<string>();
  for (const match of rawText.matchAll(/#([a-zA-Z][\w/-]*)(?!\s*(\(|:\s*[-+]?\d))/g)) {
    out.add(match[1].toLowerCase());
  }
  return [...out].slice(0, 24);
}

function extractAtMentions(rawText: string) {
  const out: Array<{ raw: string; before: string }> = [];
  for (const match of rawText.matchAll(
    /(^|[\s(])@(?:"([^"]+)"|'([^']+)'|([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*){0,3}))/g
  )) {
    const before = (match[1] ?? '').toLowerCase();
    const raw = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (!raw) continue;
    out.push({ raw, before });
  }
  return out.slice(0, 16);
}

function extractTrackerTokens(text: string) {
  const out: Array<{ name: string; value: number }> = [];
  for (const match of text.matchAll(/#([a-zA-Z][\w/-]*)\(([-+]?\d*\.?\d+)\)/g)) {
    out.push({ name: match[1], value: Number(match[2]) });
  }
  for (const match of text.matchAll(/#([a-zA-Z][\w/-]*):([-+]?\d*\.?\d+)/g)) {
    out.push({ name: match[1], value: Number(match[2]) });
  }
  return out;
}

function uniqStringsLoose(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function extractImplicitPeople(rawText: string) {
  const out: string[] = [];
  for (const match of rawText.matchAll(
    /\bwith\s+(?:(?:dr|doctor|mr|ms|mrs|prof|professor)\.?\s+)?([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*){0,2})\b/gim
  )) {
    const name = (match[1] ?? '').trim();
    if (!name) continue;
    out.push(name);
  }
  for (const match of rawText.matchAll(/\b(?:call|text|dm|email)\s+(mom|dad|mother|father|wife|husband|partner)\b/gim)) {
    const raw = (match[1] ?? '').trim();
    if (!raw) continue;
    out.push(raw[0]!.toUpperCase() + raw.slice(1).toLowerCase());
  }
  return uniqStringsLoose(out).slice(0, 8);
}

function normalizePersonName(raw: string) {
  const cleaned = raw
    .replace(/^@+/, '')
    .replace(/^[\s,;:.!]+/, '')
    .replace(/[\s,;:.!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  const relationMap: Record<string, string> = {
    mom: 'Mom',
    mother: 'Mother',
    dad: 'Dad',
    father: 'Father',
    wife: 'Wife',
    husband: 'Husband',
    partner: 'Partner',
  };
  const dropWords = new Set([
    'a',
    'an',
    'the',
    'at',
    'in',
    'on',
    'with',
    'for',
    'to',
    'from',
    'and',
    'or',
    'him',
    'her',
    'them',
    'me',
    'my',
    'their',
    'his',
    'hers',
    'i',
    'im',
    "i'm",
    'talked',
    'talking',
    'met',
    'see',
    'saw',
    'baby',
  ]);
  const bannedWords = new Set([
    'patient',
    'patients',
    'nurse',
    'nursing',
    'clinic',
    'hospital',
    'staff',
    'team',
    'coworker',
    'coworkers',
    'people',
    'unit',
    'room',
    'chart',
    'charting',
    'shift',
    'rounds',
  ]);
  const titleWords = new Set(['dr', 'doctor', 'mr', 'mrs', 'ms', 'prof', 'professor', 'aunt', 'uncle']);
  const parts = cleaned.split(' ').filter(Boolean);
  while (parts.length && titleWords.has(parts[0]!.toLowerCase())) parts.shift();
  const filtered = parts.filter((part) => !dropWords.has(part.toLowerCase()));
  if (filtered.length === 0) return null;
  if (filtered.length > 3) return null;
  const joined = filtered.join(' ');
  const lowerJoined = joined.toLowerCase();
  if (relationMap[lowerJoined]) return relationMap[lowerJoined];
  if (!/[A-Z]/.test(joined)) return null;
  if (filtered.some((part) => bannedWords.has(part.toLowerCase()))) return null;
  if (/^(he|she|they|him|her|them|someone|somebody|anyone|anybody|me|my)$/i.test(joined)) return null;
  if (!/[a-z]/i.test(joined)) return null;
  if (joined.length > 40) return null;
  return joined;
}

function cleanPeopleList(values: string[]) {
  const out: string[] = [];
  for (const raw of values) {
    for (const piece of raw.split(/\s*(?:,|&|and)\s*/i)) {
      const name = normalizePersonName(piece);
      if (!name) continue;
      out.push(name);
    }
  }
  return uniqStringsLoose(out).slice(0, 12);
}

function extractImplicitPlaces(rawText: string) {
  const out: string[] = [];
  const banned = new Set(['AM', 'PM', 'Today', 'Tomorrow', 'Yesterday', 'I']);
  for (const match of rawText.matchAll(/\b(?:at|in|to)\s+([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*){0,4})\b/g)) {
    const name = (match[1] ?? '').trim();
    if (!name) continue;
    if (banned.has(name)) continue;
    out.push(name);
  }
  const commonPlaceMap: Record<string, string> = {
    gym: 'Gym',
    bank: 'Bank',
    clinic: 'Clinic',
    hospital: 'Hospital',
    er: 'ER',
    home: 'Home',
    work: 'Work',
    office: 'Office',
  };
  for (const match of rawText.matchAll(/\b(?:at|in|to)\s+(?:the\s+)?(gym|bank|clinic|hospital|er|home|work|office)\b/gim)) {
    const key = (match[1] ?? '').trim().toLowerCase();
    const mapped = commonPlaceMap[key];
    if (mapped) out.push(mapped);
  }
  return uniqStringsLoose(out).slice(0, 8);
}

function extractMoneyUsd(rawText: string) {
  const text = rawText.toLowerCase();
  const usd = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1];
  if (usd) return Number(usd);
  const dollars = text.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)\b/)?.[1];
  if (dollars) return Number(dollars);
  const spend = text.match(/\bspend\s*(?:about\s*)?(\d+(?:\.\d{1,2})?)\b/)?.[1];
  if (spend) return Number(spend);
  return null;
}

function extractShoppingItems(rawText: string) {
  const match = rawText.match(/\b(?:buy|get|pick up|grab)\b\s+([^.;\n]+)/i)?.[1];
  if (!match) return [];
  const cut = match.split(/\b(?:at|in|to|with|for|tomorrow|today|next|on)\b/i)[0] ?? match;
  return uniqStringsLoose(
    cut
      .split(/,|\band\b/i)
      .map((item) => item.trim())
      .filter(Boolean),
  ).slice(0, 12);
}

function buildShoppingNotes(items: string[], moneyUsd: number | null) {
  const lines: string[] = [];
  if (items.length) {
    lines.push('| Item | Cost |');
    lines.push('| --- | --- |');
    lines.push(...items.map((item) => `| ${item} |  |`));
  }
  if (moneyUsd != null && Number.isFinite(moneyUsd)) lines.push(`Total budget: $${moneyUsd}`);
  return lines.join('\n');
}

function inferDifficultyFromText(text: string) {
  const lower = text.toLowerCase();
  if (/\bmarathon|half[-\s]?marathon\b/.test(lower)) return 10;
  const miles = lower.match(/\b(\d+(?:\.\d+)?)\s*(mi|mile|miles|km|kilometer|kilometers)\b/);
  if (miles?.[1]) {
    const dist = Number(miles[1]);
    if (Number.isFinite(dist)) {
      if (dist >= 10) return 9;
      if (dist >= 5) return 8;
      if (dist >= 3) return 7;
    }
  }
  const reps = lower.match(/\b(\d{2,})\s*(pushups|situps|burpees|squats)\b/);
  if (reps?.[1]) {
    const count = Number(reps[1]);
    if (Number.isFinite(count)) {
      if (count >= 200) return 9;
      if (count >= 100) return 8;
      if (count >= 50) return 7;
    }
  }
  if (/\b(brutal|exhausting|wrecked|destroyed)\b/.test(lower)) return 9;
  if (/\b(hard|tough|intense|stressful|rough)\b/.test(lower)) return 8;
  if (/\b(challenging)\b/.test(lower)) return 7;
  if (/\b(workout|gym|lift|lifting|run|running|cardio|training)\b/.test(lower)) return 6;
  if (/\b(normal|okay)\b/.test(lower)) return 5;
  if (/\b(easy|light|chill)\b/.test(lower)) return 3;
  return null;
}

function inferImportanceFromText(text: string) {
  const lower = text.toLowerCase();
  if (/\b(critical|urgent|life[-\s]?changing)\b/.test(lower)) return 10;
  if (/\b(deadline|exam|interview|surgery|presentation)\b/.test(lower)) return 9;
  if (/\b(important|major|big|huge|milestone)\b/.test(lower)) return 8;
  if (/\b(work|clinic|patients|meeting|rounds|inpatient)\b/.test(lower)) return 7;
  if (/\b(good|productive)\b/.test(lower)) return 6;
  if (/\b(minor|small|trivial)\b/.test(lower)) return 3;
  return null;
}

function inferCharacterFromText(text: string, tags: string[] = []) {
  const lower = `${text} ${tags.join(' ')}`.toLowerCase();
  const out = new Set<(typeof CHARACTER_KEYS)[number]>();
  if (/\b(workout|gym|lift|weights|strength|pushups|squats)\b/.test(lower)) out.add('STR');
  if (/\b(run|cardio|walk|stairs|endurance|long)\b/.test(lower)) out.add('CON');
  if (/\b(study|read|reading|learn|code|research|write|writing)\b/.test(lower)) out.add('INT');
  if (/\b(meet|meeting|call|talk|chat|social|family|friends)\b/.test(lower)) out.add('PER');
  return [...out];
}

function normalizeTagName(tag: string) {
  return tag.replace(/^#/, '').trim().toLowerCase();
}

function normalizeHashTag(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function slugifyTag(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTagTokenFromLabel(raw: string) {
  const slug = slugifyTag(raw);
  return slug ? `#${slug}` : '';
}

function deriveKeywordTag(title: string, category?: string | null, subcategory?: string | null) {
  const stop = new Set(['the', 'a', 'an', 'with', 'and', 'for', 'to', 'from', 'at', 'in', 'on', 'of', 'my']);
  const base = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((word) => word.length > 3 && !stop.has(word));
  const avoid = new Set([category ?? '', subcategory ?? ''].map((x) => x.toLowerCase()));
  const picked = base.find((word) => !avoid.has(word));
  return picked ? toTagTokenFromLabel(picked) : '';
}

function buildTagTokens(
  baseTags: string[],
  opts?: { category?: string | null; subcategory?: string | null; title?: string; location?: string | null; includeGlobals?: string[] },
) {
  const normalized = new Set((opts?.includeGlobals ?? []).map(normalizeHashTag).filter(Boolean));
  for (const tag of baseTags) normalized.add(normalizeHashTag(tag));
  const derived: string[] = [];
  if (opts?.category) derived.push(toTagTokenFromLabel(opts.category));
  if (opts?.subcategory) derived.push(toTagTokenFromLabel(opts.subcategory));
  if (opts?.location) derived.push(toTagTokenFromLabel(opts.location.split(/[,|/]/)[0] ?? opts.location));
  if (opts?.title) derived.push(deriveKeywordTag(opts.title, opts?.category ?? null, opts?.subcategory ?? null));
  for (const tag of derived) {
    if (!tag) continue;
    if (normalized.size >= 5) break;
    normalized.add(tag);
  }
  if (normalized.size < 3) normalized.add('#general');
  return Array.from(normalized);
}

function mergeWithGlobalTags(
  tags: string[] | null | undefined,
  opts?: { category?: string | null; subcategory?: string | null; title?: string; location?: string | null; includeGlobals?: boolean; globalTags?: string[] },
) {
  const includeGlobals = opts?.includeGlobals ? opts?.globalTags ?? [] : [];
  return buildTagTokens(tags ?? [], { ...opts, includeGlobals });
}

function inferCategorySubcategory(
  title: string,
  tags: string[],
  baseRules?: Array<{ match: string; category?: string; subcategory?: string; tags?: string[] }>,
) {
  const text = title.toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.replace(/^#/, '').toLowerCase()));

  let category: string | null = null;
  let subcategory: string | null = null;

  if (baseRules?.length) {
    for (const rule of baseRules) {
      const rx = rule.match?.trim();
      if (!rx) continue;
      try {
        const re = new RegExp(rx, 'i');
        if (!re.test(title)) continue;
        if (rule.category && !category) category = rule.category;
        if (rule.subcategory && !subcategory) subcategory = rule.subcategory;
        if (rule.tags?.length) {
          for (const tag of rule.tags) tagSet.add(tag.replace(/^#/, '').toLowerCase());
        }
        break;
      } catch {
        // ignore malformed rule
      }
    }
  }

  for (const rawTag of tags) {
    const cleaned = rawTag.replace(/^#/, '').trim();
    if (!cleaned || !cleaned.includes('/')) continue;
    const [cat, sub] = cleaned.split('/', 2);
    if (cat) category = toTitleCase(cat);
    if (sub) subcategory = toTitleCase(sub);
    break;
  }

  const workoutMatch = tagSet.has('workout') || /\b(workout|gym|lift|lifting|run|cardio|yoga|training)\b/.test(text);
  if (workoutMatch) {
    category = 'Health';
    subcategory = subcategory ?? 'Workout';
  }

  if (!category && (tagSet.has('work') || /\b(work|shift)\b/.test(text))) category = 'Work';
  if (tagSet.has('clinic') || /\b(clinic|patients|rounds|inpatient)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = 'Clinic';
  }
  if (tagSet.has('meeting') || /\b(meeting|conference|rounds)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = subcategory ?? 'Meeting';
  }
  if (tagSet.has('surgery') || /\b(surgery)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = 'Surgery';
  }
  if (tagSet.has('didactics') || /\b(didactics)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = subcategory ?? 'Didactics';
  }
  if (tagSet.has('study') || /\b(study|lecture|reading)\b/.test(text)) {
    category = category ?? 'Learning';
    subcategory = subcategory ?? (/\b(read|reading)\b/.test(text) ? 'Reading' : 'Practice');
  }
  if (tagSet.has('sleep') || /\b(sleep|nap)\b/.test(text)) {
    category = category ?? 'Health';
    subcategory = subcategory ?? 'Sleep';
  }
  if (tagSet.has('shopping') || /\b(grocery|shopping|store|errand)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? (/\b(grocery|groceries)\b/.test(text) ? 'Groceries' : 'Errands');
  }
  if (tagSet.has('morning') || /\b(get ready|morning routine|prep|ready for work)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Morning Routine';
  }
  if (tagSet.has('food') || /\b(dinner|lunch|breakfast|meal|restaurant|food)\b/.test(text)) {
    category = category ?? 'Food';
    subcategory = subcategory ?? (/\b(restaurant|dinner out|lunch out|eat out)\b/.test(text) ? 'Restaurant' : 'Meal');
  }
  if (tagSet.has('walk') || /\b(walk|stroll)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Health';
  }
  if (tagSet.has('transport') || /\b(transport|drive|driving|commute|flight|fly|uber|lyft|train|bus|parking)\b/.test(text)) {
    category = category ?? 'Transport';
    if (/\b(flight|fly|airport)\b/.test(text)) subcategory = subcategory ?? 'Flight';
    else if (/\b(train|bus|transit|subway)\b/.test(text)) subcategory = subcategory ?? 'Transit';
    else if (/\b(parking)\b/.test(text)) subcategory = subcategory ?? 'Parking';
    else subcategory = subcategory ?? 'Driving';
  }
  if (tagSet.has('finance') || /\b(bank|finance|mortgage|loan|bill|budget|expense)\b/.test(text)) {
    category = category ?? 'Finance';
    subcategory = subcategory ?? (/\b(bank)\b/.test(text) ? 'Banking' : /\b(bill|bills)\b/.test(text) ? 'Bills' : 'Budget');
  }
  if (/\b(job|application|apply|resume|interview|hiring|career)\b/.test(text)) {
    category = category ?? 'Work';
    subcategory = subcategory ?? 'Job Applications';
  }
  if (/\b(rent|landlord|lease|tenant)\b/.test(text)) {
    category = category ?? 'Finance';
    subcategory = subcategory ?? 'Rent';
  }
  if (/\b(microneedle|skincare|facial|derma|beauty|skin)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Skincare';
  }
  if (/\b(clean|cleaning|chore|chores|tidy|vacuum|laundry|dishes)\b/.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Chores';
  }
  if (/\b(costco|walmart|target|trader joe|whole foods|safeway)\b/i.test(text)) {
    category = category ?? 'Personal';
    subcategory = subcategory ?? 'Errands';
  }

  if (category) {
    const categoryLower = category.toLowerCase();
    const canonical = categoriesFromStarter().find((item) => item.toLowerCase() === categoryLower);
    if (canonical) category = canonical;
  }
  if (category && subcategory) {
    const subs = subcategoriesFromStarter(category);
    const subLower = subcategory.toLowerCase();
    const canonicalSub = subs.find((item) => item.toLowerCase() === subLower);
    if (canonicalSub) subcategory = canonicalSub;
  }

  return { category, subcategory };
}

function resolveCategory(
  title: string,
  tags: string[],
  current: { category?: string | null; subcategory?: string | null } | undefined,
  opts: { categoryOverride?: string | null; subcategoryOverride?: string | null; rules?: TaxonomyRule[] },
) {
  const inferred = inferCategorySubcategory(title, tags, opts.rules);
  const fallbackCategory = opts.categoryOverride ?? current?.category ?? inferred.category ?? 'Personal';
  let fallbackSubcategory = opts.subcategoryOverride ?? current?.subcategory ?? inferred.subcategory ?? null;
  if (!fallbackSubcategory) {
    const categoryLower = fallbackCategory.toLowerCase();
    if (/\b(get ready|morning routine|prep|ready for work)\b/.test(title.toLowerCase())) {
      fallbackSubcategory = 'Morning Routine';
    } else if (categoryLower === 'food') {
      fallbackSubcategory = 'Meal';
    } else {
      fallbackSubcategory = 'General';
    }
  }
  return { category: fallbackCategory, subcategory: fallbackSubcategory };
}

function finalizeCategorizedTags(opts: {
  title: string;
  tags?: string[] | null;
  current?: { category?: string | null; subcategory?: string | null };
  location?: string | null;
  includeGlobals?: boolean;
  globalTags?: string[];
  categoryOverride?: string | null;
  subcategoryOverride?: string | null;
  rules?: TaxonomyRule[];
}) {
  const baseTags = [...(opts.tags ?? [])];
  const inferred = resolveCategory(opts.title, baseTags, opts.current, {
    categoryOverride: opts.categoryOverride,
    subcategoryOverride: opts.subcategoryOverride,
    rules: opts.rules,
  });
  const mergedTags = mergeWithGlobalTags(baseTags, {
    category: inferred.category,
    subcategory: inferred.subcategory,
    title: opts.title,
    location: opts.location ?? null,
    includeGlobals: opts.includeGlobals,
    globalTags: opts.globalTags ?? [],
  });
  return { mergedTags, inferred };
}

function formatSegmentLine(atMs: number | null, label: string) {
  const cleaned = label.trim();
  if (!cleaned) return '';
  if (atMs == null) return `- ${cleaned}`;
  const date = new Date(atMs);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `- **${hh}:${mm}** - ${cleaned}`;
}

function segmentLabelForEvent(ev: { title?: string; sourceText?: string }) {
  const title = (ev.title ?? '').trim();
  const lowerTitle = title.toLowerCase();
  const preferSource = !title || lowerTitle === 'event' || lowerTitle === 'work' || lowerTitle === 'clinic';
  const raw = (preferSource ? ev.sourceText ?? '' : title).trim();
  if (!raw) return 'Segment';
  return raw
    .replace(/^(?:i\s+)?(?:did|was|went|got|started|finished|worked on)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function appendSegment(notes: string | null | undefined, line: string) {
  if (!line) return notes ?? '';
  return notes && notes.trim().length ? `${notes}\n${line}` : line;
}

function isWorkLikeParsedEvent(ev: ParsedEvent) {
  const text = `${ev.title ?? ''} ${ev.sourceText ?? ''}`.toLowerCase();
  const tagSet = new Set((ev.tags ?? []).map(normalizeTagName));
  return tagSet.has('work') || tagSet.has('clinic') || /\b(work|clinic|patients|inpatient|rounds|didactics)\b/.test(text);
}

function isStandaloneUntimed(ev: ParsedEvent) {
  const text = `${ev.title ?? ''} ${ev.sourceText ?? ''}`.toLowerCase();
  const tagSet = new Set((ev.tags ?? []).map(normalizeTagName));
  if (tagSet.has('food') || /\b(dinner|lunch|breakfast|meal|restaurant)\b/.test(text)) return true;
  if (tagSet.has('shopping') || /\b(grocery|shopping|store|errand)\b/.test(text)) return true;
  if (tagSet.has('finance') || /\b(bank|finance|bill|budget)\b/.test(text)) return true;
  if (tagSet.has('transport') || /\b(transport|drive|driving|commute|flight|uber|lyft|train|bus)\b/.test(text)) return true;
  return false;
}

function groupParsedEvents(parsed: ParsedEvent[]) {
  const output: ParsedEvent[] = [];
  const workCandidates = parsed.filter(
    (event) => Boolean(event.explicitTime) && (event.kind ?? 'event') === 'event' && isWorkLikeParsedEvent(event),
  );
  const workBlock =
    workCandidates.length >= 2
      ? ({
          title: 'Work',
          startAt: Math.min(...workCandidates.map((event) => event.startAt)),
          endAt: Math.max(...workCandidates.map((event) => event.endAt)),
          kind: 'event',
          notes: '',
          estimateMinutes: Math.round(
            (Math.max(...workCandidates.map((event) => event.endAt)) -
              Math.min(...workCandidates.map((event) => event.startAt))) /
              (60 * 1000),
          ),
          explicitTime: true,
          sourceText: 'work block',
        } as ParsedEvent)
      : null;
  let workBlockInserted = false;
  let currentExplicit: ParsedEvent | null = null;

  for (const event of parsed) {
    const kind = (event.kind ?? 'event') as ParsedEvent['kind'];
    const inWorkWindow =
      Boolean(workBlock) &&
      (event.kind ?? 'event') === 'event' &&
      event.startAt >= workBlock!.startAt &&
      event.startAt < workBlock!.endAt;

    if (workBlock && inWorkWindow) {
      if (!workBlockInserted) {
        output.push(workBlock);
        workBlockInserted = true;
      }
      currentExplicit = workBlock;
      const line = formatSegmentLine(event.startAt ?? null, segmentLabelForEvent(event));
      workBlock.notes = appendSegment(workBlock.notes ?? '', line);
      continue;
    }

    if (kind === 'log' || kind === 'episode') {
      output.push(event);
      continue;
    }
    if (event.explicitTime) {
      output.push(event);
      currentExplicit = event;
      continue;
    }
    if (currentExplicit && !isStandaloneUntimed(event)) {
      const atMs = event.explicitTime ? event.startAt : currentExplicit.startAt;
      const line = formatSegmentLine(atMs ?? null, segmentLabelForEvent(event));
      currentExplicit.notes = appendSegment(currentExplicit.notes ?? '', line);
      continue;
    }
    output.push(event);
  }
  return output;
}

function maybeSegmentNotes(notes: string | null | undefined, startAt: number, endAt: number) {
  const raw = (notes ?? '').trim();
  if (!raw) return notes ?? '';
  if (/\*\*\d{2}:\d{2}\*\*|\-\s*\[\d{2}:\d{2}\]/.test(raw)) return raw;
  if (/^\s*[-*]\s+/m.test(raw)) return raw;
  const parts = raw
    .split(/[\n;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return raw;
  const span = endAt - startAt;
  if (!Number.isFinite(span) || span < 60 * 60 * 1000) return raw;
  const step = Math.max(5 * 60 * 1000, Math.floor(span / (parts.length + 1)));
  return parts
    .slice(0, 5)
    .map((part, index) => formatSegmentLine(startAt + step * (index + 1), part))
    .join('\n');
}

function applyDurationOverride(startAt: number, endAt: number, kind: ParsedEvent['kind'], opts: { durationOverride: number | null; explicitTimeInCapture: boolean }) {
  if (!opts.durationOverride || opts.explicitTimeInCapture || kind === 'episode' || kind === 'log') {
    return { startAt, endAt };
  }
  const nextEnd = startAt + Math.max(5, opts.durationOverride) * 60 * 1000;
  return { startAt, endAt: Math.max(endAt, nextEnd) };
}

function inferTrackerKeyFromText(title: string, tags?: string[] | null) {
  const tagSet = new Set((tags ?? []).map((tag) => normalizeTagName(tag)));
  const text = `${title} ${[...tagSet].join(' ')}`.toLowerCase();
  const candidates = ['mood', 'energy', 'stress', 'pain', 'sleep', 'workout', 'period', 'bored', 'water'];
  for (const key of candidates) {
    if (tagSet.has(key)) return key;
  }
  if (/\bmood\b/.test(text)) return 'mood';
  if (/\b(happy|sad|angry|anxious|depressed|excited|great|good|okay|ok)\b/.test(text)) return 'mood';
  if (/\benergy\b/.test(text)) return 'energy';
  if (/\b(tired|exhausted|drained|wired|energized)\b/.test(text)) return 'energy';
  if (/\bstress\b/.test(text)) return 'stress';
  if (/\b(stressed|overwhelmed|anxious)\b/.test(text)) return 'stress';
  if (/\bpain\b/.test(text)) return 'pain';
  if (/\bsleep\b/.test(text)) return 'sleep';
  if (/\bworkout\b/.test(text)) return 'workout';
  if (/\bwater\b|\bhydrat(?:e|ion|ing)?\b/.test(text)) return 'water';
  if (/\bperiod\b/.test(text)) return 'period';
  if (/\bbored\b/.test(text)) return 'bored';
  return null;
}

export default function CaptureScreen() {
  const router = useRouter();
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const appendEventId = Array.isArray(eventIdParam) ? eventIdParam[0] : eventIdParam;
  const [rawText, setRawText] = useState('');
  const [noteMode, setNoteMode] = useState<'raw' | 'transcript' | 'outline'>('raw');
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<CaptureAttachment[]>([]);
  const [transcriptionProvider, setTranscriptionProvider] = useState<'supabase' | 'whisper'>('supabase');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [importance, setImportance] = useState(5);
  const [difficulty, setDifficulty] = useState(5);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [manualContexts, setManualContexts] = useState<string[]>([]);
  const [contextDraft, setContextDraft] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [peopleDraft, setPeopleDraft] = useState('');
  const [manualLocations, setManualLocations] = useState<string[]>([]);
  const [locationDraft, setLocationDraft] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsDraft, setSkillsDraft] = useState('');
  const [character, setCharacter] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');
  const [reviewQueue, setReviewQueue] = useState<InboxCapture[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastMarkerAtRef = useRef<number | null>(null);
  const lastInputAtRef = useRef<number | null>(null);
  const pendingMarkerRef = useRef(false);
  const pendingDividerRef = useRef(false);
  const isRecordingStartingRef = useRef(false);
  const rawTextRef = useRef('');
  const { palette, sizes, isDark } = useTheme();
  const { active, startSession, stopSession } = useSession();
  const elapsedMs = active ? now - active.startedAt : 0;
  const remainingMs = useMemo(() => {
    if (!active) return null;
    if (active.endAt) return Math.max(0, active.endAt - now);
    if (active.estimatedMinutes != null) {
      return Math.max(0, active.estimatedMinutes * 60 * 1000 - elapsedMs);
    }
    return null;
  }, [active, now, elapsedMs]);

  const hasAttachments = useMemo(() => attachments.length > 0, [attachments]);
  const hasAudio = useMemo(() => attachments.some((item) => item.type === 'audio'), [attachments]);
  const canSave = useMemo(
    () => (rawText.trim().length > 0 || hasAttachments) && !saving,
    [rawText, hasAttachments, saving]
  );
  const derivedTags = useMemo(() => extractTags(rawText), [rawText]);
  const derivedContexts = useMemo(() => extractContexts(rawText), [rawText]);
  const tags = useMemo(() => uniqStrings([...derivedTags, ...manualTags]), [derivedTags, manualTags]);
  const contexts = useMemo(
    () => uniqStrings([...derivedContexts, ...manualContexts]),
    [derivedContexts, manualContexts]
  );
  const locationLabel = useMemo(() => {
    const loc = attachments.find((item) => item.type === 'location');
    return loc?.label ?? null;
  }, [attachments]);
  const locations = useMemo(
    () => uniqStrings([...(locationLabel ? [locationLabel] : []), ...manualLocations]),
    [locationLabel, manualLocations]
  );
  const locationValue = locations.join(', ');
  const estimateMinutesValue = useMemo(() => {
    const parsed = Number.parseInt(estimateMinutes, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [estimateMinutes]);
  const goalMultiplier = useMemo(
    () => resolveGoalMultiplier({ goal, fallbackImportance: importance }),
    [goal, importance]
  );
  const pointsPreview = useMemo(
    () =>
      computeXp({
        importance,
        difficulty,
        durationMinutes: estimateMinutesValue ?? 0,
        goal,
        fallbackGoalImportance: importance,
      }),
    [importance, difficulty, estimateMinutesValue, goal]
  );
  const pointsFormula = useMemo(() => {
    const minutesLabel = estimateMinutesValue != null ? `${estimateMinutesValue}m` : '--';
    return `${importance} × ${difficulty} × ${minutesLabel} ÷ 60 × ${goalMultiplier.toFixed(2)}`;
  }, [importance, difficulty, estimateMinutesValue, goalMultiplier]);
  const waveformBars = useMemo(
    () => [6, 10, 14, 20, 12, 8, 16, 22, 14, 10, 18, 24, 12, 8, 16, 20, 10, 6, 12],
    []
  );
  const subcategoryOptions = useMemo(() => {
    const match = CATEGORY_SHORTCUTS.find((entry) => entry.toLowerCase() === category.trim().toLowerCase());
    return match ? SUBCATEGORY_SHORTCUTS[match] ?? [] : [];
  }, [category]);
  const transcriptPreview = useMemo(() => (rawText.trim() ? normalizeCaptureText(rawText) : ''), [rawText]);
  const outlinePreview = useMemo(() => {
    if (!rawText.trim()) return '';
    const parsed = parseCapture(normalizeCaptureText(rawText));
    if (!parsed.segments.length) return normalizeCaptureText(rawText);
    return formatSegmentsPreview(parsed.segments);
  }, [rawText]);

  const eventPreview = useMemo(() => {
    if (!rawText.trim()) return null;
    const normalized = normalizeCaptureText(rawText);
    const segmentCount = countSegments(normalized);
    if (segmentCount > 1) return null;

    const command = detectDrivingCommand(rawText);
    if (command?.action === 'start') {
      return {
        title: command.title,
        category: command.category ?? null,
        subcategory: command.subcategory ?? null,
        contexts: command.contexts ?? [],
      };
    }

    const intent = detectIntent(normalized);
    if (intent.type !== 'start_event') return null;
    const { category: autoCategory, subcategory: autoSubcategory } = autoCategorize(normalized);
    const firstLine =
      normalized
        .split('\n')
        .find((line) => line.trim() && !line.trim().startsWith('---')) ?? 'Capture';
    const safeTitle = firstLine.replace(/^\[\d{2}:\d{2}(?::\d{2})?\]\s*/, '').slice(0, 60);
    return {
      title: safeTitle || 'Capture',
      category: autoCategory,
      subcategory: autoSubcategory,
      contexts,
    };
  }, [rawText, contexts]);

  const refreshInbox = useCallback(async () => {
    const captures = await listInboxCaptures();
    setReviewQueue(captures.filter((capture) => capture.status === 'raw').slice(0, 3));
  }, []);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    rawTextRef.current = rawText;
  }, [rawText]);

  useEffect(() => {
    if (recordingState !== 'recording') {
      pendingMarkerRef.current = false;
      pendingDividerRef.current = false;
      return;
    }
    setNoteMode('raw');
    const now = Date.now();
    lastInputAtRef.current = now;
    lastMarkerAtRef.current = now;
    setRawText((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) {
        const next = formatTimeMarker();
        rawTextRef.current = next;
        return next;
      }
      const lastLine = trimmed.split('\n').pop() ?? '';
      if (TIMESTAMP_LINE_RE.test(lastLine.trim())) {
        rawTextRef.current = prev;
        return prev;
      }
      const next = `${trimmed}\n${formatTimeMarker()}`;
      rawTextRef.current = next;
      return next;
    });
  }, [recordingState]);

  useEffect(() => {
    if (recordingState !== 'recording') return;
    const id = setInterval(() => {
      const lastInputAt = lastInputAtRef.current;
      if (!lastInputAt) return;
      const now = Date.now();
      const idleMs = now - lastInputAt;
      const lastMarkerAt = lastMarkerAtRef.current ?? 0;
      if (idleMs >= PAUSE_FOR_MARKER_MS && now - lastMarkerAt >= MIN_MARKER_GAP_MS) {
        if (!pendingMarkerRef.current) {
          pendingMarkerRef.current = true;
        }
        if (idleMs >= PAUSE_FOR_DIVIDER_MS) {
          pendingDividerRef.current = true;
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [recordingState]);
  const queueAttachmentUpdate = (id: string, patch: Partial<CaptureAttachment>) => {
    setTimeout(() => {
      setAttachments((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'ready', ...patch } : item))
      );
    }, 600);
  };

  const addImageAttachment = (asset: ImagePicker.ImagePickerAsset, source: 'camera' | 'library') => {
    const id = `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: CaptureAttachment = {
      id,
      type: 'image',
      createdAt: Date.now(),
      status: 'pending',
      uri: asset.uri,
      label: source === 'camera' ? 'Camera photo' : asset.fileName || 'Image',
      metadata: {
        width: asset.width ?? 0,
        height: asset.height ?? 0,
      },
    };
    setAttachments((prev) => [next, ...prev]);
    queueAttachmentUpdate(id, { analysis: 'Vision summary queued (analysis pending).' });
  };

  const addAudioAttachment = (uri: string, provider: 'supabase' | 'whisper') => {
    const id = `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: CaptureAttachment = {
      id,
      type: 'audio',
      createdAt: Date.now(),
      status: 'pending',
      uri,
      label: 'Voice memo',
      metadata: { provider },
    };
    setAttachments((prev) => [next, ...prev]);
    queueAttachmentUpdate(id, {
      transcription: provider === 'whisper' ? 'Whisper transcription queued.' : 'Supabase transcription queued.',
    });
  };

  const addLocationAttachment = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission needed', 'Enable location to attach a place.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = position.coords;
    let label = `Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (place) {
        const parts = [place.name, place.street, place.city, place.region].filter(Boolean);
        if (parts.length) label = parts.join(', ');
      }
    } catch {
      // ignore reverse geocode errors
    }

    const id = `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: CaptureAttachment = {
      id,
      type: 'location',
      createdAt: Date.now(),
      status: 'pending',
      label,
      metadata: {
        latitude,
        longitude,
        accuracy: position.coords.accuracy ?? 0,
      },
    };
    setAttachments((prev) => [next, ...prev]);
    queueAttachmentUpdate(id, { analysis: `Location tagged - ${label}` });
  };

  const persistAttachments = async (captureId: string, next: CaptureAttachment[]) => {
    try {
      await updateInboxCapture(captureId, { attachments: next });
    } catch (err) {
      console.warn('Failed to sync attachments', err);
    }
  };

  const transcribeAudioAttachments = async (
    captureId: string,
    sourceAttachments: CaptureAttachment[],
    seedTokens?: { tags: string[]; contexts: string[]; people: string[] }
  ) => {
    const audioAttachments = sourceAttachments.filter((item) => item.type === 'audio' && item.uri);
    if (!audioAttachments.length) return;

    let nextAttachments = [...sourceAttachments];
    let failed = false;
    let failureMessage: string | null = null;

    for (const attachment of audioAttachments) {
      if (!attachment.uri) continue;
      try {
        const upload = await uploadCaptureAudio({
          captureId,
          attachmentId: attachment.id,
          uri: attachment.uri,
        });

        nextAttachments = nextAttachments.map((item) =>
          item.id === attachment.id
            ? {
                ...item,
                status: 'pending',
                metadata: {
                  ...item.metadata,
                  storageBucket: upload.bucket,
                  storagePath: upload.path,
                  contentType: upload.contentType,
                  byteSize: upload.size,
                },
              }
            : item
        );
        await persistAttachments(captureId, nextAttachments);

        const result = await invokeCaptureParse({
          captureId,
          audioBucket: upload.bucket,
          audioPath: upload.path,
          context: { activeEntryId: active?.id ?? null },
          mode: 'transcribe_only',
        });

        if (typeof result?.transcript === 'string' && result.transcript.trim()) {
          const transcriptText = result.transcript.trim();
          await updateInboxCaptureText(captureId, transcriptText);
          await upsertTranscriptSegment(captureId, transcriptText);
          const parsed = parseCapture(transcriptText);
          const processed = parsed.segments.length ? formatSegmentsPreview(parsed.segments) : transcriptText;
          const mergedTags = uniqStrings([...(seedTokens?.tags ?? []), ...parsed.tokens.tags]);
          const mergedContexts = uniqStrings([...(seedTokens?.contexts ?? []), ...parsed.tokens.contexts]);
          const mergedPeople = uniqStrings([...(seedTokens?.people ?? []), ...parsed.tokens.people]);
          await updateInboxCapture(captureId, {
            processedText: processed,
            tags: mergedTags,
            contexts: mergedContexts,
            people: mergedPeople,
          });
          nextAttachments = nextAttachments.map((item) =>
            item.id === attachment.id
              ? {
                  ...item,
                  status: 'ready',
                  transcription: transcriptText,
                }
              : item
          );
          await persistAttachments(captureId, nextAttachments);
        } else {
          nextAttachments = nextAttachments.map((item) =>
            item.id === attachment.id ? { ...item, status: 'ready' } : item
          );
          await persistAttachments(captureId, nextAttachments);
        }
      } catch (err) {
        failed = true;
        const message = err instanceof Error ? err.message : '';
        console.error('[Capture] Transcription error:', message);
        if (/Supabase session not available/i.test(message)) {
          failureMessage = 'Sign in to Supabase or enable anonymous auth in your project.';
        } else if (/Edge Function error \\(404\\)/i.test(message) || /not found/i.test(message)) {
          failureMessage = 'Edge Function not deployed. Deploy "transcribe_and_parse_capture" in Supabase.';
        } else if (/Edge Function error \\(401\\)|unauthorized|session expired/i.test(message)) {
          failureMessage = 'Supabase auth failed. Please sign in again.';
        } else if (/Edge Function error \\(500\\)/i.test(message)) {
          // Extract detail from error message if available
          const detailMatch = message.match(/detail[:\s]+(.+?)(?:\s*$|,)/i);
          const detail = detailMatch?.[1] ?? 'Internal server error';
          failureMessage = `Server error: ${detail}. Check Edge Function logs.`;
        } else if (message) {
          failureMessage = message;
        }
        nextAttachments = nextAttachments.map((item) =>
          item.id === attachment.id
            ? { ...item, status: 'failed', transcription: 'Transcription failed.' }
            : item
        );
        await persistAttachments(captureId, nextAttachments);
      }
    }

    if (failed) {
      Alert.alert('Transcription failed', failureMessage ?? 'One or more audio clips could not be transcribed.');
    }
  };

  const addTimestampLine = () => {
    const line = formatTimeMarker();
    const now = Date.now();
    lastMarkerAtRef.current = now;
    lastInputAtRef.current = now;
    setRawText((prev) => {
      const next = prev ? `${prev}\n${line}` : line;
      rawTextRef.current = next;
      return next;
    });
  };

  const addSegmentDivider = () => {
    lastInputAtRef.current = Date.now();
    setRawText((prev) => {
      const trimmed = prev.trim();
      const next = !trimmed ? '---\n' : `${trimmed}\n\n---\n`;
      rawTextRef.current = next;
      return next;
    });
  };

  const addTagsFromDraft = () => {
    const next = parseTagList(tagDraft);
    if (!next.length) return;
    setManualTags((prev) => uniqStrings([...prev, ...next]));
    setTagDraft('');
  };

  const addContextsFromDraft = () => {
    const next = parseCommaList(contextDraft);
    if (!next.length) return;
    setManualContexts((prev) => uniqStrings([...prev, ...next]));
    setContextDraft('');
  };

  const addPeopleFromDraft = () => {
    const next = parseCommaList(peopleDraft);
    if (!next.length) return;
    setPeople((prev) => uniqStrings([...prev, ...next]));
    setPeopleDraft('');
  };

  const addLocationsFromDraft = () => {
    const next = parseCommaList(locationDraft);
    if (!next.length) return;
    setManualLocations((prev) => uniqStrings([...prev, ...next]));
    setLocationDraft('');
  };

  const addSkillsFromDraft = () => {
    const next = parseCommaList(skillsDraft);
    if (!next.length) return;
    setSkills((prev) => uniqStrings([...prev, ...next]));
    setSkillsDraft('');
  };

  const toggleCharacter = (key: string) => {
    setCharacter((prev) => (prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key]));
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed', 'Enable camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    addImageAttachment(result.assets[0], 'camera');
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo permission needed', 'Enable photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    addImageAttachment(result.assets[0], 'library');
  };

  const toggleRecording = async () => {
    if (recordingState === 'processing' || isRecordingStartingRef.current) return;
    if (!Audio?.requestPermissionsAsync || !Audio?.Recording) {
      Alert.alert('Recording unavailable', 'Audio recording is not available in this build.');
      return;
    }
    if (recording) {
      setRecordingState('processing');
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          addAudioAttachment(uri, transcriptionProvider);
        }
      } catch {
        Alert.alert('Recording failed', 'Unable to stop the recording.');
      } finally {
        setRecording(null);
        setRecordingState('idle');
      }
      return;
    }

    isRecordingStartingRef.current = true;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Enable mic access to record audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(RECORDING_OPTIONS);
      await next.startAsync();
      setRecording(next);
      setRecordingState('recording');
    } catch {
      Alert.alert('Recording failed', 'Unable to start audio recording.');
      setRecordingState('idle');
    } finally {
      isRecordingStartingRef.current = false;
    }
  };

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmed = rawText.trim();
      const normalized = trimmed.length > 0 ? normalizeCaptureText(trimmed) : '';
      const fallbackRawText = trimmed || (hasAudio ? '[Audio capture pending transcription]' : '');
      const processedText = normalized || (hasAudio ? 'Audio transcription pending.' : '');
      const command = appendEventId ? null : detectDrivingCommand(rawText);
      if (command?.action === 'start') {
        if (active?.locked) {
          Alert.alert('Tracker locked', 'Unlock the current session before starting a new event.');
          return;
        }
        const start = async () => {
          const session = await startSession({
            id: `transport_${Date.now()}`,
            title: command.title,
            kind: 'event',
            startedAt: Date.now(),
            trackerKey: command.trackerKey,
            estimatedMinutes: null,
            category: command.category ?? null,
            subcategory: command.subcategory ?? null,
            contexts: command.contexts ?? [],
          });
          router.push(`/event/${session.id}`);
        };

        if (active) {
          Alert.alert(
            'Switch activity?',
            `You are currently in "${active.title}". Start "${command.title}" instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Start', style: 'default', onPress: () => void start() },
            ]
          );
        } else {
          void start();
        }
      }

      if (command?.action === 'stop' && active?.trackerKey === 'transport') {
        void stopSession();
      }

      const saved = await addInboxCapture(fallbackRawText, attachments, {
        importance,
        difficulty,
        tags,
        contexts,
        location: locationValue || undefined,
        people,
        skills,
        character,
        goal: goal.trim() || null,
        project: project.trim() || null,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
        estimateMinutes: estimateMinutesValue ?? null,
        points: Number(pointsPreview.toFixed(3)),
        processedText,
      });

      const parsedWorkout = parseWorkoutFromText(rawText);
      if (parsedWorkout) {
        const derivedDuration = Math.round(
          parsedWorkout.exercises.flatMap((ex) => ex.sets).reduce((sum, set) => sum + (set.duration ?? 0), 0) / 60,
        );
        const durationMinutes = parsedWorkout.totalDuration ?? (derivedDuration ? derivedDuration : undefined);
        const startAt = saved.createdAt ?? Date.now();
        const endAt = durationMinutes ? startAt + durationMinutes * 60 * 1000 : startAt;
        const typeLabel = parsedWorkout.type ?? 'mixed';
        const defaultTitle =
          typeLabel === 'cardio'
            ? 'Cardio'
            : typeLabel === 'strength'
              ? 'Strength'
              : typeLabel === 'mobility'
                ? 'Mobility'
                : typeLabel === 'recovery'
                  ? 'Recovery'
                  : 'Workout';
        const title =
          parsedWorkout.exercises.length === 1
            ? parsedWorkout.exercises[0].name
            : `${defaultTitle} Workout`;
        const estimatedCalories = estimateWorkoutCalories({
          type: parsedWorkout.type ?? 'mixed',
          exercises: parsedWorkout.exercises,
          overallRpe: parsedWorkout.overallRpe,
        });

        await saveWorkout({
          id: `wrk_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          title,
          type: parsedWorkout.type ?? 'mixed',
          exercises: parsedWorkout.exercises,
          startAt,
          endAt,
          totalDuration: durationMinutes,
          estimatedCalories: estimatedCalories || undefined,
          overallRpe: parsedWorkout.overallRpe,
          sourceCaptureId: saved.id,
        });
      }

      const parsedMeal = parseMealFromText(rawText, { nowMs: saved.createdAt ?? Date.now() });
      if (parsedMeal) {
        const now = saved.createdAt ?? Date.now();
        const mealTitle =
          parsedMeal.items.length === 1
            ? parsedMeal.items[0].name
            : parsedMeal.type === 'breakfast'
              ? 'Breakfast'
              : parsedMeal.type === 'lunch'
                ? 'Lunch'
                : parsedMeal.type === 'dinner'
                  ? 'Dinner'
                  : parsedMeal.type === 'drink'
                    ? 'Drink'
                    : 'Snack';

        await saveMeal({
          id: `meal_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          title: mealTitle,
          type: parsedMeal.type,
          items: parsedMeal.items,
          totalCalories: Math.round(parsedMeal.totalCalories ?? 0),
          macros: {
            protein: Math.round(parsedMeal.macros.protein ?? 0),
            carbs: Math.round(parsedMeal.macros.carbs ?? 0),
            fat: Math.round(parsedMeal.macros.fat ?? 0),
            fiber: parsedMeal.macros.fiber ? Math.round(parsedMeal.macros.fiber) : undefined,
            saturatedFat: parsedMeal.macros.saturatedFat ? Math.round(parsedMeal.macros.saturatedFat) : undefined,
            transFat: parsedMeal.macros.transFat ? Math.round(parsedMeal.macros.transFat) : undefined,
            sugar: parsedMeal.macros.sugar ? Math.round(parsedMeal.macros.sugar) : undefined,
            sodium: parsedMeal.macros.sodium ? Math.round(parsedMeal.macros.sodium) : undefined,
            potassium: parsedMeal.macros.potassium ? Math.round(parsedMeal.macros.potassium) : undefined,
            cholesterol: parsedMeal.macros.cholesterol ? Math.round(parsedMeal.macros.cholesterol) : undefined,
          },
          eatenAt: now,
          createdAt: now,
          updatedAt: now,
          sourceCaptureId: saved.id,
        });
      }

      const shouldTranscribe = transcriptionProvider === 'supabase' || transcriptionProvider === 'whisper';
      if (shouldTranscribe) {
        if (hasAudio) {
          await transcribeAudioAttachments(saved.id, attachments, {
            tags,
            contexts,
            people,
          });
        }
      }
      await refreshInbox();
      if (appendEventId && normalized) {
        const existing = await getEvent(appendEventId);
        const mergedNotes = [existing?.notes, normalized].filter(Boolean).join('\n\n');
        const updated = await updateEvent(appendEventId, { notes: mergedNotes });
        if (updated) {
          router.replace(`/event/${encodeURIComponent(appendEventId)}`);
        } else {
          Alert.alert('Append failed', 'Saved to your inbox, but could not append to this event.');
        }
      }
      setRawText('');
      setNoteMode('raw');
      setAttachments([]);
      setImportance(5);
      setDifficulty(5);
      setManualTags([]);
      setTagDraft('');
      setManualContexts([]);
      setContextDraft('');
      setPeople([]);
      setPeopleDraft('');
      setManualLocations([]);
      setLocationDraft('');
      setSkills([]);
      setSkillsDraft('');
      setCharacter([]);
      setGoal('');
      setProject('');
      setCategory('');
      setSubcategory('');
      setEstimateMinutes('');
    } finally {
      setSaving(false);
    }
  }

  const processCapture = async (capture: InboxCapture) => {
    if (reviewingId) return;
    setReviewingId(capture.id);
    try {
      const nowMs = capture.createdAt ?? Date.now();
      const { frontmatter, body } = extractFrontmatter(capture.rawText);
      const captureText = body.trim() ? body.trim() : capture.rawText.trim();
      const normalized = normalizeCaptureText(captureText);
      const parsed = parseCapture(normalized);
      const natural = parseCaptureNatural(normalized, nowMs);

      const fm = (frontmatter ?? {}) as Record<string, unknown>;
      const fmTags = toStringList(fm.tags).map((tag) => normalizeTagName(tag)).filter(Boolean);
      const fmPeople = toStringList(fm.people)
        .map((person) => person.replace(/^@/, '').trim())
        .filter(Boolean);
      const fmContexts = toStringList(fm.contexts)
        .map((context) => context.replace(/^\+/, '').trim())
        .filter(Boolean);
      const fmCategory = typeof fm.category === 'string' ? fm.category.trim() : '';
      const fmSubcategory = typeof fm.subcategory === 'string' ? fm.subcategory.trim() : '';
      const fmGoal = typeof fm.goal === 'string' ? fm.goal.trim() : '';
      const fmProject = typeof fm.project === 'string' ? fm.project.trim() : '';
      const fmLocation = typeof fm.location === 'string' ? fm.location.trim() : '';
      const fmImportance = typeof fm.importance === 'number' ? fm.importance : null;
      const fmDifficulty = typeof fm.difficulty === 'number' ? fm.difficulty : null;
      const fmDuration =
        typeof fm.durationMinutes === 'number' ? fm.durationMinutes : typeof fm.duration === 'number' ? fm.duration : null;
      const fmRules = Array.isArray(fm.rules) ? fm.rules : [];
      const taxonomyRules = fmRules
        .map((rule: any) => ({
          match: typeof rule?.match === 'string' ? rule.match : '',
          category: typeof rule?.category === 'string' ? rule.category : undefined,
          subcategory: typeof rule?.subcategory === 'string' ? rule.subcategory : undefined,
          tags: Array.isArray(rule?.tags) ? rule.tags.map((tag: any) => String(tag)).filter(Boolean) : undefined,
        }))
        .filter((rule: TaxonomyRule) => rule.match);
      const activeRules = taxonomyRules;

      const durationOverride = fmDuration ?? extractDurationToken(normalized);
      const importanceOverride = fmImportance ?? extractImportanceToken(normalized);
      const difficultyOverride = fmDifficulty ?? extractDifficultyToken(normalized);
      const categoryOverride = fmCategory ? toTitleCase(fmCategory) : null;
      const subcategoryOverride = fmSubcategory ? toTitleCase(fmSubcategory) : null;
      const goalOverride = fmGoal ? fmGoal : null;
      const projectOverride = fmProject ? fmProject : null;
      const locationOverride = fmLocation ? fmLocation : null;
      const explicitTimeInCapture = hasExplicitTimeRange(normalized);

      const ruleTagsForText = (text: string, rules: TaxonomyRule[]) => {
        const tags: string[] = [];
        for (const rule of rules) {
          const rx = rule.match?.trim();
          if (!rx) continue;
          try {
            const re = new RegExp(rx, 'i');
            if (!re.test(text)) continue;
          } catch {
            continue;
          }
          for (const tag of rule.tags ?? []) {
            const cleaned = normalizeTagName(String(tag));
            if (cleaned) tags.push(cleaned);
          }
        }
        return tags;
      };

      const ruleTagNames = ruleTagsForText(normalized, activeRules);
      const tagNames = new Set<string>(
        [
          ...extractTagTokens(normalized),
          ...fmTags,
          ...ruleTagNames,
          ...parsed.tokens.tags.map((tag) => normalizeTagName(tag)),
        ].filter(Boolean),
      );
      for (const task of natural.tasks) {
        for (const tag of task.tags ?? []) {
          const name = normalizeTagName(tag);
          if (name) tagNames.add(name);
        }
      }
      for (const event of natural.events) {
        for (const tag of event.tags ?? []) {
          const name = normalizeTagName(tag);
          if (name) tagNames.add(name);
        }
      }

      const lowerText = normalized.toLowerCase();
      const periodStartSignal =
        /\b(started|starting|got)\b.*\bperiod\b/.test(lowerText) ||
        /\bon (my )?period\b/.test(lowerText) ||
        /\bmy period\b.*\b(started|began)\b/.test(lowerText);
      const periodEndSignal =
        /\bperiod\b.*\b(ended|over|finished)\b/.test(lowerText) || /\b(period ended|period is over|period is done)\b/.test(lowerText);

      const painRatingMatch = lowerText.match(/(\d{1,2})\s*\/\s*10/);
      const painSignal = /\b(pain|hurts|ache|aches|sore)\b/.test(lowerText) || Boolean(painRatingMatch);
      const painHealedSignal = /\b(healed|pain[-\s]?free|no longer hurts|doesn't hurt anymore|back to normal)\b/.test(lowerText);
      const bodyPartMatch = lowerText.match(/\bmy\s+([a-z][a-z-]{1,20})\s+(hurts|aches|is\s+(sore|aching))\b/);

      const workoutStartSignal = /\b(going to|gonna|start(?:ing)?|begin(?:ning)?|about to)\b.*\b(work\s*out|workout)\b/.test(lowerText);
      const workoutEndSignal = /\b(done|finished|ended|stop(?:ping)?)\b.*\b(work\s*out|workout)\b/.test(lowerText);
      const boredSignal = /\b(bored|boredom|boring)\b/.test(lowerText);
      const moodWordMatch = lowerText.match(/\b(?:i'm|i am|feeling|feel)\s+(?:really\s+)?(happy|great|good|okay|ok|sad|down|depressed|angry|anxious|stressed|meh)\b/);
      const moodWord = moodWordMatch?.[1] ?? null;
      const moodScaleMap: Record<string, number> = {
        happy: 8,
        great: 8,
        good: 7,
        okay: 5,
        ok: 5,
        sad: 3,
        down: 3,
        depressed: 2,
        angry: 3,
        anxious: 4,
        stressed: 4,
        meh: 4,
      };
      const moodValue = moodWord ? moodScaleMap[moodWord] ?? null : null;

      const ratingNear = (keyword: string) => {
        const re = new RegExp(`${keyword}[^\\d]{0,6}(\\d{1,2})\\s*(?:/\\s*10)?`);
        const match = lowerText.match(re);
        if (!match?.[1]) return null;
        const value = Number(match[1]);
        return Number.isFinite(value) ? Math.max(0, Math.min(10, value)) : null;
      };
      const energyValue =
        ratingNear('energy') ??
        (/\b(energized|wired)\b/.test(lowerText) ? 8 : /\b(tired|exhausted|drained)\b/.test(lowerText) ? 3 : null);
      const stressValue =
        ratingNear('stress') ?? (/\b(stressed|overwhelmed|anxious)\b/.test(lowerText) ? 7 : /\b(calm|relaxed)\b/.test(lowerText) ? 2 : null);

      if (periodStartSignal || periodEndSignal) tagNames.add('period');
      if (painSignal || painHealedSignal) tagNames.add('pain');
      if (bodyPartMatch?.[1]) tagNames.add(bodyPartMatch[1]);
      if (workoutStartSignal || workoutEndSignal) tagNames.add('workout');
      if (/\b(work|shift)\b/.test(lowerText)) tagNames.add('work');
      if (/\b(clinic|patients|inpatient|rounds)\b/.test(lowerText)) tagNames.add('clinic');
      if (/\b(call|phone)\b/.test(lowerText)) tagNames.add('call');
      if (/\b(bank|loan|mortgage|finance)\b/.test(lowerText)) tagNames.add('finance');
      if (/\b(gym)\b/.test(lowerText)) tagNames.add('gym');
      if (/\b(run|running|ran)\b/.test(lowerText)) tagNames.add('run');
      if (/\b(ate|eat|eating|meal|breakfast|lunch|dinner|snack|protein)\b/.test(lowerText)) tagNames.add('food');
      if (/\b(drink|drank|water|hydration|hydrate)\b/.test(lowerText)) tagNames.add('hydration');
      if (/\b(sleep|nap)\b/.test(lowerText)) tagNames.add('sleep');
      if (boredSignal) tagNames.add('bored');
      if (moodValue != null) tagNames.add('mood');
      if (energyValue != null) tagNames.add('energy');
      if (stressValue != null) tagNames.add('stress');

      const implicitPeople = extractImplicitPeople(normalized);
      const implicitPlaces = extractImplicitPlaces(normalized);
      const implicitMoneyUsd = extractMoneyUsd(normalized);
      const implicitShoppingItems = extractShoppingItems(normalized);
      if (implicitMoneyUsd != null && Number.isFinite(implicitMoneyUsd)) tagNames.add('money');
      if (implicitShoppingItems.length) tagNames.add('shopping');

      const allTagTokens = [...tagNames].map((tag) => `#${tag}`);
      const mergedTags = uniqStrings([...(capture.tags ?? []), ...[...tagNames]]);

      const contextTokens = extractContextTokens(normalized);
      const allContexts = uniqStrings([...contextTokens, ...fmContexts, ...parsed.tokens.contexts]);
      const mergedContexts = uniqStrings([...(capture.contexts ?? []), ...allContexts]);

      const mentions = extractAtMentions(normalized);
      const personCandidates: string[] = [];
      const placeMentions: string[] = [];
      if (locationOverride) placeMentions.push(locationOverride);
      for (const person of fmPeople) personCandidates.push(person);
      for (const person of parsed.tokens.people) personCandidates.push(person);
      for (const place of parsed.tokens.places) placeMentions.push(place);
      for (const mention of mentions) {
        const lower = mention.raw.toLowerCase();
        const looksPerson = /\b(with|call|text|dm|email)\b/.test(mention.before) || ['mom', 'dad', 'doctor', 'dr', 'alex'].includes(lower);
        if (looksPerson) personCandidates.push(mention.raw);
        else placeMentions.push(mention.raw);
      }
      for (const person of implicitPeople) personCandidates.push(person);
      for (const place of implicitPlaces) placeMentions.push(place);
      const personMentions = cleanPeopleList(personCandidates);
      const placeMentionsUnique = uniqStringsLoose(placeMentions);
      const mergedPeople = uniqStrings([...(capture.people ?? []), ...personMentions]);

      const pickLocationForText = (text: string) => {
        const hay = text.toLowerCase();
        for (const place of placeMentionsUnique) {
          if (!place) continue;
          if (hay.includes(place.toLowerCase())) return place;
        }
        return null;
      };

      let primaryEventId: string | null = null;
      const groupedEvents = groupParsedEvents(natural.events);
      for (const event of groupedEvents) {
        const kind = (event.kind ?? 'event') as ParsedEvent['kind'];
        if (kind === 'log') continue;
        const baseText = `${event.title ?? ''}\n${event.notes ?? ''}\n${(event.tags ?? []).join(' ')}`.trim();
        const autoImportance = event.importance ?? importanceOverride ?? inferImportanceFromText(baseText) ?? capture.importance ?? 5;
        const autoDifficulty = event.difficulty ?? difficultyOverride ?? inferDifficultyFromText(baseText) ?? capture.difficulty ?? 5;
        const autoCharacter = uniqStrings([...inferCharacterFromText(baseText, event.tags ?? []), ...(capture.character ?? [])]);
        const locationHint = event.location ?? pickLocationForText(baseText) ?? capture.location ?? null;
        const { mergedTags: mergedEventTags, inferred } = finalizeCategorizedTags({
          title: event.title,
          tags: event.tags ?? [],
          location: locationHint,
          includeGlobals: true,
          globalTags: allTagTokens,
          categoryOverride,
          subcategoryOverride,
          rules: activeRules,
        });
        const times = applyDurationOverride(event.startAt ?? nowMs, event.endAt ?? nowMs + 5 * 60 * 1000, kind, {
          durationOverride,
          explicitTimeInCapture,
        });
        const nextNotes = maybeSegmentNotes(event.notes ?? '', times.startAt, times.endAt) || event.notes || normalized;
        const created = await startEvent({
          title: event.title || 'Event',
          kind,
          startAt: times.startAt,
          endAt: Math.max(times.endAt, times.startAt + 5 * 60 * 1000),
          notes: nextNotes,
          tags: mergedEventTags.map(normalizeTagName),
          contexts: mergedContexts,
          people: cleanPeopleList(event.people ?? uniqStrings([...personMentions, ...mergedPeople])),
          skills: uniqStrings([...(event.skills ?? []), ...(capture.skills ?? [])]),
          character: autoCharacter,
          location: locationHint,
          category: inferred.category,
          subcategory: inferred.subcategory,
          estimateMinutes: event.estimateMinutes ?? durationOverride ?? Math.round((times.endAt - times.startAt) / (60 * 1000)),
          importance: autoImportance,
          difficulty: autoDifficulty,
          goal: event.goal ?? goalOverride ?? capture.goal ?? null,
          project: event.project ?? projectOverride ?? capture.project ?? null,
        });
        if (!primaryEventId) primaryEventId = created.id;
      }

      if (!primaryEventId && parsed.activeEvent) {
        const startAt = capture.createdAt ?? nowMs;
        const { mergedTags: mergedEventTags, inferred } = finalizeCategorizedTags({
          title: parsed.activeEvent.title || 'Capture Event',
          tags: allTagTokens,
          includeGlobals: true,
          globalTags: allTagTokens,
          categoryOverride: parsed.activeEvent.category ?? categoryOverride,
          subcategoryOverride: parsed.activeEvent.subcategory ?? subcategoryOverride,
          rules: activeRules,
        });
        const event = await startEvent({
          title: parsed.activeEvent.title || 'Capture Event',
          kind: 'event',
          startAt,
          notes: normalized,
          tags: mergedEventTags.map(normalizeTagName),
          contexts: mergedContexts,
          people: mergedPeople,
          location: capture.location ?? null,
          category: inferred.category,
          subcategory: inferred.subcategory,
          estimateMinutes: capture.estimateMinutes ?? null,
          importance: capture.importance ?? null,
          difficulty: capture.difficulty ?? null,
          goal: capture.goal ?? null,
          project: capture.project ?? null,
        });
        primaryEventId = event.id;
        const endAt = capture.estimateMinutes ? startAt + capture.estimateMinutes * 60 * 1000 : startAt;
        await stopEvent(event.id, endAt);
      }

      const normalizedTaskKey = (title: string) => title.trim().toLowerCase();
      const taskCandidates: Array<{
        title: string;
        status?: 'todo' | 'in_progress' | 'done';
        estimateMinutes?: number | null;
        scheduledAt?: number | null;
        dueAt?: number | null;
        notes?: string;
        tags?: string[];
        goal?: string | null;
        project?: string | null;
        importance?: number | null;
        difficulty?: number | null;
      }> = [];
      const seenTasks = new Set<string>();

      const pushTask = (task: typeof taskCandidates[number]) => {
        const key = normalizedTaskKey(task.title);
        if (!key || seenTasks.has(key)) return;
        seenTasks.add(key);
        taskCandidates.push(task);
      };

      for (const task of natural.tasks) {
        pushTask({
          title: task.title,
          status: task.status,
          estimateMinutes: task.estimateMinutes ?? null,
          scheduledAt: task.scheduledAt ?? null,
          dueAt: task.dueAt ?? null,
          notes: task.notes ?? undefined,
          tags: task.tags,
          goal: task.goal ?? null,
          project: task.project ?? null,
          importance: task.importance ?? null,
          difficulty: task.difficulty ?? null,
        });
      }

      for (const task of parsed.tasks) {
        pushTask({
          title: task.title,
          status: task.completed ? 'done' : 'todo',
          estimateMinutes: capture.estimateMinutes ?? null,
        });
      }

      for (const task of taskCandidates) {
        const taskBase = `${task.title ?? ''}\n${task.notes ?? ''}\n${(task.tags ?? []).join(' ')}`.trim();
        const autoImportance = task.importance ?? importanceOverride ?? inferImportanceFromText(taskBase) ?? capture.importance ?? 5;
        const autoDifficulty = task.difficulty ?? difficultyOverride ?? inferDifficultyFromText(taskBase) ?? capture.difficulty ?? 5;
        const { mergedTags: mergedTaskTags, inferred } = finalizeCategorizedTags({
          title: task.title,
          tags: task.tags ?? [],
          includeGlobals: true,
          globalTags: allTagTokens,
          categoryOverride,
          subcategoryOverride,
          rules: activeRules,
        });
        let notes = task.notes ?? '';
        if (!notes && implicitShoppingItems.length && (/\b(shop|shopping|grocery|store|buy)\b/i.test(task.title) || mergedTaskTags.includes('#shopping'))) {
          notes = buildShoppingNotes(implicitShoppingItems, implicitMoneyUsd);
        }
        await createTask({
          title: task.title,
          status: task.status ?? 'todo',
          scheduledAt: task.scheduledAt ?? null,
          dueAt: task.dueAt ?? null,
          notes: notes || undefined,
          estimateMinutes: task.estimateMinutes ?? durationOverride ?? capture.estimateMinutes ?? null,
          tags: mergedTaskTags.map(normalizeTagName),
          contexts: mergedContexts,
          people: mergedPeople,
          goal: task.goal ?? goalOverride ?? capture.goal ?? null,
          project: task.project ?? projectOverride ?? capture.project ?? null,
          category: inferred.category,
          subcategory: inferred.subcategory,
          importance: autoImportance,
          difficulty: autoDifficulty,
          parentEventId: primaryEventId ?? null,
        });
      }

      const trackerMap = new Map<string, number | string | boolean>();
      for (const tracker of parsed.trackerLogs) {
        trackerMap.set(tracker.key, tracker.value);
      }
      for (const token of extractTrackerTokens(normalized)) {
        if (!trackerMap.has(token.name)) trackerMap.set(token.name, token.value);
      }
      for (const event of natural.events) {
        if ((event.kind ?? 'event') !== 'log') continue;
        const trackerKey = inferTrackerKeyFromText(event.title ?? '', event.tags ?? []);
        if (!trackerKey || trackerMap.has(trackerKey)) continue;
        const ratingMatch = `${event.title ?? ''}`.match(/(\d{1,2})\s*\/\s*10/);
        const value = ratingMatch?.[1] ? Number(ratingMatch[1]) : null;
        if (value != null && Number.isFinite(value)) trackerMap.set(trackerKey, value);
      }
      if (moodValue != null && !trackerMap.has('mood')) trackerMap.set('mood', moodValue);
      if (energyValue != null && !trackerMap.has('energy')) trackerMap.set('energy', energyValue);
      if (stressValue != null && !trackerMap.has('stress')) trackerMap.set('stress', stressValue);
      if (boredSignal && !trackerMap.has('bored')) trackerMap.set('bored', 7);
      const painValue = painRatingMatch?.[1] ? Number(painRatingMatch[1]) : null;
      if (painValue != null && Number.isFinite(painValue) && !trackerMap.has('pain')) {
        trackerMap.set('pain', painValue);
      }

      for (const [key, value] of trackerMap.entries()) {
        const tokenValue = typeof value === 'string' ? value : String(value);
        await createTrackerLog({
          trackerKey: key,
          value,
          occurredAt: nowMs,
          entryId: primaryEventId ?? capture.id,
          rawToken: `#${key}(${tokenValue})`,
        });
      }

      const processedText = parsed.segments.length ? formatSegmentsPreview(parsed.segments) : normalized;
      await updateInboxCapture(capture.id, {
        status: 'parsed',
        processedText,
        tags: mergedTags,
        contexts: mergedContexts,
        people: mergedPeople,
      });
      await refreshInbox();
    } catch (err) {
      Alert.alert('Review failed', err instanceof Error ? err.message : 'Unable to process this capture.');
    } finally {
      setReviewingId(null);
    }
  };

  const dismissCapture = async (capture: InboxCapture) => {
    if (reviewingId) return;
    setReviewingId(capture.id);
    try {
      await updateInboxCapture(capture.id, { status: 'parsed', processedText: 'Dismissed' });
      await refreshInbox();
    } finally {
      setReviewingId(null);
    }
  };

  const shareNotes = async () => {
    const message =
      noteMode === 'raw' ? rawText : noteMode === 'transcript' ? transcriptPreview : outlinePreview;
    if (!message.trim()) return;
    try {
      await Share.share({ message });
    } catch {
      // ignore share errors
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.recordCard}>
          <View style={styles.recordHeader}>
            <View style={styles.recordHeaderLeft}>
              <FontAwesome name="microphone" size={14} color="#FFFFFF" />
              <View style={styles.recordDot} />
            </View>
            <Text style={styles.recordTitle}>{appendEventId ? 'Append note' : 'Record'}</Text>
            <View style={styles.recordHeaderRight}>
              <FontAwesome name="cog" size={14} color="rgba(255,255,255,0.6)" />
            </View>
          </View>
          <View style={styles.waveform}>
            {waveformBars.map((height, idx) => (
              <View key={`bar_${idx}`} style={[styles.waveBar, { height }]} />
            ))}
          </View>
          <Text style={styles.recordPrompt}>
            {recordingState === 'recording' ? 'Recording… keep talking.' : 'Record a message to capture this moment.'}
          </Text>
          <Text style={styles.recordSubPrompt}>Start talking, then tap stop.</Text>
          <View style={styles.recordControls}>
            <Pressable style={styles.recordControl} onPress={() => router.back()}>
              <Text style={styles.recordControlText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.recordButton,
                recordingState === 'recording' && styles.recordButtonActive,
              ]}
              onPress={() => void toggleRecording()}>
              <View style={styles.recordButtonInner}>
                {recordingState === 'recording' ? (
                  <View style={styles.recordStop} />
                ) : (
                  <View style={styles.recordDotInner} />
                )}
              </View>
            </Pressable>
            <Pressable
              style={[
                styles.recordControl,
                recordingState !== 'recording' && styles.recordControlDisabled,
              ]}
              disabled={recordingState !== 'recording'}>
              <Text style={styles.recordControlText}>Pause</Text>
            </Pressable>
          </View>
        </View>

        {active ? (
          <View
            style={[
              styles.activeCard,
              {
                borderColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}>
            <View style={styles.activeHeader}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.activeStatus, { color: palette.textSecondary }]}>ACTIVE SESSION</Text>
            </View>
            <Text style={[styles.activeTitle, { color: palette.text }]} numberOfLines={1}>
              {active.title}
            </Text>
            <View style={styles.activeTiming}>
              <Text style={[styles.activeClock, { color: palette.tint }]}>{formatClock(elapsedMs)}</Text>
              {remainingMs != null ? (
                <Text style={[styles.activeRemaining, { color: palette.textSecondary }]}>
                  {formatClock(remainingMs)} remaining
                </Text>
              ) : null}
            </View>
            <View style={styles.activeActions}>
              <Pressable
                style={[styles.activeButton, { borderColor: palette.tint }]}
                onPress={() => router.push(`/event/${active.id}`)}>
                <Text style={[styles.activeButtonText, { color: palette.tint }]}>Open</Text>
              </Pressable>
              <Pressable
                style={[styles.activeButton, { backgroundColor: palette.tint }]}
                onPress={() => void stopSession()}>
                <Text style={styles.activeButtonTextLight}>Stop</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Pressable style={styles.sendButton} onPress={() => void shareNotes()}>
              <FontAwesome name="paper-plane" size={14} color="#D95D39" />
            </Pressable>
          </View>
          <View style={styles.notesToolbar}>
            <View style={styles.modeRow}>
              {[
                { key: 'raw', label: 'Raw' },
                { key: 'transcript', label: 'Transcript' },
                { key: 'outline', label: 'Outline' },
              ].map((option) => {
                const activeOption = noteMode === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setNoteMode(option.key as 'raw' | 'transcript' | 'outline')}
                    style={[
                      styles.modePill,
                      activeOption && styles.modePillActive,
                      {
                        borderColor: palette.border,
                      },
                    ]}>
                    <Text style={[styles.modeText, activeOption && styles.modeTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.notesActions}>
              <Pressable style={styles.timestampButton} onPress={addSegmentDivider}>
                <Text style={styles.timestampText}>Add segment</Text>
              </Pressable>
            </View>
          </View>
          {noteMode === 'raw' ? (
            <TextInput
              value={rawText}
              onChangeText={(nextText) => {
                const now = Date.now();
                const prev = rawTextRef.current;
                let updated = nextText;
                if (recordingState === 'recording' && nextText.startsWith(prev)) {
                  const needsDivider =
                    pendingDividerRef.current &&
                    hasSemanticContent(prev) &&
                    !lastNonEmptyLine(prev).startsWith('---');
                  const needsTimestamp =
                    pendingMarkerRef.current && !TIMESTAMP_LINE_RE.test(lastNonEmptyLine(prev).trim());
                  if (needsDivider || needsTimestamp) {
                    const insertion = buildAutoInsertion(prev, { divider: needsDivider, timestamp: needsTimestamp });
                    const appended = nextText.slice(prev.length);
                    updated = `${prev}${insertion}${appended}`;
                    pendingDividerRef.current = false;
                    pendingMarkerRef.current = false;
                    lastMarkerAtRef.current = now;
                  }
                }
                rawTextRef.current = updated;
                lastInputAtRef.current = now;
                setRawText(updated);
              }}
              placeholder="What happened?"
              placeholderTextColor={palette.textSecondary}
              multiline
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: palette.border,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.processedCard,
                { borderColor: palette.border },
              ]}>
              {eventPreview ? (
                <View style={styles.previewEvent}>
                  <Text style={styles.previewEventLabel}>Event preview</Text>
                  <Text style={styles.previewEventTitle}>
                    {eventPreview.category || 'General'}/{eventPreview.subcategory || 'General'}/{eventPreview.title}
                  </Text>
                  {eventPreview.contexts?.length ? (
                    <Text style={styles.previewEventMeta}>
                      {eventPreview.contexts.map((ctx) => `+${ctx}`).join(' ')}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.processedText}>
                {noteMode === 'transcript'
                  ? transcriptPreview || 'Transcript will appear here.'
                  : outlinePreview || 'Outline will appear here.'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.frontmatter}>
          <Text style={styles.sectionLabel}>Frontmatter</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Tags</Text>
            <View style={styles.chipRow}>
              {tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setManualTags((prev) => prev.filter((entry) => entry !== tag))}
                  style={styles.chip}>
                  <Text style={styles.chipText}>#{tag}</Text>
                  {manualTags.includes(tag) ? <Text style={styles.chipRemove}>x</Text> : null}
                </Pressable>
              ))}
              {!tags.length ? <Text style={styles.chipHint}>#tags will appear here</Text> : null}
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTagsFromDraft}
                onBlur={addTagsFromDraft}
                placeholder="#work #meeting"
                placeholderTextColor={palette.textSecondary}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Contexts</Text>
            <View style={styles.chipRow}>
              {contexts.map((ctx) => (
                <Pressable
                  key={ctx}
                  onPress={() => setManualContexts((prev) => prev.filter((entry) => entry !== ctx))}
                  style={[styles.chip, styles.contextChip]}>
                  <Text style={[styles.chipText, styles.contextChipText]}>+{ctx}</Text>
                  {manualContexts.includes(ctx) ? (
                    <Text style={[styles.chipRemove, styles.contextChipText]}>x</Text>
                  ) : null}
                </Pressable>
              ))}
              {!contexts.length ? <Text style={styles.chipHint}>+contexts will appear here</Text> : null}
              <TextInput
                value={contextDraft}
                onChangeText={setContextDraft}
                onSubmitEditing={addContextsFromDraft}
                onBlur={addContextsFromDraft}
                placeholder="+car +clinic"
                placeholderTextColor={palette.textSecondary}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>People</Text>
            <View style={styles.chipRow}>
              {people.map((person) => (
                <Pressable
                  key={person}
                  onPress={() => setPeople((prev) => prev.filter((entry) => entry !== person))}
                  style={styles.chip}>
                  <Text style={styles.chipText}>@{person}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              <TextInput
                value={peopleDraft}
                onChangeText={setPeopleDraft}
                onSubmitEditing={addPeopleFromDraft}
                onBlur={addPeopleFromDraft}
                placeholder="Mom, Alex"
                placeholderTextColor={palette.textSecondary}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Estimate (min)</Text>
              <TextInput
                value={estimateMinutes}
                onChangeText={setEstimateMinutes}
                keyboardType="number-pad"
                placeholder="45"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.chipRow}>
                {locations.map((loc) => (
                  <Pressable
                    key={loc}
                    onPress={() => setManualLocations((prev) => prev.filter((entry) => entry !== loc))}
                    style={styles.chip}>
                    <Text style={styles.chipText}>{loc}</Text>
                    {manualLocations.includes(loc) ? <Text style={styles.chipRemove}>x</Text> : null}
                  </Pressable>
                ))}
                <TextInput
                  value={locationDraft}
                  onChangeText={setLocationDraft}
                  onSubmitEditing={addLocationsFromDraft}
                  onBlur={addLocationsFromDraft}
                  placeholder="Home"
                  placeholderTextColor={palette.textSecondary}
                  style={[styles.chipInput, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Points</Text>
              <View style={styles.pointsCard}>
                <Text style={styles.pointsValue}>{formatXp(pointsPreview)}</Text>
                <Text style={styles.pointsMeta}>{pointsFormula}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Running</Text>
              <View style={styles.pointsCard}>
                <Text style={styles.pointsValue}>--</Text>
                <Text style={styles.pointsMeta}>Not running</Text>
              </View>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Skills</Text>
            <View style={styles.chipRow}>
              {skills.map((skill) => (
                <Pressable
                  key={skill}
                  onPress={() => setSkills((prev) => prev.filter((entry) => entry !== skill))}
                  style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                  <Text style={styles.chipRemove}>x</Text>
                </Pressable>
              ))}
              <TextInput
                value={skillsDraft}
                onChangeText={setSkillsDraft}
                onSubmitEditing={addSkillsFromDraft}
                onBlur={addSkillsFromDraft}
                placeholder="communication, lifting"
                placeholderTextColor={palette.textSecondary}
                style={[styles.chipInput, { color: palette.text }]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Character</Text>
            <View style={styles.chipRow}>
              {CHARACTER_KEYS.map((key) => {
                const activeChip = character.includes(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggleCharacter(key)}
                    style={[styles.chip, activeChip && styles.chipActive]}>
                    <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Goal</Text>
              <TextInput
                value={goal}
                onChangeText={setGoal}
                placeholder="get shredded"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Project</Text>
              <TextInput
                value={project}
                onChangeText={setProject}
                placeholder="workout plan"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Work / Health / Study"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
              />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Subcategory</Text>
              <TextInput
                value={subcategory}
                onChangeText={setSubcategory}
                placeholder="Clinic / Surgery / Gym"
                placeholderTextColor={palette.textSecondary}
                style={[
                  styles.smallInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Category shortcuts</Text>
            <View style={styles.chipRow}>
              {CATEGORY_SHORTCUTS.map((shortcut) => {
                const activeChip = shortcut.toLowerCase() === category.trim().toLowerCase();
                return (
                  <Pressable
                    key={shortcut}
                    onPress={() => setCategory(shortcut)}
                    style={[styles.chip, activeChip && styles.chipActive]}>
                    <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{shortcut}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {subcategoryOptions.length ? (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Subcategory shortcuts</Text>
              <View style={styles.chipRow}>
                {subcategoryOptions.map((shortcut) => {
                  const activeChip = shortcut.toLowerCase() === subcategory.trim().toLowerCase();
                  return (
                    <Pressable
                      key={shortcut}
                      onPress={() => setSubcategory(shortcut)}
                      style={[styles.chip, activeChip && styles.chipActive]}>
                      <Text style={[styles.chipText, activeChip && styles.chipTextActive]}>{shortcut}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.scaleGroup}>
          <Text style={styles.sectionLabel}>Importance</Text>
          <View style={styles.scaleRow}>
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
              <Pressable
                key={`imp_${level}`}
                style={[styles.scalePill, level <= importance && styles.scalePillActive]}
                onPress={() => setImportance(level)}>
                <Text style={[styles.scaleText, level <= importance && styles.scaleTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionLabel}>Difficulty / Energy</Text>
          <View style={styles.scaleRow}>
            {Array.from({ length: 10 }, (_, idx) => idx + 1).map((level) => (
              <Pressable
                key={`dif_${level}`}
                style={[styles.scalePill, level <= difficulty && styles.scalePillActive]}
                onPress={() => setDifficulty(level)}>
                <Text style={[styles.scaleText, level <= difficulty && styles.scaleTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.attachments}>
          <Pressable style={styles.attachButton} onPress={pickFromCamera}>
            <FontAwesome name="camera" size={16} color={palette.text} />
          </Pressable>
          <Pressable style={styles.attachButton} onPress={pickFromLibrary}>
            <FontAwesome name="image" size={16} color={palette.text} />
          </Pressable>
          <Pressable
            style={[styles.attachButton, recordingState === 'recording' && styles.attachButtonActive]}
            onPress={() => void toggleRecording()}>
            <FontAwesome
              name={recordingState === 'recording' ? 'stop' : 'microphone'}
              size={16}
              color={recordingState === 'recording' ? '#D95D39' : palette.text}
            />
          </Pressable>
          <Pressable style={styles.attachButton} onPress={() => void addLocationAttachment()}>
            <FontAwesome name="map-marker" size={16} color={palette.text} />
          </Pressable>
        </View>
        {recordingState === 'recording' ? (
          <Text style={styles.recordingHint}>Recording... markers added automatically</Text>
        ) : null}

        <Text style={styles.sectionLabel}>Transcription</Text>
        <View style={styles.segmentRow}>
          {[
            { key: 'supabase', label: 'Supabase' },
            { key: 'whisper', label: 'Whisper' },
          ].map((option) => {
            const activeOption = transcriptionProvider === option.key;
            return (
              <Pressable
                key={option.key}
                style={[
                  styles.segment,
                  {
                    backgroundColor: activeOption ? 'rgba(217,93,57,0.16)' : 'rgba(255,255,255,0.04)',
                    borderColor: palette.border,
                  },
                ]}
                onPress={() => setTranscriptionProvider(option.key as 'supabase' | 'whisper')}>
                <Text style={styles.segmentText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {attachments.length ? (
          <View style={styles.attachmentList}>
            {attachments.map((item) => (
              <View key={item.id} style={styles.attachmentCard}>
                {item.type === 'image' && item.uri ? (
                  <Image source={{ uri: item.uri }} style={styles.attachmentPreview} />
                ) : (
                  <View style={styles.attachmentIcon}>
                    <FontAwesome
                      name={item.type === 'audio' ? 'microphone' : item.type === 'location' ? 'map-marker' : 'paperclip'}
                      size={14}
                      color={palette.text}
                    />
                  </View>
                )}
                <View style={styles.attachmentBody}>
                  <Text style={styles.attachmentTitle}>{item.label ?? item.type}</Text>
                  <Text style={styles.attachmentMeta}>
                    {item.status === 'pending'
                      ? 'Processing...'
                      : item.transcription || item.analysis || 'Ready'}
                    {item.type === 'audio' && item.metadata?.provider
                      ? ` - ${item.metadata.provider === 'whisper' ? 'Whisper' : 'Supabase'}`
                      : ''}
                  </Text>
                </View>
                <Pressable
                  style={styles.attachmentRemove}
                  onPress={() => setAttachments((prev) => prev.filter((entry) => entry.id !== item.id))}>
                  <FontAwesome name="times" size={12} color={palette.text} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.reviewSection}>
          <Text style={styles.sectionLabel}>Review queue</Text>
          {!reviewQueue.length ? (
            <Text style={styles.reviewEmpty}>No pending captures yet.</Text>
          ) : (
            reviewQueue.map((capture) => (
              <View key={capture.id} style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>
                  {capture.rawText.split('\n')[0]?.slice(0, 80) || 'Capture'}
                </Text>
                <Text style={styles.reviewMeta}>
                  {new Date(capture.createdAt).toLocaleString()}
                </Text>
                <View style={styles.reviewActions}>
                  <Pressable
                    style={[styles.reviewButton, styles.reviewButtonPrimary]}
                    disabled={reviewingId === capture.id}
                    onPress={() => void processCapture(capture)}>
                    <Text style={styles.reviewButtonText}>
                      {reviewingId === capture.id ? 'Processing...' : 'Process'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.reviewButton, styles.reviewButtonSecondary]}
                    disabled={reviewingId === capture.id}
                    onPress={() => void dismissCapture(capture)}>
                    <Text style={styles.reviewButtonText}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={({ pressed }: PressableStateCallbackType) => [
            styles.button,
            !canSave && styles.buttonDisabled,
            pressed && canSave && styles.buttonPressed,
          ]}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Send'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scroll: {
    gap: 16,
    paddingBottom: 120,
  },
  recordCard: {
    backgroundColor: '#111315',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordHeaderRight: {
    width: 24,
    alignItems: 'flex-end',
  },
  recordDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  recordTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
  },
  waveBar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  recordPrompt: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  recordSubPrompt: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontSize: 12,
  },
  recordControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  recordControl: {
    minWidth: 64,
    alignItems: 'center',
  },
  recordControlText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 12,
  },
  recordControlDisabled: {
    opacity: 0.4,
  },
  recordButton: {
    width: 74,
    height: 44,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D95D39',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.08)',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(217,93,57,0.18)',
  },
  recordButtonInner: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D95D39',
  },
  recordStop: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  recordDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  activeCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Figtree',
  },
  activeTiming: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
  },
  activeClock: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'System',
    textAlign: 'right',
  },
  activeRemaining: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  activeActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  activeButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
  },
  activeButtonTextLight: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree',
    color: '#FFFFFF',
  },
  notesCard: {
    gap: 10,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  notesToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D95D39',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  modePill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modePillActive: {
    backgroundColor: 'rgba(217,93,57,0.16)',
    borderColor: 'rgba(217,93,57,0.35)',
  },
  modeText: {
    fontWeight: '700',
    opacity: 0.7,
  },
  modeTextActive: {
    color: '#D95D39',
    opacity: 1,
  },
  processedCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  processedText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  previewEvent: {
    gap: 4,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.16)',
  },
  previewEventLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    opacity: 0.6,
  },
  previewEventTitle: {
    fontWeight: '700',
  },
  previewEventMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  reviewSection: {
    gap: 12,
  },
  reviewEmpty: {
    opacity: 0.6,
  },
  reviewCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  reviewTitle: {
    fontWeight: '700',
  },
  reviewMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  reviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reviewButtonPrimary: {
    backgroundColor: 'rgba(217,93,57,0.18)',
  },
  reviewButtonSecondary: {
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  reviewButtonText: {
    fontWeight: '700',
  },
  frontmatter: {
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    opacity: 0.7,
  },
  fieldRow: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(217,93,57,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextChip: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  chipActive: {
    backgroundColor: 'rgba(217,93,57,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(217,93,57,0.4)',
  },
  chipText: {
    fontWeight: '600',
    color: '#D95D39',
  },
  contextChipText: {
    color: '#3B82F6',
  },
  chipTextActive: {
    color: '#D95D39',
    fontWeight: '700',
  },
  chipRemove: {
    fontSize: 12,
    opacity: 0.7,
  },
  chipHint: {
    opacity: 0.6,
  },
  chipInput: {
    minWidth: 120,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  gridItem: {
    flex: 1,
    gap: 8,
  },
  smallInput: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pointsCard: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    gap: 4,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  pointsMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
  scaleGroup: {
    gap: 8,
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  scalePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scalePillActive: {
    borderColor: 'rgba(217,93,57,0.4)',
    backgroundColor: 'rgba(217,93,57,0.18)',
  },
  scaleText: {
    fontWeight: '700',
    opacity: 0.6,
  },
  scaleTextActive: {
    color: '#D95D39',
    opacity: 1,
  },
  attachments: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  segmentText: {
    fontWeight: '700',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.1)',
  },
  attachButtonActive: {
    borderColor: '#D95D39',
    backgroundColor: 'rgba(217,93,57,0.12)',
  },
  recordingHint: {
    fontSize: 12,
    opacity: 0.7,
  },
  attachmentList: {
    gap: 10,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(28,28,30,0.08)',
  },
  attachmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.08)',
  },
  attachmentBody: {
    flex: 1,
    gap: 2,
  },
  attachmentTitle: {
    fontWeight: '700',
  },
  attachmentMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  attachmentRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 220,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D95D39',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(109,94,241,0.35)',
  },
  buttonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
