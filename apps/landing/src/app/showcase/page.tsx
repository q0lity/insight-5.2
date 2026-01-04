'use client';

import React from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from 'framer-motion';

const screenshots = [
  { url: "/assets/ui-insight.png", title: "Intelligent Dashboard", desc: "Your command center for chaotic thoughts and synthesized reflections." },
  { url: "/assets/reflection-view.png", title: "Reflection View", desc: "Thematic AI briefs that connect your thoughts across days and weeks." },
  { url: "/assets/capture-interface.png", title: "Zero-Friction Capture", desc: "Minimalist, distraction-free interface for instant thought dumping." },
  { url: "/assets/settings-view.png", title: "Dynamic Settings", desc: "Customize your reflection schedule and notification preferences." },
  { url: "/assets/history-view.png", title: "Thought Archive", desc: "A searchable, structured history of everything you've ever captured." },
  { url: "/assets/dark-mode.png", title: "OLED Dark Mode", desc: "True black background for focused deep-thinking sessions at night." },
];

export default function ShowcasePage() {
  return (
    <main className="animated-bg">
      <Navbar />
      
      <section className="pt-48 pb-32 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-clay font-black uppercase tracking-[0.2em] text-sm mb-6"
          >
            Visual Showcase
          </motion.div>
          <h1 className="text-6xl md:text-8xl font-black text-ink mb-10 leading-[0.9]">
            The interface of <br />
            <span className="text-clay-gradient">clarity.</span>
          </h1>
          <p className="text-2xl text-stone max-w-3xl mx-auto leading-relaxed font-medium">
            Take a deep dive into how Insight transforms chaotic notes into organized wisdom.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-20">
          {screenshots.map((shot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="relative aspect-[16/10] glass rounded-[48px] overflow-hidden mb-10 border border-white/40 shadow-2xl group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all duration-700">
                <div className="absolute inset-0 bg-ink/5 group-hover:bg-transparent transition-colors duration-700" />
                <img 
                  src={shot.url} 
                  alt={shot.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-1000 ease-out"
                />
              </div>
              <h3 className="text-3xl font-black text-ink mb-4 tracking-tight">{shot.title}</h3>
              <p className="text-xl text-stone leading-relaxed font-medium">{shot.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}