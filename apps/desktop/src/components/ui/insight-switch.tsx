import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const switchTrackVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      switchSize: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
        lg: "h-7 w-14",
      },
      state: {
        default: "data-[state=unchecked]:bg-input data-[state=checked]:bg-primary",
        success: "data-[state=unchecked]:bg-input data-[state=checked]:bg-green-500",
        warning: "data-[state=unchecked]:bg-input data-[state=checked]:bg-yellow-500",
        error: "data-[state=unchecked]:bg-input data-[state=checked]:bg-destructive",
      },
    },
    defaultVariants: {
      switchSize: "md",
      state: "default",
    },
  }
)

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
  {
    variants: {
      switchSize: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        md: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        lg: "h-6 w-6 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      switchSize: "md",
    },
  }
)

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
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

export interface InsightSwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof switchTrackVariants> {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  description?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  labelPosition?: "left" | "right"
}

const InsightSwitch = React.forwardRef<HTMLButtonElement, InsightSwitchProps>(
  (
    {
      className,
      containerClassName,
      switchSize = "md",
      state: stateProp,
      checked: controlledChecked,
      defaultChecked = false,
      onChange,
      label,
      description,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      id,
      disabled,
      labelPosition = "right",
      ...props
    },
    ref
  ) => {
    const switchId = id || React.useId()
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked)

    const isControlled = controlledChecked !== undefined
    const isChecked = isControlled ? controlledChecked : internalChecked

    // Determine state based on messages
    const state = errorMessage
      ? "error"
      : warningMessage
      ? "warning"
      : successMessage
      ? "success"
      : stateProp || "default"

    const statusMessage = errorMessage || warningMessage || successMessage

    const handleClick = () => {
      if (disabled) return

      const newValue = !isChecked
      if (!isControlled) {
        setInternalChecked(newValue)
      }
      onChange?.(newValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        handleClick()
      }
    }

    const switchElement = (
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={label}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          switchTrackVariants({ switchSize, state }),
          className
        )}
        data-state={isChecked ? "checked" : "unchecked"}
        {...props}
      >
        <span
          className={cn(switchThumbVariants({ switchSize }))}
          data-state={isChecked ? "checked" : "unchecked"}
        />
      </button>
    )

    const labelElement = (label || description) && (
      <div className="flex flex-col gap-0.5">
        {label && (
          <label
            htmlFor={switchId}
            className={cn(
              labelVariants({ state }),
              "cursor-pointer",
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )

    return (
      <div className={cn("flex flex-col gap-1", containerClassName)}>
        <div className="flex items-center gap-3">
          {labelPosition === "left" && labelElement}
          {switchElement}
          {labelPosition === "right" && labelElement}
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
InsightSwitch.displayName = "InsightSwitch"

export { InsightSwitch, switchTrackVariants }
