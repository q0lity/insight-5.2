'use client';

import React, { useRef } from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Mic, Brain, Search, Globe, ArrowRight, ArrowDown } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <main className="relative bg-sand">
      <Navbar />
      <HeroSection />
      <CaptureSection />
      <SynthesizeSection />
      <DiscoverSection />
      <ExportSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background circles */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.12, 0.08] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-clay/20"
      />
      <motion.div 
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full border border-ink/5"
      />

      <motion.div style={{ opacity, scale }} className="text-center px-8 relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(3rem,12vw,10rem)] font-bold text-ink leading-[0.85] tracking-tight mb-8"
        >
          Features
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-2xl md:text-3xl text-stone max-w-xl mx-auto"
        >
          Four pillars of <span className="text-clay">thought capture</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-[-150px] left-1/2 -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ArrowDown className="text-stone/30" size={24} />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function CaptureSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section ref={ref} className="min-h-screen py-40 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          {/* Visual - Animated sound waves */}
          <div className="relative h-[400px] flex items-center justify-center order-2 lg:order-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { 
                  scale: [1, 1.5 + i * 0.2, 1],
                  opacity: [0.3 - i * 0.05, 0.1, 0.3 - i * 0.05]
                } : {}}
                transition={{ duration: 3, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute rounded-full border-2 border-clay/40"
                style={{ width: 80 + i * 50, height: 80 + i * 50 }}
              />
            ))}
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ duration: 0.6, type: "spring", delay: 0.3 }}
              className="relative z-10 w-20 h-20 rounded-full bg-clay flex items-center justify-center"
            >
              <Mic className="text-sand" size={32} />
            </motion.div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-6"
            >
              01 — Capture
            </motion.span>
            
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[clamp(2rem,5vw,4rem)] font-bold text-ink mb-8 leading-[0.95]"
            >
              Speak your mind.
              <br />
              <span className="text-clay">We handle the rest.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-stone leading-relaxed mb-10 max-w-lg"
            >
              Voice or text. Walking or sitting. No folders. No tags. No friction. Just capture and move on.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              {['Voice', 'Text', 'Photos', 'Links'].map((tag, i) => (
                <span key={tag} className="px-4 py-2 rounded-full bg-ink/5 text-ink font-medium text-sm">
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SynthesizeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const points = [
    { x: 50, y: 30 }, { x: 20, y: 50 }, { x: 80, y: 45 },
    { x: 35, y: 70 }, { x: 65, y: 75 }, { x: 50, y: 50 }
  ];

  return (
    <section ref={ref} className="min-h-screen py-40 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          {/* Content */}
          <div>
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-6"
            >
              02 — Synthesize
            </motion.span>
            
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[clamp(2rem,5vw,4rem)] font-bold text-ink mb-8 leading-[0.95]"
            >
              Ideas connect.
              <br />
              <span className="text-clay">Patterns emerge.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-stone leading-relaxed mb-10 max-w-lg"
            >
              Our AI connects today's thought with last week's insight. Context restored. Meaning revealed.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex items-center gap-4"
            >
              <div className="w-3 h-3 rounded-full bg-clay animate-pulse" />
              <span className="text-ink font-medium">AI-powered reflections, generated weekly</span>
            </motion.div>
          </div>

          {/* Visual - Connection web */}
          <div className="relative h-[400px]">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {points.map((p1, i) => 
                points.slice(i + 1).map((p2, j) => (
                  <motion.line
                    key={`${i}-${j}`}
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke="rgba(217, 93, 57, 0.3)"
                    strokeWidth="0.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.5, delay: 0.5 + (i + j) * 0.1 }}
                  />
                ))
              )}
              {points.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x} cy={p.y}
                  r={i === 5 ? 4 : 2}
                  fill={i === 5 ? "#D95D39" : "#1C1C1E"}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1, type: "spring" }}
                />
              ))}
            </svg>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-clay flex items-center justify-center"
            >
              <Brain className="text-sand" size={28} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  return (
    <section ref={ref} className="min-h-screen py-40 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          
          {/* Visual - Search mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative order-2 lg:order-1"
          >
            <div className="bg-sand-light rounded-3xl border border-ink/5 p-8 max-w-md mx-auto">
              <div className="flex items-center gap-4 p-4 bg-sand rounded-2xl mb-6 border border-ink/5">
                <Search className="text-stone" size={20} />
                <span className="text-ink font-medium">that idea about growth</span>
                <motion.div
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-0.5 h-5 bg-clay ml-auto"
                />
              </div>

              <div className="space-y-3">
                {['Marketing expansion thoughts', 'Q3 growth projections', 'Team scaling ideas'].map((result, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.8 + i * 0.15 }}
                    className="p-4 rounded-xl bg-sand hover:bg-sand-dark/20 transition-colors cursor-pointer border border-ink/5"
                  >
                    <p className="text-ink font-medium text-sm">{result}</p>
                    <p className="text-stone text-xs mt-1">Found by meaning, not keywords</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-14 h-14 rounded-2xl bg-clay flex items-center justify-center"
            >
              <Search className="text-sand" size={20} />
            </motion.div>
          </motion.div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-6"
            >
              03 — Discover
            </motion.span>
            
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[clamp(2rem,5vw,4rem)] font-bold text-ink mb-8 leading-[0.95]"
            >
              Search by meaning.
              <br />
              <span className="text-clay">Not keywords.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-stone leading-relaxed max-w-lg"
            >
              Find "that idea about growth" even if those exact words aren't in the note. Semantic search understands intent.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExportSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20%" });

  const exports = ['Obsidian', 'Notion', 'Tana', 'Markdown'];

  return (
    <section ref={ref} className="py-40 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[1200px] mx-auto text-center">
        
        <motion.span
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-block text-xs text-clay tracking-[0.3em] uppercase mb-6"
        >
          04 — Export
        </motion.span>
        
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[clamp(2rem,5vw,4rem)] font-bold text-ink mb-8 leading-[0.95]"
        >
          Your knowledge.
          <br />
          <span className="text-clay">Everywhere.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl text-stone leading-relaxed mb-16 max-w-2xl mx-auto"
        >
          One-click export to your favorite tools. Markdown, JSON, or PDF. Your insights flow wherever you need them.
        </motion.p>

        <div className="flex flex-wrap justify-center gap-6">
          {exports.map((exp, i) => (
            <motion.div
              key={exp}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="w-36 h-36 rounded-3xl bg-sand-light border border-ink/5 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-clay/30 transition-colors"
            >
              <Globe className="text-ink" size={28} />
              <span className="text-ink font-medium text-sm">{exp}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
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
        <h2 className="text-[clamp(2rem,5vw,4rem)] font-bold text-ink mb-8 leading-[0.95]">
          Ready to think <span className="text-clay">differently?</span>
        </h2>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-ink text-sand px-12 py-6 rounded-full font-semibold text-xl inline-flex items-center gap-3 group"
        >
          Start Free
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
        </motion.button>
      </motion.div>
    </section>
  );
}
