'use client';

import React, { useRef } from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Start capturing today",
    features: [
      "Unlimited capture",
      "Basic semantic search",
      "3 AI reflections/month",
      "Mobile + Desktop",
      "End-to-end encryption",
    ],
    cta: "Start Free",
    primary: false,
  },
  {
    name: "Pro",
    price: "14",
    description: "Full synthesis power",
    features: [
      "Everything in Free",
      "Unlimited AI reflections",
      "Priority processing",
      "Obsidian & Notion sync",
      "Bulk export (MD, JSON, PDF)",
      "Voice-to-synthesis engine",
    ],
    cta: "Go Pro",
    primary: true,
  },
];

const faqs = [
  {
    q: "Does Insight replace my current note app?",
    a: "Not necessarily. Insight is a 'pre-processor' for your thoughts. Export to Notion, Obsidian, or Tana."
  },
  {
    q: "How does the AI synthesis work?",
    a: "We analyze semantic connections between your notes over time, grouping them into 'Reflections' automatically."
  },
  {
    q: "Is my data secure?",
    a: "Yes. Your notes are encrypted at rest. We never use your data to train models."
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Export all your data before cancelling. You never lose your thoughts."
  },
];

export default function PricingPage() {
  return (
    <main className="relative bg-sand">
      <Navbar />
      <HeroSection />
      <PlansSection />
      <FAQSection />
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
        <span className="text-clay">Simple</span> pricing.
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-xl text-stone mt-6"
      >
        Start <span className="text-clay">free</span>. Upgrade when you're ready.
      </motion.p>
    </section>
  );
}

function PlansSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section ref={ref} className="py-20 px-8 md:px-16">
      <div className="max-w-[900px] mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 60 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className={`relative p-10 rounded-3xl transition-all border ${
                plan.primary 
                  ? 'border-clay bg-sand-light' 
                  : 'border-ink/5 bg-sand-light'
              }`}
            >
              {/* Recommended badge */}
              {plan.primary && (
                <div className="absolute -top-3 left-8 bg-clay text-sand px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide">
                  RECOMMENDED
                </div>
              )}

              {/* Plan name */}
              <p className={`text-xs tracking-[0.2em] uppercase mb-8 ${plan.primary ? 'text-clay' : 'text-stone'}`}>
                {plan.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-sm text-stone">$</span>
                <span className={`text-6xl font-bold tracking-tight ${plan.primary ? 'text-clay' : 'text-ink'}`}>
                  {plan.price}
                </span>
                <span className="text-stone">/mo</span>
              </div>
              <p className="mb-10 text-sm text-stone">
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: index * 0.1 + i * 0.05 + 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <Check size={16} className="text-clay" strokeWidth={3} />
                    <span className="text-sm text-ink">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 ${
                  plan.primary 
                    ? 'bg-clay text-sand' 
                    : 'bg-ink text-sand'
                }`}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-8 mt-12"
        >
          {['No credit card', 'Cancel anytime', '30-day refund'].map((text, i) => (
            <span key={i} className="text-stone text-xs tracking-wide">
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <section ref={ref} className="py-32 px-8 md:px-16 border-t border-ink/5">
      <div className="max-w-[700px] mx-auto">
        
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-3xl font-bold text-ink mb-16"
        >
          <span className="text-clay">Questions</span>
        </motion.h2>

        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="border-b border-ink/5 pb-8"
            >
              <h3 className="text-ink font-semibold mb-3">{faq.q}</h3>
              <p className="text-stone text-sm leading-relaxed">{faq.a}</p>
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
          Ready to <span className="text-clay">start</span>?
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
