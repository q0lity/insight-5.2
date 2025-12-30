import { getSupabaseClient } from './client'

type SessionTokens = {
  access_token: string
  refresh_token: string
}

function parseTokensFromHash(hash: string): SessionTokens | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  const access = params.get('access_token')
  const refresh = params.get('refresh_token')
  if (!access || !refresh) return null
  return { access_token: access, refresh_token: refresh }
}

function parseTokensFromSearch(url: URL): SessionTokens | null {
  const access = url.searchParams.get('access_token')
  const refresh = url.searchParams.get('refresh_token')
  if (!access || !refresh) return null
  return { access_token: access, refresh_token: refresh }
}

function stripAuthParams(url: URL) {
  const next = new URL(url.toString())
  const paramsToRemove = [
    'access_token',
    'refresh_token',
    'expires_in',
    'token_type',
    'provider_token',
    'type',
    'code',
  ]
  for (const key of paramsToRemove) next.searchParams.delete(key)
  next.hash = ''
  if (next.toString() !== url.toString()) {
    window.history.replaceState({}, document.title, next.toString())
  }
}

export async function bootstrapSupabaseAuth() {
  if (typeof window === 'undefined') return
  const supabase = getSupabaseClient()
  if (!supabase) return

  const url = new URL(window.location.href)
  const tokens = parseTokensFromSearch(url) ?? parseTokensFromHash(url.hash)
  const code = url.searchParams.get('code')

  try {
    if (tokens) {
      await supabase.auth.setSession(tokens)
      stripAuthParams(url)
      return
    }
    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
      stripAuthParams(url)
    }
  } catch (err) {
    console.error('Supabase auth bootstrap failed:', err)
  }
}
