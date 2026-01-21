"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: "sm" | "default" | "lg"
  label?: string
  description?: string
  indeterminate?: boolean
}

const sizeConfig = {
  sm: {
    box: "h-4 w-4",
    icon: "h-2.5 w-2.5",
    label: "text-sm",
    description: "text-xs",
  },
  default: {
    box: "h-5 w-5",
    icon: "h-3 w-3",
    label: "text-sm",
    description: "text-xs",
  },
  lg: {
    box: "h-6 w-6",
    icon: "h-4 w-4",
    label: "text-base",
    description: "text-sm",
  },
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({
    checked = false,
    onCheckedChange,
    disabled = false,
    className,
    size = "default",
    label,
    description,
    indeterminate = false,
  }, ref) => {
    const config = sizeConfig[size]

    const handleClick = () => {
      if (!disabled) {
        onCheckedChange?.(!checked)
      }
    }

    const checkboxElement = (
      <motion.button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border-2",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          config.box,
          (checked || indeterminate)
            ? "border-accent bg-accent"
            : "border-input bg-background hover:border-accent/50",
          className
        )}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        whileHover={disabled ? undefined : { scale: 1.05 }}
      >
        {/* Check mark */}
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(config.icon, "text-accent-foreground")}
          initial={false}
          animate={{
            scale: checked && !indeterminate ? 1 : 0,
            opacity: checked && !indeterminate ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        >
          <motion.path
            d="M5 12l5 5L20 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: checked && !indeterminate ? 1 : 0 }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          />
        </motion.svg>

        {/* Indeterminate dash */}
        <motion.div
          className={cn("absolute bg-accent-foreground rounded-full", "h-0.5")}
          style={{ width: "60%" }}
          initial={false}
          animate={{
            scaleX: indeterminate ? 1 : 0,
            opacity: indeterminate ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />

        {/* Ripple effect on check */}
        {(checked || indeterminate) && (
          <motion.div
            className="absolute inset-0 rounded-md bg-accent"
            initial={{ scale: 0.5, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.button>
    )

    if (label || description) {
      return (
        <div
          className={cn(
            "flex items-start gap-3 cursor-pointer",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onClick={disabled ? undefined : handleClick}
        >
          {checkboxElement}
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className={cn("font-medium text-foreground select-none", config.label)}>
                {label}
              </span>
            )}
            {description && (
              <span className={cn("text-muted-foreground select-none", config.description)}>
                {description}
              </span>
            )}
          </div>
        </div>
      )
    }

    return checkboxElement
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
