import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const stepperContainerVariants = cva(
  "inline-flex items-center rounded-md border transition-all focus-within:ring-2",
  {
    variants: {
      variant: {
        default: "border-input bg-transparent focus-within:ring-ring focus-within:border-transparent",
        filled: "border-transparent bg-secondary focus-within:ring-ring",
        outline: "border-input bg-background focus-within:ring-ring",
      },
      stepperSize: {
        sm: "h-8",
        md: "h-10",
        lg: "h-12",
      },
      state: {
        default: "",
        success: "border-green-500 focus-within:ring-green-500/30",
        warning: "border-yellow-500 focus-within:ring-yellow-500/30",
        error: "border-destructive focus-within:ring-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
      stepperSize: "md",
      state: "default",
    },
  }
)

const stepperButtonVariants = cva(
  "flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/50 active:bg-accent focus:outline-none",
  {
    variants: {
      stepperSize: {
        sm: "w-7 text-xs",
        md: "w-9 text-sm",
        lg: "w-11 text-base",
      },
    },
    defaultVariants: {
      stepperSize: "md",
    },
  }
)

const labelVariants = cva(
  "text-sm font-medium leading-none",
  {
    variants: {
      state: {
        default: "text-foreground",
        success: "text-green-600",
        warning: "text-yellow-600",
        error: "text-destructive",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
)

const MinusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export interface InsightStepperProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof stepperContainerVariants> {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  disabled?: boolean
  precision?: number
  formatValue?: (value: number) => string
  parseValue?: (value: string) => number
  allowDirectInput?: boolean
}

const InsightStepper = React.forwardRef<HTMLDivElement, InsightStepperProps>(
  (
    {
      className,
      containerClassName,
      variant,
      stepperSize = "md",
      state: stateProp,
      value: controlledValue,
      defaultValue = 0,
      min = -Infinity,
      max = Infinity,
      step = 1,
      onChange,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      disabled = false,
      precision,
      formatValue,
      parseValue,
      allowDirectInput = true,
      id,
      ...props
    },
    ref
  ) => {
    const stepperId = id || React.useId()
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const [inputValue, setInputValue] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : internalValue

    // Determine state based on messages
    const state = errorMessage
      ? "error"
      : warningMessage
      ? "warning"
      : successMessage
      ? "success"
      : stateProp || "default"

    const statusMessage = errorMessage || warningMessage || successMessage

    const formatDisplayValue = React.useCallback(
      (val: number): string => {
        if (formatValue) return formatValue(val)
        if (precision !== undefined) return val.toFixed(precision)
        return String(val)
      },
      [formatValue, precision]
    )

    const parseInputValue = React.useCallback(
      (val: string): number => {
        if (parseValue) return parseValue(val)
        const parsed = parseFloat(val)
        return isNaN(parsed) ? currentValue : parsed
      },
      [parseValue, currentValue]
    )

    const clampValue = React.useCallback(
      (val: number): number => {
        let clamped = Math.max(min, Math.min(max, val))
        if (precision !== undefined) {
          clamped = parseFloat(clamped.toFixed(precision))
        }
        return clamped
      },
      [min, max, precision]
    )

    const updateValue = React.useCallback(
      (newValue: number) => {
        const clamped = clampValue(newValue)
        if (!isControlled) {
          setInternalValue(clamped)
        }
        onChange?.(clamped)
      },
      [clampValue, isControlled, onChange]
    )

    const handleIncrement = () => {
      if (disabled) return
      updateValue(currentValue + step)
    }

    const handleDecrement = () => {
      if (disabled) return
      updateValue(currentValue - step)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
    }

    const handleInputFocus = () => {
      setIsFocused(true)
      setInputValue(formatDisplayValue(currentValue))
    }

    const handleInputBlur = () => {
      setIsFocused(false)
      const parsed = parseInputValue(inputValue)
      updateValue(parsed)
      setInputValue("")
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          handleIncrement()
          break
        case "ArrowDown":
          e.preventDefault()
          handleDecrement()
          break
        case "Enter":
          e.preventDefault()
          inputRef.current?.blur()
          break
        case "Escape":
          e.preventDefault()
          setInputValue("")
          setIsFocused(false)
          inputRef.current?.blur()
          break
      }
    }

    const canDecrement = currentValue > min
    const canIncrement = currentValue < max

    const inputWidth = stepperSize === "sm" ? "w-12" : stepperSize === "lg" ? "w-20" : "w-16"
    const fontSize = stepperSize === "sm" ? "text-xs" : stepperSize === "lg" ? "text-base" : "text-sm"

    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5", containerClassName)} {...props}>
        {label && (
          <label
            htmlFor={stepperId}
            className={cn(labelVariants({ state }))}
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            stepperContainerVariants({ variant, stepperSize, state }),
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || !canDecrement}
            className={cn(
              stepperButtonVariants({ stepperSize }),
              "rounded-l-md border-r border-input h-full"
            )}
            aria-label="Decrease value"
            tabIndex={-1}
          >
            <MinusIcon />
          </button>
          <input
            ref={inputRef}
            id={stepperId}
            type="text"
            inputMode="decimal"
            value={isFocused ? inputValue : formatDisplayValue(currentValue)}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled || !allowDirectInput}
            className={cn(
              "bg-transparent border-0 text-center outline-none h-full",
              inputWidth,
              fontSize,
              !allowDirectInput && "cursor-default"
            )}
            aria-valuenow={currentValue}
            aria-valuemin={min !== -Infinity ? min : undefined}
            aria-valuemax={max !== Infinity ? max : undefined}
            aria-label={label}
          />
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || !canIncrement}
            className={cn(
              stepperButtonVariants({ stepperSize }),
              "rounded-r-md border-l border-input h-full"
            )}
            aria-label="Increase value"
            tabIndex={-1}
          >
            <PlusIcon />
          </button>
        </div>
        {(helperText || statusMessage) && (
          <p
            className={cn(
              "text-xs",
              state === "error" && "text-destructive",
              state === "warning" && "text-yellow-600",
              state === "success" && "text-green-600",
              state === "default" && "text-muted-foreground"
            )}
          >
            {statusMessage || helperText}
          </p>
        )}
      </div>
    )
  }
)
InsightStepper.displayName = "InsightStepper"

export { InsightStepper, stepperContainerVariants }
