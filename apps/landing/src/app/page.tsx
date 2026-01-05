'use client';

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative bg-sand">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <SocialProofSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}

// Lots of words - action verbs on top, scope words on bottom
const topWords = [
  "Capture", "Record", "Track", "Log", "Note", "Save",
  "Organize", "Connect", "Synthesize", "Remember", "Contain",
  "Transform"
];
const bottomWords = [
  "everything.", "anything.", "anywhere.", "anytime.", "always.",
  "every thought.", "every idea.", "every moment.", "all of it.",
  "effortlessly.", "automatically.",
  "your life."
];

// Timing: starts fast, slows down exponentially
const getInterval = (index: number, total: number) => {
  const progress = index / (total - 2); // 0 to 1 as we approach the end
  const minSpeed = 120;  // fastest (ms)
  const maxSpeed = 800;  // slowest before final
  // Exponential slowdown
  return minSpeed + (maxSpeed - minSpeed) * Math.pow(progress, 2);
};

const STAGGER_OFFSET = 60; // Bottom starts slightly after top

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [phase, setPhase] = useState<'cycling' | 'final'>('cycling');
  const [showTagline, setShowTagline] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  // Top word cycles - fast to slow
  useEffect(() => {
    if (phase !== 'cycling') return;
    if (topIndex >= topWords.length - 1) return; // Stop at "Transform"

    const interval = getInterval(topIndex, topWords.length);
    const timer = setTimeout(() => {
      setTopIndex(prev => prev + 1);
    }, interval);

    return () => clearTimeout(timer);
  }, [topIndex, phase]);

  // Bottom word cycles - staggered, fast to slow
  useEffect(() => {
    if (phase !== 'cycling') return;
    if (bottomIndex >= bottomWords.length - 1) return; // Stop at "your life."

    const interval = bottomIndex === 0
      ? STAGGER_OFFSET
      : getInterval(bottomIndex, bottomWords.length);

    const timer = setTimeout(() => {
      setBottomIndex(prev => prev + 1);
    }, interval);

    return () => clearTimeout(timer);
  }, [bottomIndex, phase]);

  // Check if both have landed on final words
  useEffect(() => {
    if (topIndex === topWords.length - 1 && bottomIndex === bottomWords.length - 1 && phase === 'cycling') {
      // Both landed - brief pause then show CTA
      setTimeout(() => {
        setPhase('final');
        setTimeout(() => setShowTagline(true), 300);
        setTimeout(() => setShowCTA(true), 600);
      }, 400);
    }
  }, [topIndex, bottomIndex, phase]);

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#1C1C1E 1px, transparent 1px), linear-gradient(90deg, #1C1C1E 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <motion.div style={{ opacity, scale }} className="text-center px-8 relative z-10 max-w-5xl">
        {/* Main headline with cycling animation */}
        <div className="text-[clamp(4rem,15vw,12rem)] font-bold leading-[0.85] tracking-tight mb-8 min-h-[1.8em]">

          {/* First word (clay colored) */}
          <div className="relative h-[1em]">
            {phase === 'final' ? (
              <motion.span
                className="text-clay inline-block"
                initial={{ scale: 1.02, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {topWords[topIndex]}
              </motion.span>
            ) : (
              <span className="text-clay">{topWords[topIndex]}</span>
            )}
          </div>

          {/* Second word (ink colored) */}
          <div className="relative h-[1em] text-ink">
            {phase === 'final' ? (
              <motion.span
                className="inline-block"
                initial={{ scale: 1.02, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 1.2,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.1,
                }}
              >
                {bottomWords[bottomIndex]}
              </motion.span>
            ) : (
              <span>{bottomWords[bottomIndex]}</span>
            )}
          </div>
        </div>

        {/* Elegant line separator */}
        <AnimatePresence>
          {showTagline && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="w-24 h-px bg-gradient-to-r from-transparent via-clay/40 to-transparent mx-auto mb-8"
            />
          )}
        </AnimatePresence>

        {/* Tagline - elegant fade in */}
        <AnimatePresence>
          {showTagline && (
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
              className="text-xl md:text-2xl text-stone max-w-xl mx-auto mb-12"
            >
              Your thoughts,{' '}
              <motion.span
                className="text-clay font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                synthesized.
              </motion.span>
            </motion.p>
          )}
        </AnimatePresence>

        {/* CTA - smooth elegant appearance */}
        <AnimatePresence>
          {showCTA && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Link href="/signup">
                <motion.button
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                    delay: 0.1,
                  }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 25px 50px rgba(28, 28, 30, 0.15)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-ink text-sand px-12 py-5 rounded-full font-semibold text-lg inline-flex items-center gap-3 group shadow-xl transition-shadow duration-500"
                >
                  Start Free
                  <motion.span
                    initial={{ x: -5, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </motion.span>
                </motion.button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Scroll indicator - only show after animation complete */}
      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
          >
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <ArrowDown className="text-stone/30" size={24} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30%" });

  return (
    <section ref={ref} className="min-h-screen flex items-center py-40 px-8 md:px-16 relative">
      <div className="max-w-[1200px] mx-auto">
        
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-12"
        >
          The Problem
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[clamp(2rem,5vw,4rem)] font-bold text-ink leading-[1.1] max-w-4xl"
        >
          You capture <span className="text-clay">hundreds</span> of notes.
          <br />
          <span className="text-stone">Then they disappear into the void.</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 grid md:grid-cols-3 gap-8"
        >
          {[
            { number: "87%", label: "of notes never revisited" },
            { number: "50+", label: "thoughts captured weekly" },
            { number: "0", label: "connections made" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
              className="text-center md:text-left"
            >
              <div className="text-5xl md:text-6xl font-bold text-clay mb-2">{stat.number}</div>
              <div className="text-stone">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30%" });

  return (
    <section ref={ref} className="min-h-screen flex items-center py-40 px-8 md:px-16 relative">
      <div className="max-w-[1200px] mx-auto">
        
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-12"
        >
          The Solution
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[1.1] max-w-4xl"
        >
          <span className="text-ink">Insight <span className="text-clay">synthesizes</span> your chaos</span>
          <br />
          <span className="text-stone">into clarity.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-xl text-stone max-w-2xl mt-8"
        >
          We analyze your raw thoughts and generate weekly "<span className="text-clay">Reflections</span>"—synthesized briefs that restore context, reveal patterns, and surface your best ideas.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12"
        >
          <a href="/features" className="text-clay font-medium inline-flex items-center gap-2 group text-lg">
            See how it works
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const steps = [
    { num: "01", title: "Capture", desc: "Voice or text. Zero friction." },
    { num: "02", title: "Synthesize", desc: "AI finds the patterns." },
    { num: "03", title: "Discover", desc: "Search by meaning." },
  ];

  return (
    <section ref={ref} className="py-40 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1200px] mx-auto">
        
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-12"
        >
          How It Works
        </motion.span>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative"
            >
              <span className="text-8xl font-bold text-clay/10 absolute -top-4 -left-2">{step.num}</span>
              <div className="relative pt-12">
                <h3 className="text-3xl font-bold text-ink mb-4">{step.title}</h3>
                <p className="text-lg text-stone">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialProofSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section ref={ref} className="py-40 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[900px] mx-auto text-center">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="text-6xl text-clay mb-8">"</div>
          
          <blockquote className="text-2xl md:text-4xl font-medium text-ink leading-relaxed mb-12">
            I capture thoughts on walks, and by Sunday I have a <span className="text-clay">synthesized brief</span> of my best ideas.
          </blockquote>

          <div>
            <p className="font-semibold text-ink text-lg">Alex Chen</p>
            <p className="text-stone text-sm">Founder, <span className="text-clay">Synthesis Labs</span></p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section ref={ref} className="py-40 px-8 md:px-16 border-t border-ink/5">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-[800px] mx-auto text-center"
      >
        <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-bold text-ink leading-[0.95] mb-8">
          Stop <span className="text-clay">losing</span> ideas.
        </h2>
        
        <p className="text-xl text-stone mb-12 max-w-lg mx-auto">
          Join thousands of <span className="text-clay">knowledge workers</span> who've reclaimed their thinking.
        </p>

        <Link href="/signup">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-ink text-sand px-12 py-6 rounded-full font-semibold text-xl inline-flex items-center gap-3 group"
          >
            Start Free
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </motion.button>
        </Link>

        <p className="text-sm text-stone/60 mt-6">No credit card required</p>
      </motion.div>
    </section>
  );
}
