"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: "sm" | "default" | "lg"
  label?: string
  description?: string
}

const sizeConfig = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-4 w-4",
    translateX: 16,
    iconSize: "h-2.5 w-2.5",
  },
  default: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    translateX: 20,
    iconSize: "h-3 w-3",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "h-6 w-6",
    translateX: 28,
    iconSize: "h-3.5 w-3.5",
  },
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({
    checked = false,
    onCheckedChange,
    disabled = false,
    className,
    size = "default",
    label,
    description,
  }, ref) => {
    const config = sizeConfig[size]

    const handleClick = () => {
      if (!disabled) {
        onCheckedChange?.(!checked)
      }
    }

    const switchElement = (
      <motion.button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          config.track,
          checked ? "bg-accent" : "bg-input",
          className
        )}
        whileTap={disabled ? undefined : { scale: 0.95 }}
      >
        <motion.span
          className={cn(
            "pointer-events-none flex items-center justify-center rounded-full bg-background shadow-lg",
            config.thumb
          )}
          initial={false}
          animate={{
            x: checked ? config.translateX : 0,
            scale: checked ? 1 : 0.9,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        >
          {/* Check icon animation */}
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(config.iconSize, "text-accent")}
            initial={false}
            animate={{
              scale: checked ? 1 : 0,
              opacity: checked ? 1 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              delay: checked ? 0.1 : 0,
            }}
          >
            <motion.path
              d="M5 12l5 5L20 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: checked ? 1 : 0 }}
              transition={{
                duration: 0.2,
                delay: checked ? 0.15 : 0,
              }}
            />
          </motion.svg>
        </motion.span>
      </motion.button>
    )

    if (label || description) {
      return (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
          {switchElement}
        </div>
      )
    }

    return switchElement
  }
)
Switch.displayName = "Switch"

export { Switch }
