'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { toastSlide, toastSlideTop, checkDraw, easeOut } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================================
// CHECKMARK ANIMATION
// ============================================================================

interface CheckmarkProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  animate?: boolean;
}

/**
 * Animated checkmark with draw effect
 */
export function Checkmark({
  size = 24,
  strokeWidth = 3,
  color = 'currentColor',
  className,
  animate = true,
}: CheckmarkProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      transition={{ duration: 0.3, ease: easeOut }}
    >
      <motion.path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={checkDraw}
        initial={animate ? 'hidden' : 'visible'}
        animate="visible"
      />
    </motion.svg>
  );
}

/**
 * Success checkmark in a circle
 */
export function CheckmarkCircle({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 15,
      }}
      className={cn(
        'rounded-full bg-green-500 flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Checkmark
        size={size * 0.5}
        strokeWidth={4}
        color="white"
        animate
      />
    </motion.div>
  );
}

// ============================================================================
// TOAST SYSTEM
// ============================================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const toastIcons: Record<ToastType, typeof Check> = {
  success: Check,
  error: X,
  warning: AlertCircle,
  info: Info,
};

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const Icon = toastIcons[toast.type];

  return (
    <motion.div
      layout
      variants={toastSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-ink text-sand rounded-2xl p-4 shadow-xl flex items-start gap-3 min-w-[280px]"
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          toastStyles[toast.type]
        )}
      >
        <Icon size={16} className="text-white" strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-sand/70 text-xs mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-sand/50 hover:text-sand transition-colors p-1"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

// ============================================================================
// SUCCESS CELEBRATION
// ============================================================================

/**
 * Confetti-like particle burst for celebrations
 */
export function SuccessBurst({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const particles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    angle: (i * 360) / 12,
    delay: Math.random() * 0.1,
    color: i % 2 === 0 ? '#D95D39' : '#1C1C1E',
  }));

  return (
    <div className="relative w-16 h-16">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            scale: 0,
            x: 0,
            y: 0,
            opacity: 1,
          }}
          animate={{
            scale: [0, 1, 0],
            x: Math.cos((particle.angle * Math.PI) / 180) * 40,
            y: Math.sin((particle.angle * Math.PI) / 180) * 40,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 0.6,
            delay: particle.delay,
            ease: easeOut,
          }}
          onAnimationComplete={particle.id === 0 ? onComplete : undefined}
          className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: particle.color }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: easeOut }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <CheckmarkCircle size={40} />
      </motion.div>
    </div>
  );
}

// ============================================================================
// INLINE SUCCESS INDICATOR
// ============================================================================

/**
 * Small inline success indicator (e.g., for form fields)
 */
export function InlineSuccess({
  show,
  message,
}: {
  show: boolean;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="flex items-center gap-2 text-green-600 text-sm mt-2"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <Check size={14} strokeWidth={3} />
          </motion.div>
          {message && <span>{message}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Small inline error indicator
 */
export function InlineError({
  show,
  message,
}: {
  show: boolean;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="flex items-center gap-2 text-red-600 text-sm mt-2"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <AlertCircle size={14} strokeWidth={3} />
          </motion.div>
          {message && <span>{message}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
