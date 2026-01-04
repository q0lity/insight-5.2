'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const links = {
  product: ['Features', 'Pricing', 'Changelog'],
  company: ['About', 'Blog', 'Careers'],
  legal: ['Privacy', 'Terms'],
};

export const Footer = () => {
  return (
    <footer className="py-24 px-8 md:px-16 border-t border-ink/10">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Top section - CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-24"
        >
          <h3 className="text-[clamp(2rem,4vw,3.5rem)] font-bold text-ink mb-8 max-w-xl">
            Ready to stop <span className="text-clay">losing</span> ideas?
          </h3>
          <Link href="/signup">
            <motion.button
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="bg-ink text-sand px-10 py-5 rounded-full font-semibold text-lg flex items-center gap-3 group"
            >
              Get Started Free
              <ArrowUpRight className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" size={20} />
            </motion.button>
          </Link>
        </motion.div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-24">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
                <span className="text-sand font-serif italic">i</span>
              </div>
              <span className="text-ink font-semibold">Insight</span>
            </Link>
            <p className="text-stone text-sm">
              Thought <span className="text-clay">synthesis</span> for<br />modern knowledge workers.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p className="text-mono text-stone/50 text-xs mb-4">{category}</p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link 
                      href={`/${item.toLowerCase()}`}
                      className="text-stone hover:text-ink transition-colors text-sm underline-hover inline-block"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-ink/5">
          <p className="text-stone/60 text-sm">
            © {new Date().getFullYear()} Insight Labs
          </p>
          <div className="flex gap-6">
            {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
              <Link 
                key={social}
                href="#"
                className="text-stone/60 hover:text-ink transition-colors text-sm"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
