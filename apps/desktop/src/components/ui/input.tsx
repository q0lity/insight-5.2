"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, X, AlertCircle } from "lucide-react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  hint?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  onClear?: () => void
  containerClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    label,
    error,
    success,
    hint,
    prefix,
    suffix,
    onClear,
    containerClassName,
    value,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasShaken, setHasShaken] = React.useState(false)

    // Trigger shake on error
    React.useEffect(() => {
      if (error && !hasShaken) {
        setHasShaken(true)
        const timer = setTimeout(() => setHasShaken(false), 500)
        return () => clearTimeout(timer)
      }
    }, [error, hasShaken])

    const showClear = onClear && value && String(value).length > 0

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            className={cn(
              "text-sm font-semibold transition-colors duration-200",
              error ? "text-destructive" : isFocused ? "text-accent" : "text-foreground"
            )}
          >
            {label}
          </label>
        )}
        <motion.div
          animate={hasShaken ? {
            x: [0, -8, 8, -6, 6, -4, 4, 0],
            transition: { duration: 0.4 }
          } : {}}
          className={cn(
            "relative flex items-center rounded-lg border-2 bg-background transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-offset-background",
            error
              ? "border-destructive focus-within:ring-destructive/30"
              : success
              ? "border-emerald-500 focus-within:ring-emerald-500/30"
              : "border-border focus-within:border-accent focus-within:ring-accent/30",
            isFocused && !error && !success && "shadow-[0_0_0_3px_var(--accent)/0.15]"
          )}
        >
          {prefix && (
            <div className="flex items-center pl-3 text-muted-foreground">
              {prefix}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full bg-transparent px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              prefix && "pl-2",
              (suffix || showClear || success) && "pr-2",
              className
            )}
            ref={ref}
            value={value}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
          <AnimatePresence mode="wait">
            {success && !suffix && !showClear && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="flex items-center pr-3"
              >
                <Check className="h-4 w-4 text-emerald-500" />
              </motion.div>
            )}
            {error && !suffix && !showClear && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="flex items-center pr-3"
              >
                <AlertCircle className="h-4 w-4 text-destructive" />
              </motion.div>
            )}
            {showClear && !suffix && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onClear}
                className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
          {suffix && (
            <div className="flex items-center pr-3 text-muted-foreground">
              {suffix}
            </div>
          )}
        </motion.div>
        <AnimatePresence mode="wait">
          {(error || hint) && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "text-xs",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {error || hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
