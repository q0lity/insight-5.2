'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToDesktop } from '@/lib/redirect';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const benefits = [
    "Unlimited thought capture",
    "AI-powered synthesis",
    "End-to-end encryption",
  ];

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
          <h1 className="text-4xl font-bold text-ink mb-3">Create <span className="text-clay">account</span></h1>
          <p className="text-stone"><span className="text-clay">Free</span> forever. No credit card required.</p>
        </motion.div>

        {/* Benefits */}
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-3 mb-10"
        >
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-3 text-stone text-sm">
              <Check size={14} className="text-clay" strokeWidth={3} />
              {benefit}
            </li>
          ))}
        </motion.ul>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-6"
          onSubmit={async (e) => {
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
            const { data, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: name || undefined } },
            });
            setLoading(false);

            if (signUpError) {
              setError(signUpError.message);
              return;
            }

            const session = data.session;
            if (session?.access_token && session.refresh_token) {
              setStatus('Account created. Redirecting to the app…');
              redirectToDesktop({
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
              });
              return;
            }

            setStatus('Check your email to confirm your account, then return to continue.');
          }}
        >
          <div>
            <label className="block text-xs text-clay tracking-wide uppercase mb-3">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-0 py-4 bg-transparent border-b-2 border-ink/10 focus:border-clay text-ink text-lg outline-none transition-colors placeholder:text-stone/40"
              placeholder="Your name"
            />
          </div>

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
              placeholder="8+ characters"
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

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full bg-clay text-sand py-5 rounded-full font-semibold text-lg flex items-center justify-center gap-3 group mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Account'}
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </motion.button>
        </motion.form>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center text-stone/60 text-xs mt-8"
        >
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-stone hover:text-clay transition-colors">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-stone hover:text-clay transition-colors">Privacy Policy</Link>
        </motion.p>

        {/* Login link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center text-stone text-sm mt-6"
        >
          Already have an account?{' '}
          <Link href="/login" className="text-clay font-medium hover:underline transition-colors">
            Sign in
          </Link>
        </motion.p>
      </div>
    </main>
  );
}
