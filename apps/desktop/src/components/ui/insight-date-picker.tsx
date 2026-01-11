import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const datePickerVariants = cva(
  "flex w-full rounded-md border bg-transparent text-sm transition-all focus-within:outline-none focus-within:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input focus-within:ring-ring focus-within:border-transparent",
        filled: "border-transparent bg-secondary focus-within:ring-ring",
        flushed: "rounded-none border-x-0 border-t-0 border-b-2 focus-within:border-b-primary px-0",
      },
      pickerSize: {
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
      pickerSize: "md",
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

const CalendarIcon = () => (
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
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
)

const ClearIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export interface InsightDatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "value" | "onChange">,
    VariantProps<typeof datePickerVariants> {
  value?: Date | null
  onChange?: (date: Date | null) => void
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  minDate?: Date
  maxDate?: Date
  clearable?: boolean
  dateFormat?: "date" | "datetime-local" | "time" | "month" | "week"
}

const formatDateForInput = (date: Date | null, format: string): string => {
  if (!date) return ""

  const pad = (n: number) => n.toString().padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  switch (format) {
    case "datetime-local":
      return `${year}-${month}-${day}T${hours}:${minutes}`
    case "time":
      return `${hours}:${minutes}`
    case "month":
      return `${year}-${month}`
    case "week":
      // Get ISO week number
      const startOfYear = new Date(date.getFullYear(), 0, 1)
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      return `${year}-W${pad(weekNumber)}`
    default:
      return `${year}-${month}-${day}`
  }
}

const parseDateFromInput = (value: string, format: string): Date | null => {
  if (!value) return null

  try {
    switch (format) {
      case "datetime-local":
        return new Date(value)
      case "time": {
        const [hours, minutes] = value.split(":").map(Number)
        const date = new Date()
        date.setHours(hours, minutes, 0, 0)
        return date
      }
      case "month": {
        const [year, month] = value.split("-").map(Number)
        return new Date(year, month - 1, 1)
      }
      case "week": {
        const match = value.match(/(\d{4})-W(\d{2})/)
        if (!match) return null
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        const date = new Date(year, 0, 1 + (week - 1) * 7)
        return date
      }
      default:
        return new Date(value)
    }
  } catch {
    return null
  }
}

const InsightDatePicker = React.forwardRef<HTMLInputElement, InsightDatePickerProps>(
  (
    {
      className,
      containerClassName,
      variant,
      pickerSize,
      state: stateProp,
      value,
      onChange,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      minDate,
      maxDate,
      clearable = true,
      dateFormat = "date",
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const pickerId = id || React.useId()

    // Determine state based on messages
    const state = errorMessage
      ? "error"
      : warningMessage
      ? "warning"
      : successMessage
      ? "success"
      : stateProp || "default"

    const statusMessage = errorMessage || warningMessage || successMessage

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = parseDateFromInput(e.target.value, dateFormat)
      onChange?.(newDate)
    }

    const handleClear = () => {
      onChange?.(null)
    }

    const inputPadding = pickerSize === "sm" ? "px-2.5" : pickerSize === "lg" ? "px-4" : "px-3"
    const fontSize = pickerSize === "sm" ? "text-xs" : pickerSize === "lg" ? "text-base" : "text-sm"

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={pickerId}
            className={cn(labelVariants({ state }))}
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            datePickerVariants({ variant, pickerSize, state }),
            "items-center",
            className
          )}
        >
          <div className={cn("flex items-center text-muted-foreground", inputPadding)}>
            <CalendarIcon />
          </div>
          <input
            ref={ref}
            id={pickerId}
            type={dateFormat}
            value={formatDateForInput(value ?? null, dateFormat)}
            onChange={handleChange}
            min={minDate ? formatDateForInput(minDate, dateFormat) : undefined}
            max={maxDate ? formatDateForInput(maxDate, dateFormat) : undefined}
            disabled={disabled}
            className={cn(
              "flex-1 bg-transparent border-0 outline-none",
              fontSize,
              "placeholder:text-muted-foreground",
              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              "[&::-webkit-calendar-picker-indicator]:opacity-50",
              "[&::-webkit-calendar-picker-indicator]:hover:opacity-100"
            )}
            aria-invalid={state === "error"}
            aria-describedby={
              statusMessage ? `${pickerId}-status` : helperText ? `${pickerId}-helper` : undefined
            }
            {...props}
          />
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                "flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
                inputPadding
              )}
              aria-label="Clear date"
            >
              <ClearIcon />
            </button>
          )}
        </div>
        {(helperText || statusMessage) && (
          <p
            id={statusMessage ? `${pickerId}-status` : `${pickerId}-helper`}
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
InsightDatePicker.displayName = "InsightDatePicker"

export { InsightDatePicker, datePickerVariants }
