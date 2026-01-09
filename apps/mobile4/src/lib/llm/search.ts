import type { InboxCapture } from '@/src/storage/inbox';
import type { MobileEvent } from '@/src/storage/events';
import type { MobileTask } from '@/src/storage/tasks';
import { fetchOpenAiChatCompletion } from './openai';

function buildCaptureContext(query: string, captures: InboxCapture[]) {
  const q = query.trim().toLowerCase();
  const hits = captures.filter((c) => c.rawText.toLowerCase().includes(q)).slice(0, 8);
  const base = hits.length ? hits : captures.slice(0, 8);
  return base
    .map((c) => `${new Date(c.createdAt).toLocaleString()} - ${c.rawText.slice(0, 240)}`)
    .join('\n');
}

function buildEventContext(query: string, events: MobileEvent[]) {
  const q = query.trim().toLowerCase();
  const asText = (e: MobileEvent) => `${e.title ?? ''}\n${(e.tags ?? []).join(' ')}\n${e.notes ?? ''}`.trim();
  const hits = events.filter((e) => asText(e).toLowerCase().includes(q)).slice(0, 6);
  const base = hits.length ? hits : events.slice(0, 6);
  return base
    .map((e) => `${new Date(e.startAt).toLocaleString()} - ${asText(e).slice(0, 200)}`)
    .join('\n');
}

function buildTaskContext(query: string, tasks: MobileTask[]) {
  const q = query.trim().toLowerCase();
  const asText = (t: MobileTask) => `${t.title ?? ''}\n${(t.tags ?? []).join(' ')}\n${t.notes ?? ''}`.trim();
  const hits = tasks.filter((t) => asText(t).toLowerCase().includes(q)).slice(0, 6);
  const base = hits.length ? hits : tasks.slice(0, 6);
  return base
    .map((t) => `${t.status ?? 'todo'} - ${asText(t).slice(0, 200)}`)
    .join('\n');
}

export async function answerWithLlm(params: {
  query: string;
  captures: InboxCapture[];
  events?: MobileEvent[];
  tasks?: MobileTask[];
  apiKey: string;
  model: string;
}) {
  const captureContext = buildCaptureContext(params.query, params.captures);
  const eventContext = params.events?.length ? buildEventContext(params.query, params.events) : '';
  const taskContext = params.tasks?.length ? buildTaskContext(params.query, params.tasks) : '';
  const context = [
    captureContext ? `Inbox:\n${captureContext}` : '',
    eventContext ? `\nCalendar:\n${eventContext}` : '',
    taskContext ? `\nTasks:\n${taskContext}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const system = [
    'You are Insight, a private, local-first journaling + calendar assistant.',
    'Use ONLY the provided context to answer.',
    'If context is insufficient, ask a clarifying question.',
    'Keep answers concise, bullet when helpful.',
  ].join(' ');
  const user = `Question: ${params.query}\n\nContext:\n${context || 'No captures available.'}`;
  const response = await fetchOpenAiChatCompletion({
    apiKey: params.apiKey,
    model: params.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
    maxTokens: 350,
  });
  if (!response) return 'No matches found in your captures.';
  return response;
}
