import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-transparent text-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-transparent",
        filled:
          "bg-secondary/50 border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-transparent",
        ghost:
          "border-transparent hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      },
      inputSize: {
        default: "h-9 px-3 py-1",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-11 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

const inputWrapperVariants = cva(
  "relative flex items-center",
  {
    variants: {
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      fullWidth: true,
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  error?: boolean
  errorMessage?: string
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      error = false,
      errorMessage,
      prefixIcon,
      suffixIcon,
      wrapperClassName,
      type,
      ...props
    },
    ref
  ) => {
    const hasIcons = prefixIcon || suffixIcon

    const inputElement = (
      <input
        type={type}
        className={cn(
          inputVariants({ variant, inputSize }),
          error && "border-destructive focus-visible:ring-destructive/50",
          prefixIcon && "pl-9",
          suffixIcon && "pr-9",
          className
        )}
        ref={ref}
        aria-invalid={error}
        {...props}
      />
    )

    if (!hasIcons && !errorMessage) {
      return inputElement
    }

    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        <div className={cn(inputWrapperVariants())}>
          {prefixIcon && (
            <span className="absolute left-3 flex h-4 w-4 items-center justify-center text-muted-foreground pointer-events-none">
              {prefixIcon}
            </span>
          )}
          {inputElement}
          {suffixIcon && (
            <span className="absolute right-3 flex h-4 w-4 items-center justify-center text-muted-foreground">
              {suffixIcon}
            </span>
          )}
        </div>
        {error && errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-destructive"
          >
            {errorMessage}
          </motion.p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<VariantProps<typeof inputVariants>, "inputSize"> {
  error?: boolean
  errorMessage?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, error = false, errorMessage, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          className={cn(
            inputVariants({ variant }),
            "min-h-[80px] px-3 py-2 resize-none",
            error && "border-destructive focus-visible:ring-destructive/50",
            className
          )}
          ref={ref}
          aria-invalid={error}
          {...props}
        />
        {error && errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-destructive"
          >
            {errorMessage}
          </motion.p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Input, Textarea, inputVariants }
