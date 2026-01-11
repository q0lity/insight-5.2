import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const selectVariants = cva(
  "flex w-full items-center justify-between rounded-md border bg-transparent text-sm transition-all focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-ring focus-visible:border-transparent",
        filled: "border-transparent bg-secondary focus-visible:ring-ring",
        flushed: "rounded-none border-x-0 border-t-0 border-b-2 focus-visible:border-b-primary px-0",
      },
      selectSize: {
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
      selectSize: "md",
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

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface InsightSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  options: SelectOption[]
  placeholder?: string
  containerClassName?: string
}

const ChevronDownIcon = () => (
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
    className="pointer-events-none"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const InsightSelect = React.forwardRef<HTMLSelectElement, InsightSelectProps>(
  (
    {
      className,
      containerClassName,
      variant,
      selectSize,
      state: stateProp,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      options,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId()

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
            htmlFor={selectId}
            className={cn(labelVariants({ state }))}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              selectVariants({ variant, selectSize, state }),
              "pr-10",
              className
            )}
            ref={ref}
            aria-invalid={state === "error"}
            aria-describedby={
              statusMessage ? `${selectId}-status` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <ChevronDownIcon />
          </div>
        </div>
        {(helperText || statusMessage) && (
          <p
            id={statusMessage ? `${selectId}-status` : `${selectId}-helper`}
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
InsightSelect.displayName = "InsightSelect"

export { InsightSelect, selectVariants }
