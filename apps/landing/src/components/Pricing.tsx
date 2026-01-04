'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Start capturing today",
    features: [
      "Unlimited capture",
      "Basic search",
      "3 AI reflections/mo",
      "Mobile + Desktop",
    ],
    cta: "Start Free",
    primary: false,
  },
  {
    name: "Pro",
    price: "$14",
    description: "Full synthesis power",
    features: [
      "Everything in Free",
      "Unlimited reflections",
      "Priority processing",
      "Obsidian & Notion sync",
      "Bulk export",
    ],
    cta: "Go Pro",
    primary: true,
  },
];

export const Pricing = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-40 px-8 md:px-16">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Header */}
        <div className="text-center mb-20">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="text-mono text-clay text-xs block mb-6"
          >
            Pricing
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-display text-[clamp(2.5rem,5vw,4rem)] text-ink mb-4"
          >
            Simple pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl text-stone"
          >
            Start free. Upgrade when ready.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 60 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1] 
              }}
              whileHover={{ y: -8 }}
              className={`relative p-10 rounded-3xl transition-shadow ${
                plan.primary 
                  ? 'bg-ink text-white shadow-2xl' 
                  : 'bg-white/60 border border-ink/10'
              }`}
            >
              {/* Plan name */}
              <p className={`text-mono text-xs mb-6 ${plan.primary ? 'text-clay' : 'text-stone'}`}>
                {plan.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-semibold tracking-tight">{plan.price}</span>
                <span className={plan.primary ? 'text-white/50' : 'text-stone'}>/mo</span>
              </div>
              <p className={`mb-10 ${plan.primary ? 'text-white/60' : 'text-stone'}`}>
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-4 mb-10">
                {plan.features.map((feature, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: index * 0.15 + i * 0.05 + 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <Check 
                      size={16} 
                      className={plan.primary ? 'text-clay' : 'text-clay'} 
                      strokeWidth={3}
                    />
                    <span className={plan.primary ? 'text-white/80' : 'text-ink'}>{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA */}
              <Link href="/signup" className="block w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
                    plan.primary
                      ? 'bg-clay text-white hover:shadow-lg'
                      : 'bg-ink text-sand hover:shadow-lg'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={18} />
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Trust line */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-8 mt-16"
        >
          {['No credit card required', 'Cancel anytime'].map((text, i) => (
            <span key={i} className="text-sm text-stone flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-clay/40" />
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
