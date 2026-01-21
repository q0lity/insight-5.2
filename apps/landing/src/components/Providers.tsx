'use client';

import { AnimatePresence } from 'framer-motion';

/**
 * Client-side providers wrapper
 *
 * Wraps the app with necessary providers including AnimatePresence
 * for page transitions.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  );
}
