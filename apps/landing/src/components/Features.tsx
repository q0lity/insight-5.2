'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Mic, Brain, Search, Globe } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: "Capture",
    subtitle: "Zero friction",
    description: "Voice or text. 2 seconds or 20 minutes. No folders, no tags, just capture.",
  },
  {
    icon: Brain,
    title: "Synthesize",
    subtitle: "AI-powered",
    description: "Reflections engine connects ideas across time. Context restored automatically.",
  },
  {
    icon: Search,
    title: "Discover",
    subtitle: "Semantic search",
    description: "Find by meaning, not keywords. 'That idea about growth' works.",
  },
  {
    icon: Globe,
    title: "Export",
    subtitle: "Universal sync",
    description: "One-click to Obsidian, Notion, or Tana. Your knowledge, everywhere.",
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1] 
      }}
      className="group"
    >
      <div className="py-12 border-t border-ink/10 transition-colors hover:border-clay/30">
        {/* Number + Icon row */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-mono text-stone/40">0{index + 1}</span>
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center group-hover:bg-clay/10 transition-colors"
          >
            <Icon className="text-ink group-hover:text-clay transition-colors" size={22} />
          </motion.div>
        </div>

        {/* Title */}
        <h3 className="text-4xl md:text-5xl font-semibold text-ink mb-2 tracking-tight">
          {feature.title}
        </h3>
        <p className="text-clay font-medium mb-6">{feature.subtitle}</p>

        {/* Description with reveal line */}
        <div className="relative">
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: index * 0.15 + 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -left-4 top-0 bottom-0 w-px bg-clay/30 origin-top"
          />
          <p className="text-lg text-stone leading-relaxed pl-6">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export const Features = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={containerRef} className="py-40 px-8 md:px-16 relative">
      {/* Vertical progress line */}
      <motion.div 
        style={{ height: lineHeight }}
        className="absolute left-8 md:left-16 top-40 w-px bg-clay/20 origin-top hidden lg:block"
      />

      <div className="max-w-[1400px] mx-auto">
        {/* Section header - minimal */}
        <div className="mb-24 max-w-2xl">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-mono text-clay text-xs block mb-6"
          >
            Features
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-display text-[clamp(2.5rem,5vw,4rem)] text-ink mb-6"
          >
            Your brain, amplified.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl text-stone"
          >
            Four pillars. One seamless experience.
          </motion.p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-0">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
