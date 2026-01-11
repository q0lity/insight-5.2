import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sliderTrackVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      sliderSize: {
        sm: "h-4",
        md: "h-5",
        lg: "h-6",
      },
    },
    defaultVariants: {
      sliderSize: "md",
    },
  }
)

const sliderRailVariants = cva(
  "relative w-full grow overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      sliderSize: {
        sm: "h-1",
        md: "h-1.5",
        lg: "h-2",
      },
    },
    defaultVariants: {
      sliderSize: "md",
    },
  }
)

const sliderFillVariants = cva(
  "absolute h-full rounded-full",
  {
    variants: {
      state: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        error: "bg-destructive",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
)

const sliderThumbVariants = cva(
  "block rounded-full border-2 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing",
  {
    variants: {
      sliderSize: {
        sm: "h-3.5 w-3.5",
        md: "h-4 w-4",
        lg: "h-5 w-5",
      },
      state: {
        default: "border-primary",
        success: "border-green-500",
        warning: "border-yellow-500",
        error: "border-destructive",
      },
    },
    defaultVariants: {
      sliderSize: "md",
      state: "default",
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

export interface InsightSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof sliderTrackVariants>,
    VariantProps<typeof sliderFillVariants> {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  onChangeEnd?: (value: number) => void
  label?: string
  helperText?: string
  errorMessage?: string
  successMessage?: string
  warningMessage?: string
  containerClassName?: string
  showValue?: boolean
  formatValue?: (value: number) => string
  disabled?: boolean
  marks?: { value: number; label?: string }[]
}

const InsightSlider = React.forwardRef<HTMLDivElement, InsightSliderProps>(
  (
    {
      className,
      containerClassName,
      sliderSize = "md",
      state: stateProp,
      value: controlledValue,
      defaultValue = 0,
      min = 0,
      max = 100,
      step = 1,
      onChange,
      onChangeEnd,
      label,
      helperText,
      errorMessage,
      successMessage,
      warningMessage,
      showValue = false,
      formatValue = (v) => String(v),
      disabled = false,
      marks,
      ...props
    },
    ref
  ) => {
    const sliderId = React.useId()
    const trackRef = React.useRef<HTMLDivElement>(null)
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const [isDragging, setIsDragging] = React.useState(false)

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

    const getValueFromPosition = React.useCallback(
      (clientX: number) => {
        if (!trackRef.current) return currentValue

        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const rawValue = min + percent * (max - min)
        const steppedValue = Math.round(rawValue / step) * step
        return Math.max(min, Math.min(max, steppedValue))
      },
      [currentValue, min, max, step]
    )

    const updateValue = React.useCallback(
      (newValue: number) => {
        if (!isControlled) {
          setInternalValue(newValue)
        }
        onChange?.(newValue)
      },
      [isControlled, onChange]
    )

    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(true)
      const newValue = getValueFromPosition(e.clientX)
      updateValue(newValue)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
      if (disabled) return
      setIsDragging(true)
      const touch = e.touches[0]
      const newValue = getValueFromPosition(touch.clientX)
      updateValue(newValue)
    }

    React.useEffect(() => {
      if (!isDragging) return

      const handleMouseMove = (e: MouseEvent) => {
        const newValue = getValueFromPosition(e.clientX)
        updateValue(newValue)
      }

      const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0]
        const newValue = getValueFromPosition(touch.clientX)
        updateValue(newValue)
      }

      const handleEnd = () => {
        setIsDragging(false)
        onChangeEnd?.(currentValue)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleEnd)
      document.addEventListener("touchmove", handleTouchMove)
      document.addEventListener("touchend", handleEnd)

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleEnd)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleEnd)
      }
    }, [isDragging, getValueFromPosition, updateValue, onChangeEnd, currentValue])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      let newValue = currentValue
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          newValue = Math.max(min, currentValue - step)
          break
        case "ArrowRight":
        case "ArrowUp":
          newValue = Math.min(max, currentValue + step)
          break
        case "Home":
          newValue = min
          break
        case "End":
          newValue = max
          break
        default:
          return
      }
      e.preventDefault()
      updateValue(newValue)
    }

    const percent = ((currentValue - min) / (max - min)) * 100

    return (
      <div ref={ref} className={cn("flex flex-col gap-2", containerClassName)} {...props}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={sliderId}
                className={cn(labelVariants({ state }))}
              >
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm font-medium text-muted-foreground">
                {formatValue(currentValue)}
              </span>
            )}
          </div>
        )}
        <div
          ref={trackRef}
          className={cn(
            sliderTrackVariants({ sliderSize }),
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className={cn(sliderRailVariants({ sliderSize }))}>
            <div
              className={cn(sliderFillVariants({ state }))}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div
            id={sliderId}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={currentValue}
            aria-label={label}
            aria-disabled={disabled}
            className={cn(
              sliderThumbVariants({ sliderSize, state }),
              "absolute"
            )}
            style={{ left: `calc(${percent}% - ${sliderSize === "sm" ? 7 : sliderSize === "lg" ? 10 : 8}px)` }}
            onKeyDown={handleKeyDown}
          />
        </div>
        {marks && marks.length > 0 && (
          <div className="relative w-full h-4">
            {marks.map((mark) => {
              const markPercent = ((mark.value - min) / (max - min)) * 100
              return (
                <div
                  key={mark.value}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${markPercent}%` }}
                >
                  {mark.label && (
                    <span className="text-xs text-muted-foreground">
                      {mark.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
InsightSlider.displayName = "InsightSlider"

export { InsightSlider, sliderTrackVariants }
