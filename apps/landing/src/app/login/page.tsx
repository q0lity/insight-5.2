'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToDesktop } from '@/lib/redirect';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!supabase) {
      setError('Supabase client is not configured. Check env vars.');
      return;
    }
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const session = data.session;
    if (session?.access_token && session.refresh_token) {
      setStatus('Signed in. Redirecting to the app…');
      redirectToDesktop({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      return;
    }

    setStatus('Signed in, but no session returned. Please try again.');
  };

  return (
    <main className="min-h-screen bg-sand flex items-center justify-center px-8">
      <div className="max-w-md w-full">
        
        {/* Back link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-stone text-sm mb-16 hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-clay flex items-center justify-center">
              <span className="text-sand font-serif italic text-xl">i</span>
            </div>
            <span className="font-semibold text-ink text-xl">Insight</span>
          </Link>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-ink mb-3">Welcome <span className="text-clay">back</span></h1>
          <p className="text-stone">Enter your credentials to <span className="text-clay">continue</span></p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="block text-xs text-clay tracking-wide uppercase mb-3">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-0 py-4 bg-transparent border-b-2 border-ink/10 focus:border-clay text-ink text-lg outline-none transition-colors placeholder:text-stone/40"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-clay tracking-wide uppercase mb-3">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-0 py-4 bg-transparent border-b-2 border-ink/10 focus:border-clay text-ink text-lg outline-none transition-colors placeholder:text-stone/40"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
          {status && !error && (
            <p className="text-sm text-ink/70">
              {status}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Link href="/forgot-password" className="text-sm text-stone hover:text-clay transition-colors">
              Forgot password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full bg-clay text-sand py-5 rounded-full font-semibold text-lg flex items-center justify-center gap-3 group mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In…' : 'Sign In'}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </motion.button>
        </motion.form>

        {/* Sign up link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-stone text-sm mt-10"
        >
          Don't have an account?{' '}
          <Link href="/signup" className="text-clay font-medium hover:underline transition-colors">
            Sign up
          </Link>
        </motion.p>
      </div>
    </main>
  );
}
