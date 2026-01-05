export type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function fetchOpenAiChatCompletion(params: {
  apiKey: string;
  model: string;
  messages: OpenAiMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 350,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}
