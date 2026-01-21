'use client';

import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/motion';

/**
 * Page Transition Template
 *
 * Wraps all pages with smooth fade + slide transitions.
 * The template.tsx re-renders on every navigation in Next.js App Router.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransition}
    >
      {children}
    </motion.div>
  );
}
