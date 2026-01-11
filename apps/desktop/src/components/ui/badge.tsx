import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
        info:
          "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const categoryColors: Record<string, string> = {
  work: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  personal: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
  health: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  finance: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  social: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20",
  learning: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  creative: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
  errands: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
}

const statusDotColors: Record<string, string> = {
  default: "bg-primary",
  secondary: "bg-muted-foreground",
  destructive: "bg-destructive",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
  outline: "bg-foreground",
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  showDot?: boolean
  dotColor?: string
  category?: keyof typeof categoryColors
}

function Badge({
  className,
  variant,
  size,
  showDot = false,
  dotColor,
  category,
  children,
  ...props
}: BadgeProps) {
  const categoryClass = category ? categoryColors[category] : undefined
  const dotColorClass = dotColor || (variant ? statusDotColors[variant] : statusDotColors.default)

  return (
    <div
      className={cn(
        badgeVariants({ variant: category ? undefined : variant, size }),
        categoryClass,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dotColorClass
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants, categoryColors }
