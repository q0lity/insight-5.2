#!/usr/bin/env -S tsx
// Usage: OPENAI_API_KEY=... tsx scripts/nutrition-lookup.ts "2 slices of pizza and a hot dog"
import process from 'node:process';

const input = process.argv.slice(2).join(' ').trim();
if (!input) {
  console.error('Provide a food description.');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY.');
  process.exit(1);
}

const prompt = [
  'Estimate nutrition for the meal described below.',
  'Return JSON only with keys:',
  'items: array of {name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g}',
  'totals: {calories, protein_g, carbs_g, fat_g, fiber_g}',
  `Meal: ${input}`,
].join('\n');

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  }),
});

if (!response.ok) {
  const errorText = await response.text();
  console.error('OpenAI request failed:', errorText);
  process.exit(1);
}

const data = await response.json();
const content = data?.choices?.[0]?.message?.content;
if (!content) {
  console.error('No content returned.');
  process.exit(1);
}

console.log(content.trim());
