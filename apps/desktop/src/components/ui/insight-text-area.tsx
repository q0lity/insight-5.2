import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border bg-transparent text-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
        filled: "border-transparent bg-secondary focus-visible:ring-2 focus-visible:ring-ring",
        flushed: "rounded-none border-x-0 border-t-0 border-b-2 focus-visible:border-b-primary px-0",
      },
      textareaSize: {
        sm: "p-2 text-xs min-h-[60px]",
        md: "p-3 text-sm min-h-[80px]",
        lg: "p-4 text-base min-h-[120px]",
      },
      state: {
        default: "",
        success: "border-green-500 focus-visible:ring-green-500/30",
        warning: "border-yellow-500 focus-visible:ring-yellow-500/30",
        error: "border-destructive focus-visible:ring-destructive/30",
      },
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        horizontal: "resize-x",
        both: "resize",
      },
    },
    defaultVariants: {
      variant: "default",
      textareaSize: "md",
      state: "default",
      resize: "none",
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

export interface InsightTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  maxLength?: number
  showCharCount?: boolean
}

const InsightTextArea = React.forwardRef<HTMLTextAreaElement, InsightTextAreaProps>(
  (
    {
      className,
      containerClassName,
      variant,
      textareaSize,
      state: stateProp,
      resize,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      maxLength,
      showCharCount = false,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId()
    const [charCount, setCharCount] = React.useState(
      typeof value === "string" ? value.length : 0
    )

    // Determine state based on messages
    const state = errorMessage
      ? "error"
      : warningMessage
      ? "warning"
      : successMessage
      ? "success"
      : stateProp || "default"

    const statusMessage = errorMessage || warningMessage || successMessage

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      onChange?.(e)
    }

    React.useEffect(() => {
      if (typeof value === "string") {
        setCharCount(value.length)
      }
    }, [value])

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(labelVariants({ state }))}
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            textareaVariants({ variant, textareaSize, state, resize }),
            className
          )}
          ref={ref}
          aria-invalid={state === "error"}
          aria-describedby={
            statusMessage ? `${textareaId}-status` : helperText ? `${textareaId}-helper` : undefined
          }
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          {...props}
        />
        <div className="flex justify-between items-center">
          {(helperText || statusMessage) && (
            <p
              id={statusMessage ? `${textareaId}-status` : `${textareaId}-helper`}
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
          {showCharCount && maxLength && (
            <span
              className={cn(
                "text-xs ml-auto",
                charCount >= maxLength
                  ? "text-destructive"
                  : charCount >= maxLength * 0.9
                  ? "text-yellow-600"
                  : "text-muted-foreground"
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)
InsightTextArea.displayName = "InsightTextArea"

export { InsightTextArea, textareaVariants }
