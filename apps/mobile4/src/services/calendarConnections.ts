import { getSupabaseClient } from '@/src/supabase/client'

export type CalendarProvider = 'google' | 'microsoft'

export type CalendarConnection = {
  provider: CalendarProvider
  email?: string | null
}

type ExternalAccountRow = {
  provider: string | null
  external_email: string | null
}

function isCalendarProvider(value: string | null): value is CalendarProvider {
  return value === 'google' || value === 'microsoft'
}

export async function listCalendarConnections(): Promise<CalendarConnection[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user) return []

  const { data, error } = await supabase
    .from('external_accounts')
    .select('provider, external_email')

  if (error) {
    throw new Error(error.message)
  }

  return (data as ExternalAccountRow[] | null | undefined ?? [])
    .filter((row) => isCalendarProvider(row.provider))
    .map((row) => ({
      provider: row.provider as CalendarProvider,
      email: row.external_email,
    }))
}

export async function disconnectCalendarProvider(provider: CalendarProvider): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { error } = await supabase
    .from('external_accounts')
    .delete()
    .eq('provider', provider)

  if (error) {
    throw new Error(error.message)
  }
}
