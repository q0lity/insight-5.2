'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Spinner } from './Loading';
import { forwardRef, ReactNode } from 'react';

// ============================================================================
// BUTTON
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-sand hover:shadow-xl',
  secondary: 'bg-clay text-sand hover:shadow-lg',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  outline: 'bg-transparent text-ink border-2 border-ink/10 hover:border-ink/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-3 text-base gap-2',
  lg: 'px-10 py-5 text-lg gap-3',
};

/**
 * Animated button with scale tap effect
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'right',
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={spring}
        disabled={isDisabled}
        className={cn(
          'relative inline-flex items-center justify-center font-semibold rounded-full transition-all',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-60 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-inherit"
          >
            <Spinner
              size={size === 'lg' ? 'md' : 'sm'}
              color={variant === 'primary' || variant === 'secondary' ? 'sand' : 'ink'}
            />
          </motion.div>
        )}

        {/* Content */}
        <span
          className={cn(
            'inline-flex items-center',
            sizeStyles[size].split(' ').find((s) => s.startsWith('gap')),
            loading && 'opacity-0'
          )}
        >
          {icon && iconPosition === 'left' && (
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: -2 }}
              transition={spring}
            >
              {icon}
            </motion.span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <motion.span
              className="inline-block"
              initial={{ x: 0 }}
              whileHover={{ x: 4 }}
              transition={spring}
            >
              {icon}
            </motion.span>
          )}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// ICON BUTTON
// ============================================================================

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
  children: ReactNode;
}

const iconButtonSizes: Record<string, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', variant = 'default', disabled, className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.1 }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        transition={spring}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-xl transition-colors',
          iconButtonSizes[size],
          variant === 'default'
            ? 'bg-ink/5 hover:bg-ink/10 text-ink'
            : 'hover:bg-ink/5 text-stone hover:text-ink',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ============================================================================
// LINK BUTTON (text button with underline animation)
// ============================================================================

interface LinkButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  icon?: ReactNode;
}

export const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>(
  ({ children, icon, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover="hover"
        className={cn(
          'relative inline-flex items-center gap-2 text-ink font-medium group',
          className
        )}
        {...props}
      >
        <span className="relative">
          {children}
          <motion.span
            className="absolute bottom-0 left-0 right-0 h-px bg-clay origin-left"
            initial={{ scaleX: 0 }}
            variants={{
              hover: { scaleX: 1 },
            }}
            transition={{ duration: 0.3 }}
          />
        </span>
        {icon && (
          <motion.span
            variants={{
              hover: { x: 4 },
            }}
            transition={spring}
          >
            {icon}
          </motion.span>
        )}
      </motion.button>
    );
  }
);

LinkButton.displayName = 'LinkButton';
