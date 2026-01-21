/**
 * Framer Motion Presets
 *
 * Reusable animation configurations for consistent motion throughout the app.
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// TIMING & EASING
// ============================================================================

/** Premium ease curve - Apple-like smooth deceleration */
export const easeOut = [0.16, 1, 0.3, 1] as const;

/** Standard spring for interactive elements */
export const spring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

/** Soft spring for larger movements */
export const springSoft = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
};

/** Bouncy spring for playful interactions */
export const springBouncy = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 15,
};

// ============================================================================
// BASIC TRANSITIONS
// ============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: easeOut },
  },
};

export const slideUp: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
  exit: {
    y: '100%',
    transition: { duration: 0.3, ease: easeOut },
  },
};

export const slideDown: Variants = {
  hidden: { y: '-100%' },
  visible: {
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
  exit: {
    y: '-100%',
    transition: { duration: 0.3, ease: easeOut },
  },
};

// ============================================================================
// PAGE TRANSITIONS
// ============================================================================

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.3, ease: easeOut },
  },
};

export const pageFade: Variants = {
  initial: { opacity: 0 },
  enter: {
    opacity: 1,
    transition: { duration: 0.4, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.25 },
  },
};

// ============================================================================
// STAGGER CONTAINERS
// ============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

// ============================================================================
// MICRO-INTERACTIONS
// ============================================================================

/** Button tap - subtle scale down */
export const tapScale = {
  whileTap: { scale: 0.98 },
};

/** Button hover - subtle scale up */
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

/** Card hover - lift effect */
export const cardHover = {
  whileHover: {
    y: -4,
    transition: { duration: 0.2, ease: easeOut },
  },
};

/** Card hover - larger lift */
export const cardHoverLarge = {
  whileHover: {
    y: -8,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.3, ease: easeOut },
  },
};

/** Icon rotate on hover */
export const iconRotate = {
  whileHover: {
    rotate: 15,
    scale: 1.1,
    transition: spring,
  },
};

/** Link underline expand */
export const linkUnderline: Variants = {
  initial: { scaleX: 0, originX: 0 },
  hover: {
    scaleX: 1,
    transition: { duration: 0.3, ease: easeOut },
  },
};

// ============================================================================
// LOADING & FEEDBACK
// ============================================================================

/** Skeleton shimmer effect */
export const shimmer: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

/** Pulse animation */
export const pulse: Variants = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
};

/** Spinner rotation */
export const spin: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

/** Success checkmark draw */
export const checkDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.4, ease: easeOut },
      opacity: { duration: 0.2 },
    },
  },
};

/** Toast slide in from bottom */
export const toastSlide: Variants = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

/** Toast slide in from top */
export const toastSlideTop: Variants = {
  initial: { opacity: 0, y: -50, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ============================================================================
// INPUT FOCUS
// ============================================================================

/** Focus ring expand */
export const focusRing: Variants = {
  rest: { scale: 1, opacity: 0 },
  focus: {
    scale: 1.02,
    opacity: 1,
    transition: { duration: 0.2, ease: easeOut },
  },
};

/** Input border highlight */
export const inputBorder: Variants = {
  rest: { scaleX: 0, originX: 0 },
  focus: {
    scaleX: 1,
    transition: { duration: 0.3, ease: easeOut },
  },
};

// ============================================================================
// LINE/PROGRESS REVEALS
// ============================================================================

export const lineReveal: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, ease: easeOut },
  },
};

export const lineRevealVertical: Variants = {
  hidden: { scaleY: 0, originY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 0.8, ease: easeOut },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate stagger delay for child elements
 * @param index - Child index
 * @param baseDelay - Initial delay before stagger starts
 * @param staggerDelay - Delay between each child
 */
export const staggerDelay = (
  index: number,
  baseDelay = 0.1,
  staggerDelay = 0.1
): Transition => ({
  delay: baseDelay + index * staggerDelay,
  duration: 0.5,
  ease: easeOut,
});

/**
 * Create viewport-triggered animation props
 */
export const viewportAnimation = (
  variants: Variants,
  margin = '-100px'
) => ({
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, margin },
  variants,
});
