import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const insightBadgeVariants = cva(
  [
    "inline-flex items-center font-medium",
    "transition-colors duration-150",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        error: "bg-destructive/15 text-destructive",
        info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        outline: "border border-border bg-transparent text-foreground",
        ghost: "bg-transparent text-muted-foreground",
      },
      size: {
        xs: "h-4 px-1 text-[9px] rounded",
        sm: "h-5 px-1.5 text-[10px] rounded-md",
        default: "h-6 px-2 text-xs rounded-md",
        lg: "h-7 px-2.5 text-xs rounded-lg",
      },
      dot: {
        true: "gap-1.5",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      dot: false,
    },
  }
)

const dotColorMap: Record<string, string> = {
  default: "bg-secondary-foreground",
  primary: "bg-primary-foreground",
  secondary: "bg-secondary-foreground",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-destructive",
  info: "bg-blue-500",
  outline: "bg-foreground",
  ghost: "bg-muted-foreground",
}

export interface InsightBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof insightBadgeVariants> {
  pulse?: boolean
}

const InsightBadge = React.forwardRef<HTMLSpanElement, InsightBadgeProps>(
  ({ className, variant, size, dot, pulse, children, ...props }, ref) => {
    const dotSize = {
      xs: "size-1",
      sm: "size-1.5",
      default: "size-1.5",
      lg: "size-2",
    }[size || "default"]

    return (
      <span
        ref={ref}
        className={cn(insightBadgeVariants({ variant, size, dot, className }))}
        {...props}
      >
        {dot && (
          <span className="relative flex">
            {pulse && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  dotColorMap[variant || "default"]
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full",
                dotSize,
                dotColorMap[variant || "default"]
              )}
            />
          </span>
        )}
        {children}
      </span>
    )
  }
)
InsightBadge.displayName = "InsightBadge"

export { InsightBadge, insightBadgeVariants }
