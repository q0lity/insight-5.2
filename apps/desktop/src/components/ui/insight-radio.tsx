import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const radioVariants = cva(
  "peer shrink-0 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
  {
    variants: {
      radioSize: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },
      state: {
        default: "border-input data-[state=checked]:border-primary",
        success: "border-green-500",
        warning: "border-yellow-500",
        error: "border-destructive",
      },
    },
    defaultVariants: {
      radioSize: "md",
      state: "default",
    },
  }
)

const dotVariants = cva(
  "absolute rounded-full bg-primary transition-transform scale-0 data-[state=checked]:scale-100",
  {
    variants: {
      radioSize: {
        sm: "h-2 w-2",
        md: "h-2.5 w-2.5",
        lg: "h-3 w-3",
      },
      state: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        error: "bg-destructive",
      },
    },
    defaultVariants: {
      radioSize: "md",
      state: "default",
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

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface InsightRadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange">,
    VariantProps<typeof radioVariants> {
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  orientation?: "horizontal" | "vertical"
}

const InsightRadio = React.forwardRef<HTMLDivElement, InsightRadioProps>(
  (
    {
      className,
      containerClassName,
      radioSize = "md",
      state: stateProp,
      options,
      value,
      onChange,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      name,
      orientation = "vertical",
      disabled,
      ...props
    },
    ref
  ) => {
    const groupId = React.useId()
    const radioName = name || groupId

    // Determine state based on messages
    const state = errorMessage
      ? "error"
      : warningMessage
      ? "warning"
      : successMessage
      ? "success"
      : stateProp || "default"

    const statusMessage = errorMessage || warningMessage || successMessage

    const handleChange = (optionValue: string) => {
      onChange?.(optionValue)
    }

    return (
      <div ref={ref} className={cn("flex flex-col gap-2", containerClassName)}>
        {label && (
          <span className={cn(labelVariants({ state }))}>{label}</span>
        )}
        <div
          role="radiogroup"
          aria-label={label}
          className={cn(
            "flex gap-3",
            orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
            className
          )}
        >
          {options.map((option) => {
            const optionId = `${groupId}-${option.value}`
            const isChecked = value === option.value
            const isDisabled = disabled || option.disabled

            return (
              <div key={option.value} className="flex items-start gap-2">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    id={optionId}
                    name={radioName}
                    value={option.value}
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleChange(option.value)}
                    className={cn(radioVariants({ radioSize, state }))}
                    data-state={isChecked ? "checked" : "unchecked"}
                    aria-describedby={option.description ? `${optionId}-desc` : undefined}
                    {...props}
                  />
                  <div
                    className={cn(dotVariants({ radioSize, state }))}
                    data-state={isChecked ? "checked" : "unchecked"}
                  />
                </div>
                {(option.label || option.description) && (
                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor={optionId}
                      className={cn(
                        labelVariants({ state }),
                        "cursor-pointer",
                        isDisabled && "cursor-not-allowed opacity-70"
                      )}
                    >
                      {option.label}
                    </label>
                    {option.description && (
                      <p
                        id={`${optionId}-desc`}
                        className="text-xs text-muted-foreground"
                      >
                        {option.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
InsightRadio.displayName = "InsightRadio"

export { InsightRadio, radioVariants }
