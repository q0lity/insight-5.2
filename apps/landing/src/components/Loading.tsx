'use client';

import { motion } from 'framer-motion';
import { shimmer, pulse, spin } from '@/lib/motion';
import { cn } from '@/lib/utils';

// ============================================================================
// SKELETON
// ============================================================================

interface SkeletonProps {
  className?: string;
  /** Width of the skeleton. Can be a Tailwind class or pixel value */
  width?: string;
  /** Height of the skeleton. Can be a Tailwind class or pixel value */
  height?: string;
  /** Make it circular */
  circle?: boolean;
}

/**
 * Skeleton loading placeholder with shimmer effect
 */
export function Skeleton({
  className,
  width = 'w-full',
  height = 'h-4',
  circle = false,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-ink/5',
        circle ? 'rounded-full' : 'rounded-lg',
        width,
        height,
        className
      )}
    >
      <motion.div
        variants={shimmer}
        initial="initial"
        animate="animate"
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
    </div>
  );
}

/**
 * Skeleton text lines
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="h-4"
          width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton card for content placeholders
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-sand-light border border-ink/5 p-6 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton width="w-12" height="h-12" circle />
        <div className="flex-1 space-y-2">
          <Skeleton height="h-4" width="w-1/3" />
          <Skeleton height="h-3" width="w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

// ============================================================================
// PULSE
// ============================================================================

interface PulseProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Pulse animation wrapper for loading states
 */
export function Pulse({ className, children }: PulseProps) {
  return (
    <motion.div
      variants={pulse}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Pulsing dot indicator
 */
export function PulseDot({
  size = 'md',
  color = 'clay',
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'clay' | 'ink' | 'stone';
}) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colors = {
    clay: 'bg-clay',
    ink: 'bg-ink',
    stone: 'bg-stone',
  };

  return (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
      className={cn('rounded-full', sizes[size], colors[color])}
    />
  );
}

// ============================================================================
// SPINNER
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'clay' | 'ink' | 'sand';
}

/**
 * Spinning loader indicator
 */
export function Spinner({
  size = 'md',
  className,
  color = 'clay',
}: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colors = {
    clay: 'border-clay',
    ink: 'border-ink',
    sand: 'border-sand',
  };

  return (
    <motion.div
      variants={spin}
      animate="animate"
      className={cn(
        'rounded-full border-2 border-t-transparent',
        sizes[size],
        colors[color],
        className
      )}
    />
  );
}

/**
 * Dots loading indicator (three bouncing dots)
 */
export function DotsLoader({
  size = 'md',
  color = 'clay',
}: {
  size?: 'sm' | 'md' | 'lg';
  color?: 'clay' | 'ink' | 'stone';
}) {
  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const colors = {
    clay: 'bg-clay',
    ink: 'bg-ink',
    stone: 'bg-stone',
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 0.6,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: i * 0.15,
          }}
          className={cn('rounded-full', sizes[size], colors[color])}
        />
      ))}
    </div>
  );
}

// ============================================================================
// FULL PAGE LOADER
// ============================================================================

/**
 * Full-page loading overlay
 */
export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sand"
    >
      <div className="flex flex-col items-center gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
          className="w-12 h-12 rounded-xl bg-clay flex items-center justify-center"
        >
          <span className="text-sand font-serif italic text-2xl">i</span>
        </motion.div>
        <DotsLoader />
      </div>
    </motion.div>
  );
}
