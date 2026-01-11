import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const insightCardVariants = cva(
  [
    "rounded-xl border transition-all duration-200 ease-out",
    "bg-card text-card-foreground",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-border shadow-sm",
        elevated: "border-border shadow-md hover:shadow-lg",
        ghost: "border-transparent bg-transparent",
        glass: [
          "bg-panel backdrop-blur-xl border-border",
          "shadow-glass",
        ].join(" "),
        outline: "border-border2 bg-transparent",
      },
      size: {
        sm: "p-3",
        default: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
      interactive: {
        true: [
          "cursor-pointer",
          "hover:border-border2 hover:shadow-md",
          "active:scale-[0.995] active:shadow-sm",
        ].join(" "),
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

export interface InsightCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insightCardVariants> {}

const InsightCard = React.forwardRef<HTMLDivElement, InsightCardProps>(
  ({ className, variant, size, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(insightCardVariants({ variant, size, interactive, className }))}
      {...props}
    />
  )
)
InsightCard.displayName = "InsightCard"

// Header slot
const insightCardHeaderVariants = cva("flex flex-col gap-1.5", {
  variants: {
    size: {
      sm: "pb-2",
      default: "pb-3",
      lg: "pb-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface InsightCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insightCardHeaderVariants> {}

const InsightCardHeader = React.forwardRef<HTMLDivElement, InsightCardHeaderProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(insightCardHeaderVariants({ size, className }))}
      {...props}
    />
  )
)
InsightCardHeader.displayName = "InsightCardHeader"

// Title
const InsightCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
))
InsightCardTitle.displayName = "InsightCardTitle"

// Description
const InsightCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
InsightCardDescription.displayName = "InsightCardDescription"

// Content slot
const InsightCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
InsightCardContent.displayName = "InsightCardContent"

// Footer slot
const insightCardFooterVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "pt-2 gap-2",
      default: "pt-3 gap-3",
      lg: "pt-4 gap-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface InsightCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insightCardFooterVariants> {}

const InsightCardFooter = React.forwardRef<HTMLDivElement, InsightCardFooterProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(insightCardFooterVariants({ size, className }))}
      {...props}
    />
  )
)
InsightCardFooter.displayName = "InsightCardFooter"

export {
  InsightCard,
  InsightCardHeader,
  InsightCardTitle,
  InsightCardDescription,
  InsightCardContent,
  InsightCardFooter,
  insightCardVariants,
}
