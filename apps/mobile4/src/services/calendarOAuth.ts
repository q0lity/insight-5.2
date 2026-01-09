import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

import { invokeGoogleOAuthExchange, invokeMicrosoftOAuthExchange } from '@/src/supabase/functions'

WebBrowser.maybeCompleteAuthSession()

export type CalendarOAuthProvider = 'google' | 'microsoft'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing ${key}. Add it to your mobile4 env file.`)
  }
  return value
}

function pickQueryValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parseOAuthResult(url: string) {
  const parsed = Linking.parse(url)
  const params = parsed.queryParams ?? {}
  return {
    code: pickQueryValue(params.code as string | string[] | undefined),
    error: pickQueryValue(params.error as string | string[] | undefined),
    errorDescription: pickQueryValue(params.error_description as string | string[] | undefined),
  }
}

function buildGoogleAuthUrl(redirectUri: string) {
  const clientId = requireEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/calendar',
    ].join(' '),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function buildMicrosoftAuthUrl(redirectUri: string) {
  const clientId = requireEnv('EXPO_PUBLIC_MICROSOFT_CLIENT_ID')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    prompt: 'consent',
    scope: ['offline_access', 'Calendars.ReadWrite', 'User.Read'].join(' '),
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
}

export function getCalendarRedirectUri() {
  return Linking.createURL('oauth', { scheme: 'mobile4' })
}

export async function connectCalendarProvider(provider: CalendarOAuthProvider): Promise<boolean> {
  const redirectUri = getCalendarRedirectUri()
  const authUrl =
    provider === 'google'
      ? buildGoogleAuthUrl(redirectUri)
      : buildMicrosoftAuthUrl(redirectUri)

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri)
  if (result.type !== 'success' || !result.url) {
    return false
  }

  const { code, error, errorDescription } = parseOAuthResult(result.url)
  if (error) {
    throw new Error(errorDescription ? `${error}: ${errorDescription}` : error)
  }
  if (!code) {
    throw new Error('Missing authorization code.')
  }

  if (provider === 'google') {
    await invokeGoogleOAuthExchange({ code, redirectUri })
  } else {
    await invokeMicrosoftOAuthExchange({ code, redirectUri })
  }

  return true
}
