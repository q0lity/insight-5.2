export type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function openAiApiUrl(path: string) {
  const base =
    typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')
      ? '/openai'
      : 'https://api.openai.com'
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

function extractResponseText(json: any): string {
  if (typeof json?.output_text === 'string' && json.output_text) return json.output_text
  const parts: string[] = []
  const out = json?.output
  if (Array.isArray(out)) {
    for (const item of out) {
      if (item?.type !== 'message') continue
      if (item?.role !== 'assistant') continue
      const content = item?.content
      if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c === 'string') parts.push(c)
          else if (c?.type === 'output_text' && typeof c?.text === 'string') parts.push(c.text)
          else if (c?.type === 'text' && typeof c?.text === 'string') parts.push(c.text)
        }
      } else if (typeof content === 'string') {
        parts.push(content)
      }
    }
  }
  return parts.join('') || ''
}

async function callChatCompletionsFallback(opts: {
  apiKey: string
  model: string
  messages: OpenAiMessage[]
  temperature: number
  maxOutputTokens: number
  responseFormat?: { type: 'json_object' } | null
}) {
  const model = opts.model.trim()
  const useMaxCompletionTokens = /^gpt-5/i.test(model)
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    ...(useMaxCompletionTokens ? { max_completion_tokens: opts.maxOutputTokens } : { max_tokens: opts.maxOutputTokens }),
    ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
  }
  const supportsTemperature = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)
  if (supportsTemperature) body.temperature = opts.temperature

  let res = await fetch(openAiApiUrl('/v1/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const isTempError = text.includes('Unsupported parameter') && text.includes('temperature')
    const isMaxTokenError = text.includes('max_tokens') || text.includes('max_completion_tokens')
    const isResponseFormatError = text.includes('response_format')
    const retryBody = { ...body }
    let shouldRetry = false
    if (isTempError && 'temperature' in retryBody) {
      delete retryBody.temperature
      shouldRetry = true
    }
    if (isResponseFormatError && 'response_format' in retryBody) {
      delete retryBody.response_format
      shouldRetry = true
    }
    if (isMaxTokenError) {
      if ('max_tokens' in retryBody && !('max_completion_tokens' in retryBody)) {
        retryBody.max_completion_tokens = retryBody.max_tokens
        delete retryBody.max_tokens
        shouldRetry = true
      } else if ('max_completion_tokens' in retryBody && !('max_tokens' in retryBody)) {
        retryBody.max_tokens = retryBody.max_completion_tokens
        delete retryBody.max_completion_tokens
        shouldRetry = true
      }
    }
    if (shouldRetry) {
      res = await fetch(openAiApiUrl('/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify(retryBody),
      })
      if (!res.ok) {
        const retryText = await res.text().catch(() => '')
        throw new Error(`OpenAI HTTP ${res.status}: ${retryText.slice(0, 240)}`)
      }
    } else {
      throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 240)}`)
    }
  }
  const json = (await res.json()) as any
  return (json?.choices?.[0]?.message?.content as string | undefined) ?? ''
}

export async function callOpenAiText(opts: {
  apiKey: string
  model: string
  messages: OpenAiMessage[]
  temperature?: number
  maxOutputTokens?: number
  responseFormat?: { type: 'json_object' } | null
}) {
  const model = opts.model.trim()
  const temperature = opts.temperature ?? 0.2
  const maxOutputTokens = opts.maxOutputTokens ?? 800
  const supportsTemperature = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)
  const supportsResponseFormat = !/^gpt-5/i.test(model) && !/^o[1-9]/i.test(model)

  if (opts.responseFormat && supportsResponseFormat) {
    return await callChatCompletionsFallback({
      apiKey: opts.apiKey,
      model,
      messages: opts.messages,
      temperature,
      maxOutputTokens,
      responseFormat: opts.responseFormat,
    })
  }

  const res = await fetch(openAiApiUrl('/v1/responses'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: opts.messages,
      ...(supportsTemperature ? { temperature } : {}),
      max_output_tokens: maxOutputTokens,
    }),
  })

  if (res.status === 404) {
    return await callChatCompletionsFallback({
      apiKey: opts.apiKey,
      model: opts.model,
      messages: opts.messages,
      temperature,
      maxOutputTokens,
      responseFormat: opts.responseFormat ?? null,
    })
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 240)}`)
  }
  const json = (await res.json()) as any
  return extractResponseText(json)
}

export async function callOpenAiEmbedding(opts: { apiKey: string; model: string; input: string }) {
  const res = await fetch(openAiApiUrl('/v1/embeddings'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      input: opts.input,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 240)}`)
  }

  const json = (await res.json()) as any
  const embedding = json?.data?.[0]?.embedding
  if (!Array.isArray(embedding)) {
    throw new Error('OpenAI embedding response missing embedding data.')
  }
  return embedding as number[]
}
