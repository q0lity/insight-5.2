'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { easeOut } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { forwardRef, useState, InputHTMLAttributes } from 'react';
import { Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

// ============================================================================
// ANIMATED INPUT
// ============================================================================

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated input with focus ring expand effect
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, className, size = 'md', type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const sizes = {
      sm: 'py-2 text-sm',
      md: 'py-4 text-lg',
      lg: 'py-5 text-xl',
    };

    return (
      <div className={cn('relative', className)}>
        {/* Label */}
        {label && (
          <motion.label
            initial={false}
            animate={{
              color: isFocused ? '#D95D39' : '#6B6B6B',
            }}
            className="block text-xs tracking-wide uppercase mb-3 transition-colors"
          >
            {label}
          </motion.label>
        )}

        {/* Input container */}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-0 bg-transparent border-b-2 border-ink/10 text-ink outline-none transition-colors placeholder:text-stone/40',
              isFocused && 'border-transparent',
              error && 'border-red-500/50',
              success && 'border-green-500/50',
              sizes[size],
              isPassword && 'pr-10'
            )}
            {...props}
          />

          {/* Animated focus border */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-clay origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isFocused ? 1 : 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
          />

          {/* Focus ring glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-lg"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: isFocused ? 0.05 : 0,
              scale: isFocused ? 1.02 : 1,
            }}
            transition={{ duration: 0.2, ease: easeOut }}
            style={{
              background: 'linear-gradient(180deg, transparent 90%, rgba(217, 93, 57, 0.1) 100%)',
            }}
          />

          {/* Password toggle */}
          {isPassword && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-stone hover:text-ink transition-colors p-2"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </motion.button>
          )}

          {/* Success/Error icons */}
          <AnimatePresence>
            {(success || error) && !isPassword && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-0 top-1/2 -translate-y-1/2"
              >
                {success && <Check className="text-green-500" size={18} />}
                {error && <AlertCircle className="text-red-500" size={18} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error/Success message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="text-red-500 text-xs mt-2"
            >
              {error}
            </motion.p>
          )}
          {success && !error && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="text-green-500 text-xs mt-2"
            >
              {success}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// ANIMATED TEXTAREA
// ============================================================================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, success, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className={cn('relative', className)}>
        {/* Label */}
        {label && (
          <motion.label
            initial={false}
            animate={{
              color: isFocused ? '#D95D39' : '#6B6B6B',
            }}
            className="block text-xs tracking-wide uppercase mb-3 transition-colors"
          >
            {label}
          </motion.label>
        )}

        {/* Textarea container */}
        <div className="relative">
          <textarea
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-4 py-3 bg-sand-light rounded-xl border-2 border-ink/10 text-ink outline-none transition-colors placeholder:text-stone/40 resize-none min-h-[120px]',
              isFocused && 'border-clay/50',
              error && 'border-red-500/50',
              success && 'border-green-500/50'
            )}
            {...props}
          />

          {/* Focus ring */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: isFocused ? 1 : 0,
              scale: isFocused ? 1 : 0.98,
            }}
            transition={{ duration: 0.2, ease: easeOut }}
            style={{
              boxShadow: '0 0 0 3px rgba(217, 93, 57, 0.1)',
            }}
          />
        </div>

        {/* Error/Success message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-red-500 text-xs mt-2"
            >
              {error}
            </motion.p>
          )}
          {success && !error && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-green-500 text-xs mt-2"
            >
              {success}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================================================
// ANIMATED CHECKBOX
// ============================================================================

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked = false,
  onChange,
  label,
  disabled,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.div
        whileTap={disabled ? undefined : { scale: 0.9 }}
        className="relative"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <motion.div
          initial={false}
          animate={{
            backgroundColor: checked ? '#D95D39' : 'transparent',
            borderColor: checked ? '#D95D39' : '#D1D1D6',
          }}
          className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
        >
          <AnimatePresence>
            {checked && (
              <motion.svg
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <motion.path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      {label && <span className="text-ink text-sm">{label}</span>}
    </label>
  );
}

// ============================================================================
// ANIMATED TOGGLE
// ============================================================================

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({
  checked = false,
  onChange,
  label,
  disabled,
}: ToggleProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        className="relative w-11 h-6 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
        style={{
          backgroundColor: checked ? '#D95D39' : '#D1D1D6',
        }}
      >
        <motion.div
          initial={false}
          animate={{
            x: checked ? 22 : 2,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </motion.button>
      {label && <span className="text-ink text-sm">{label}</span>}
    </label>
  );
}
