import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-transparent text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
        filled: "border-transparent bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
        flushed: "rounded-none border-x-0 border-t-0 border-b-2 focus-visible:border-b-primary px-0",
      },
      inputSize: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
      state: {
        default: "",
        success: "border-green-500 focus-visible:ring-green-500/30",
        warning: "border-yellow-500 focus-visible:ring-yellow-500/30",
        error: "border-destructive focus-visible:ring-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
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

export interface InsightTextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

const InsightTextField = React.forwardRef<HTMLInputElement, InsightTextFieldProps>(
  (
    {
      className,
      containerClassName,
      variant,
      inputSize,
      state: stateProp,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()

    // Determine state based on messages
    const state = errorMessage
      ? "error"
      : warningMessage
      ? "warning"
      : successMessage
      ? "success"
      : stateProp || "default"

    const statusMessage = errorMessage || warningMessage || successMessage

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(labelVariants({ state }))}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            className={cn(
              inputVariants({ variant, inputSize, state }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            aria-invalid={state === "error"}
            aria-describedby={
              statusMessage ? `${inputId}-status` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {(helperText || statusMessage) && (
          <p
            id={statusMessage ? `${inputId}-status` : `${inputId}-helper`}
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
InsightTextField.displayName = "InsightTextField"

export { InsightTextField, inputVariants }
