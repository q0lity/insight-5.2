'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export const Navbar = () => {
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.nav 
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: -100, opacity: 0 }
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-8 md:px-16 py-6"
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        
        {/* Logo - minimal */}
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ rotate: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="w-9 h-9 bg-ink rounded-lg flex items-center justify-center"
          >
            <span className="text-sand font-serif italic text-lg">i</span>
          </motion.div>
          <span className="text-ink font-semibold text-xl">Insight</span>
        </Link>
        
        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link, i) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <Link 
                href={link.href} 
                className="underline-hover text-stone hover:text-ink transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-6">
          <Link href="/login" className="hidden md:block text-stone hover:text-ink transition-colors text-sm font-medium">
            Log in
          </Link>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link 
              href="/signup" 
              className="bg-ink text-sand px-6 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg transition-shadow"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
};
