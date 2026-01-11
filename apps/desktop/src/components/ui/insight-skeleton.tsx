import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const insightSkeletonVariants = cva(
  [
    "bg-secondary/60",
    "animate-pulse",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "rounded-md",
        circle: "rounded-full",
        text: "rounded h-4 w-full",
        avatar: "rounded-full",
        button: "rounded-lg",
        card: "rounded-xl",
      },
      size: {
        xs: "",
        sm: "",
        default: "",
        lg: "",
        full: "w-full",
      },
      animation: {
        pulse: "animate-pulse",
        shimmer: [
          "relative overflow-hidden",
          "before:absolute before:inset-0",
          "before:-translate-x-full",
          "before:animate-[shimmer_2s_infinite]",
          "before:bg-gradient-to-r",
          "before:from-transparent before:via-white/10 before:to-transparent",
        ].join(" "),
        none: "",
      },
    },
    compoundVariants: [
      // Avatar sizes
      { variant: "avatar", size: "xs", className: "size-6" },
      { variant: "avatar", size: "sm", className: "size-8" },
      { variant: "avatar", size: "default", className: "size-10" },
      { variant: "avatar", size: "lg", className: "size-12" },
      // Button sizes
      { variant: "button", size: "xs", className: "h-7 w-16" },
      { variant: "button", size: "sm", className: "h-8 w-20" },
      { variant: "button", size: "default", className: "h-9 w-24" },
      { variant: "button", size: "lg", className: "h-10 w-28" },
      // Text sizes
      { variant: "text", size: "xs", className: "h-3" },
      { variant: "text", size: "sm", className: "h-3.5" },
      { variant: "text", size: "default", className: "h-4" },
      { variant: "text", size: "lg", className: "h-5" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "pulse",
    },
  }
)

export interface InsightSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insightSkeletonVariants> {
  width?: string | number
  height?: string | number
}

const InsightSkeleton = React.forwardRef<HTMLDivElement, InsightSkeletonProps>(
  ({ className, variant, size, animation, width, height, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(insightSkeletonVariants({ variant, size, animation, className }))}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  )
)
InsightSkeleton.displayName = "InsightSkeleton"

// Skeleton composite helpers
const InsightSkeletonText = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    lines?: number
    lastLineWidth?: string
  }
>(({ className, lines = 3, lastLineWidth = "60%", ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <InsightSkeleton
        key={i}
        variant="text"
        style={{
          width: i === lines - 1 ? lastLineWidth : "100%",
        }}
      />
    ))}
  </div>
))
InsightSkeletonText.displayName = "InsightSkeletonText"

const InsightSkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border border-border p-4 space-y-4", className)}
    {...props}
  >
    <div className="flex items-center gap-3">
      <InsightSkeleton variant="avatar" size="default" />
      <div className="flex-1 space-y-2">
        <InsightSkeleton variant="text" size="default" style={{ width: "40%" }} />
        <InsightSkeleton variant="text" size="sm" style={{ width: "60%" }} />
      </div>
    </div>
    <InsightSkeletonText lines={2} />
    <div className="flex gap-2">
      <InsightSkeleton variant="button" size="sm" />
      <InsightSkeleton variant="button" size="sm" />
    </div>
  </div>
))
InsightSkeletonCard.displayName = "InsightSkeletonCard"

const InsightSkeletonRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3 py-2", className)}
    {...props}
  >
    <InsightSkeleton variant="avatar" size="sm" />
    <div className="flex-1 space-y-1.5">
      <InsightSkeleton variant="text" size="default" style={{ width: "50%" }} />
      <InsightSkeleton variant="text" size="sm" style={{ width: "30%" }} />
    </div>
    <InsightSkeleton className="size-4 rounded" />
  </div>
))
InsightSkeletonRow.displayName = "InsightSkeletonRow"

export {
  InsightSkeleton,
  InsightSkeletonText,
  InsightSkeletonCard,
  InsightSkeletonRow,
  insightSkeletonVariants,
}
