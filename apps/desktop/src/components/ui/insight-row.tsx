import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const insightRowVariants = cva(
  [
    "flex items-center",
    "transition-all duration-150 ease-out",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "",
        card: "bg-card rounded-lg border border-border",
        ghost: "rounded-lg",
      },
      size: {
        sm: "gap-2 min-h-[36px] px-2 py-1.5",
        default: "gap-3 min-h-[44px] px-3 py-2",
        lg: "gap-4 min-h-[52px] px-4 py-3",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    compoundVariants: [
      {
        interactive: true,
        variant: "default",
        className: "hover:bg-secondary/50 active:bg-secondary/70 rounded-lg",
      },
      {
        interactive: true,
        variant: "card",
        className: "hover:border-border2 hover:shadow-sm active:scale-[0.995]",
      },
      {
        interactive: true,
        variant: "ghost",
        className: "hover:bg-secondary active:bg-secondary/80",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

export interface InsightRowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insightRowVariants> {
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

const InsightRow = React.forwardRef<HTMLDivElement, InsightRowProps>(
  ({ className, variant, size, interactive, leading, trailing, children, ...props }, ref) => {
    const leadingSize = {
      sm: "size-5",
      default: "size-6",
      lg: "size-8",
    }[size || "default"]

    const trailingSize = {
      sm: "size-4",
      default: "size-5",
      lg: "size-6",
    }[size || "default"]

    return (
      <div
        ref={ref}
        className={cn(insightRowVariants({ variant, size, interactive, className }))}
        {...props}
      >
        {leading && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-center text-muted-foreground",
              leadingSize
            )}
          >
            {leading}
          </div>
        )}
        <div className="flex-1 min-w-0">{children}</div>
        {trailing && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-center text-muted-foreground",
              trailingSize
            )}
          >
            {trailing}
          </div>
        )}
      </div>
    )
  }
)
InsightRow.displayName = "InsightRow"

// Row content helpers
const InsightRowTitle = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("block font-medium text-foreground truncate", className)}
    {...props}
  />
))
InsightRowTitle.displayName = "InsightRowTitle"

const InsightRowDescription = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("block text-sm text-muted-foreground truncate", className)}
    {...props}
  />
))
InsightRowDescription.displayName = "InsightRowDescription"

export { InsightRow, InsightRowTitle, InsightRowDescription, insightRowVariants }
