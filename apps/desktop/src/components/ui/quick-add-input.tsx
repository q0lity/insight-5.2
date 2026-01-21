"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Plus, Send, Mic, MicOff, Sparkles, X } from "lucide-react"

export interface QuickAddInputProps {
  placeholder?: string
  onSubmit?: (value: string) => void
  onVoiceToggle?: () => void
  isListening?: boolean
  interimTranscript?: string
  showNlpPreview?: boolean
  nlpPreview?: React.ReactNode
  loading?: boolean
  disabled?: boolean
  className?: string
  variant?: "default" | "compact" | "expanded"
  autoFocus?: boolean
}

const QuickAddInput = React.forwardRef<HTMLInputElement, QuickAddInputProps>(
  ({
    placeholder = "Quick add...",
    onSubmit,
    onVoiceToggle,
    isListening = false,
    interimTranscript,
    showNlpPreview = false,
    nlpPreview,
    loading = false,
    disabled = false,
    className,
    variant = "default",
    autoFocus = false,
  }, ref) => {
    const [value, setValue] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const combinedRef = (ref as React.RefObject<HTMLInputElement>) || inputRef

    const displayValue = value + (interimTranscript ? ` ${interimTranscript}` : "")
    const hasValue = displayValue.trim().length > 0

    const handleSubmit = (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!displayValue.trim() || loading || disabled) return
      onSubmit?.(displayValue.trim())
      setValue("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === "Escape") {
        setValue("")
        combinedRef.current?.blur()
      }
    }

    const isExpanded = isFocused || hasValue || variant === "expanded"

    return (
      <div className={cn("relative", className)}>
        <motion.form
          onSubmit={handleSubmit}
          animate={{
            scale: isFocused ? 1.02 : 1,
          }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn(
            "relative flex items-center gap-2 rounded-xl border-2 bg-background transition-all duration-200",
            variant === "compact" ? "px-2 py-1.5" : "px-3 py-2",
            disabled && "opacity-50 cursor-not-allowed",
            isFocused
              ? "border-accent ring-2 ring-accent/20 shadow-lg"
              : "border-border hover:border-accent/30",
            isListening && "border-red-400 ring-2 ring-red-400/20"
          )}
        >
          {/* Leading icon */}
          <motion.div
            animate={{
              rotate: isFocused ? 45 : 0,
              scale: isFocused ? 1.1 : 1,
            }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
          >
            <Plus
              className={cn(
                "h-4 w-4 transition-colors",
                isFocused ? "text-accent" : "text-muted-foreground"
              )}
            />
          </motion.div>

          {/* Input */}
          <input
            ref={combinedRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={cn(
              "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed",
              variant === "compact" ? "py-0.5" : "py-1"
            )}
          />

          {/* Interim transcript indicator */}
          <AnimatePresence>
            {interimTranscript && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-24 top-1/2 -translate-y-1/2"
              >
                <span className="text-xs text-muted-foreground animate-pulse">
                  ...{interimTranscript.slice(-20)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Voice button */}
            {onVoiceToggle && (
              <motion.button
                type="button"
                onClick={onVoiceToggle}
                disabled={disabled}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                  isListening
                    ? "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isListening ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </motion.button>
            )}

            {/* Clear button */}
            <AnimatePresence>
              {hasValue && (
                <motion.button
                  type="button"
                  onClick={() => setValue("")}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={!hasValue || loading || disabled}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                hasValue
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              whileHover={hasValue ? { scale: 1.1 } : undefined}
              whileTap={hasValue ? { scale: 0.9 } : undefined}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </motion.div>
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </motion.button>
          </div>
        </motion.form>

        {/* NLP Preview */}
        <AnimatePresence>
          {showNlpPreview && nlpPreview && hasValue && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="mt-2 overflow-hidden rounded-lg border bg-popover p-3 shadow-lg"
            >
              {nlpPreview}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
QuickAddInput.displayName = "QuickAddInput"

export { QuickAddInput }
