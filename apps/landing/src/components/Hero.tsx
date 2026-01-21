'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import Link from 'next/link';

export const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  // Smooth spring physics for parallax
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  const y = useTransform(smoothProgress, [0, 1], [0, 300]);
  const opacity = useTransform(smoothProgress, [0, 0.4], [1, 0]);
  const scale = useTransform(smoothProgress, [0, 0.4], [1, 0.95]);
  const imageY = useTransform(smoothProgress, [0, 1], [0, 150]);
  const imageScale = useTransform(smoothProgress, [0, 0.5], [1, 1.1]);

  // Text animation variants
  const wordVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        duration: 1,
        delay: i * 0.1,
        ease: [0.16, 1, 0.3, 1] as const
      }
    })
  };

  const lineVariants = {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: { duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] as const }
    }
  };

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[100vh] flex flex-col justify-center px-8 md:px-16 pt-32 pb-20"
    >
      <motion.div style={{ y, opacity, scale }} className="max-w-[1400px] mx-auto w-full">
        
        {/* Minimal eyebrow */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center gap-4 mb-12"
        >
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-8 h-px bg-clay origin-left"
          />
          <span className="text-mono text-stone text-xs">Thought Synthesis</span>
        </motion.div>

        {/* Main headline - split word animation */}
        <div className="overflow-hidden mb-6">
          <motion.h1 
            className="text-display text-[clamp(3rem,10vw,9rem)] text-ink"
            initial="hidden"
            animate="visible"
          >
            {['Capture', 'everything.'].map((word, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={wordVariants}
                className="inline-block mr-[0.25em]"
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>
        </div>

        <div className="overflow-hidden mb-16">
          <motion.h2 
            className="text-display text-[clamp(2rem,6vw,5rem)] text-ink/40"
            initial="hidden"
            animate="visible"
          >
            {['Connect', 'the', 'dots.'].map((word, i) => (
              <motion.span
                key={i}
                custom={i + 2}
                variants={wordVariants}
                className="inline-block mr-[0.25em]"
              >
                {i === 2 ? <span className="text-clay-gradient">{word}</span> : word}
              </motion.span>
            ))}
          </motion.h2>
        </div>

        {/* Horizontal line reveal */}
        <motion.div 
          variants={lineVariants}
          initial="hidden"
          animate="visible"
          className="w-full h-px bg-ink/10 origin-left mb-16"
        />

        {/* Description and CTA */}
        <div className="grid md:grid-cols-2 gap-12 items-end">
          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl md:text-2xl text-stone leading-relaxed max-w-xl"
          >
            Stop losing your best ideas. Insight synthesizes your raw thoughts into coherent briefs—automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex gap-6"
          >
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-ink text-sand px-10 py-5 rounded-full font-semibold text-lg transition-shadow hover:shadow-xl"
              >
                Start Free
              </motion.button>
            </Link>
            <Link href="/features">
              <motion.button
                whileHover={{ x: 4 }}
                className="underline-hover text-ink font-semibold text-lg flex items-center gap-2"
              >
                Watch Demo
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Hero image with parallax */}
      <motion.div 
        style={{ y: imageY }}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-[1400px] mx-auto w-full mt-24"
      >
        <motion.div 
          style={{ scale: imageScale }}
          className="relative rounded-3xl overflow-hidden shadow-2xl"
        >
          <img 
            src="/assets/ui-insight.png" 
            alt="Insight Interface" 
            className="w-full"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-sand/20 to-transparent pointer-events-none" />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator"
      >
        <ArrowDown className="text-stone/40" size={24} />
      </motion.div>
    </section>
  );
};
