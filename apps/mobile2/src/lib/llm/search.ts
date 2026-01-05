import type { InboxCapture } from '@/src/storage/inbox';
import { fetchOpenAiChatCompletion } from './openai';

function buildCaptureContext(query: string, captures: InboxCapture[]) {
  const q = query.trim().toLowerCase();
  const hits = captures.filter((c) => c.rawText.toLowerCase().includes(q)).slice(0, 8);
  const base = hits.length ? hits : captures.slice(0, 8);
  return base
    .map((c) => `${new Date(c.createdAt).toLocaleString()} - ${c.rawText.slice(0, 240)}`)
    .join('\n');
}

export async function answerWithLlm(params: {
  query: string;
  captures: InboxCapture[];
  apiKey: string;
  model: string;
}) {
  const context = buildCaptureContext(params.query, params.captures);
  const system = [
    'You are Insight, a personal search assistant.',
    'Use ONLY the provided context to answer. Do not hallucinate.',
    'If the answer is not in context, say: "No matches found in your captures."',
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
