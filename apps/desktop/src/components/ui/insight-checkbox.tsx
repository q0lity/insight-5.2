import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const checkboxVariants = cva(
  "peer shrink-0 rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
  {
    variants: {
      checkboxSize: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },
      state: {
        default: "border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary",
        success: "border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500",
        warning: "border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500",
        error: "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive",
      },
    },
    defaultVariants: {
      checkboxSize: "md",
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

const CheckIcon = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeMap = { sm: 12, md: 14, lg: 16 }
  const s = sizeMap[size]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export interface InsightCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type">,
    VariantProps<typeof checkboxVariants> {
  label?: string
  description?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  indeterminate?: boolean
}

const InsightCheckbox = React.forwardRef<HTMLInputElement, InsightCheckboxProps>(
  (
    {
      className,
      containerClassName,
      checkboxSize = "md",
      state: stateProp,
      label,
      description,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      id,
      checked,
      indeterminate = false,
      onChange,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || React.useId()
    const internalRef = React.useRef<HTMLInputElement>(null)
    const [isChecked, setIsChecked] = React.useState(checked ?? false)

    // Sync with controlled prop
    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked)
      }
    }, [checked])

    // Handle indeterminate state
    React.useEffect(() => {
      const el = (ref as React.RefObject<HTMLInputElement>)?.current || internalRef.current
      if (el) {
        el.indeterminate = indeterminate
      }
    }, [indeterminate, ref])

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
      setIsChecked(e.target.checked)
      onChange?.(e)
    }

    return (
      <div className={cn("flex flex-col gap-1", containerClassName)}>
        <div className="flex items-start gap-2">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              id={checkboxId}
              ref={ref || internalRef}
              className={cn(
                checkboxVariants({ checkboxSize, state }),
                className
              )}
              checked={isChecked}
              onChange={handleChange}
              data-state={isChecked ? "checked" : "unchecked"}
              aria-invalid={state === "error"}
              aria-describedby={
                statusMessage
                  ? `${checkboxId}-status`
                  : helperText
                  ? `${checkboxId}-helper`
                  : undefined
              }
              {...props}
            />
            {isChecked && !indeterminate && (
              <div className="absolute inset-0 flex items-center justify-center text-primary-foreground pointer-events-none">
                <CheckIcon size={checkboxSize || "md"} />
              </div>
            )}
            {indeterminate && (
              <div className="absolute inset-0 flex items-center justify-center text-primary-foreground pointer-events-none">
                <div
                  className={cn(
                    "bg-current rounded-sm",
                    checkboxSize === "sm" && "w-2 h-0.5",
                    checkboxSize === "md" && "w-2.5 h-0.5",
                    checkboxSize === "lg" && "w-3 h-0.5"
                  )}
                />
              </div>
            )}
          </div>
          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={cn(labelVariants({ state }), "cursor-pointer")}
                >
                  {label}
                </label>
              )}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          )}
        </div>
        {(helperText || statusMessage) && (
          <p
            id={statusMessage ? `${checkboxId}-status` : `${checkboxId}-helper`}
            className={cn(
              "text-xs ml-7",
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
InsightCheckbox.displayName = "InsightCheckbox"

export { InsightCheckbox, checkboxVariants }
