'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { redirectToDesktop } from '@/lib/redirect';

export default function AuthCallbackPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState('Finishing sign-in…');

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setStatus('Supabase client is not configured. Check env vars.');
        return;
      }

      const code = params.get('code');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          const session = data.session;
          if (session?.access_token && session.refresh_token) {
            redirectToDesktop({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            });
            return;
          }
          setStatus('Signed in, but session is missing. Please try again.');
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          redirectToDesktop({ accessToken, refreshToken });
          return;
        }

        setStatus('Missing auth parameters. Try signing in again.');
      } catch (err) {
        console.error('Auth callback error', err);
        setStatus('Authentication failed. Please try again.');
      }
    };

    run();
  }, [params]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-sand">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full border-2 border-clay border-b-transparent animate-spin" />
        <p className="text-stone">{status}</p>
      </div>
    </main>
  );
}
