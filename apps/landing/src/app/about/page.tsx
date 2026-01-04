'use client';

import React, { useRef } from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="relative bg-sand">
      <Navbar />
      <HeroSection />
      <MissionSection />
      <ProblemSolutionSection />
      <ValuesSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="pt-40 pb-20 px-8 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-[clamp(3rem,10vw,8rem)] font-bold text-ink leading-[0.9] tracking-tight"
      >
        <span className="text-clay">About</span>
      </motion.h1>
    </section>
  );
}

function MissionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section ref={ref} className="py-32 px-8 md:px-16">
      <div className="max-w-[900px] mx-auto">
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-8"
        >
          Our Mission
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[clamp(1.5rem,4vw,3rem)] font-bold text-ink leading-[1.2]"
        >
          We're building the <span className="text-clay">future of reflection</span>. Raw thoughts in, synthesized insights out.
        </motion.h2>
      </div>
    </section>
  );
}

function ProblemSolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid md:grid-cols-2 gap-20">
          
          {/* The Problem */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="text-xs text-clay tracking-[0.3em] uppercase mb-8 block">The Problem</span>
            
            <h3 className="text-2xl font-bold text-ink mb-6 leading-tight">
              Notes become <span className="text-clay">graveyards</span>.
            </h3>
            
            <p className="text-stone leading-relaxed">
              You capture hundreds of thoughts. They lack <span className="text-clay">context</span>. They lack connection. High volume makes revisiting impossible. Your best ideas get buried.
            </p>
          </motion.div>

          {/* The Solution */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <span className="text-xs text-clay tracking-[0.3em] uppercase mb-8 block">The Solution</span>
            
            <h3 className="text-2xl font-bold text-ink mb-6 leading-tight">
              AI that <span className="text-clay">synthesizes</span>.
            </h3>
            
            <p className="text-stone leading-relaxed">
              Insight generates "<span className="text-clay">Reflections</span>"—weekly synthesized briefs that organize chaos into coherence. Context restored. Patterns revealed.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ValuesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const values = [
    { title: "Problem Focused", desc: "We obsess over the note graveyard problem. Every feature exists to solve it." },
    { title: "Privacy First", desc: "Your thoughts are private. Encrypted at rest, never sold, never used for training." },
    { title: "Knowledge Workers", desc: "Built for founders, researchers, and thinkers who capture 50+ notes a week." },
  ];

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1100px] mx-auto">
        
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-12"
        >
          Our Values
        </motion.span>

        <div className="grid md:grid-cols-3 gap-12">
          {values.map((value, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <span className="text-6xl font-bold text-clay/30 block mb-4">0{i + 1}</span>
              <h3 className="text-xl font-bold text-ink mb-3">{value.title}</h3>
              <p className="text-stone text-sm leading-relaxed">{value.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 border-t border-ink/5">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-[600px] mx-auto text-center"
      >
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-tight mb-8 text-ink">
          Ready to <span className="text-clay">join us</span>?
        </h2>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-clay text-sand px-10 py-5 rounded-full font-semibold text-lg inline-flex items-center gap-3 group"
        >
          Get Started Free
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
        </motion.button>
      </motion.div>
    </section>
  );
}
