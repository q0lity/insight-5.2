import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border shadow-sm",
        glass:
          "bg-[var(--glass)] backdrop-blur-xl border-white/20 shadow-glass",
        elevated: "border-border shadow-lg",
        outline: "border-border2 bg-transparent",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-lg",
        glow: "hover:shadow-[0_0_20px_rgba(217,93,57,0.15)]",
        scale: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
)

export interface CardProps
  extends Omit<HTMLMotionProps<"div">, "ref">,
    VariantProps<typeof cardVariants> {
  interactive?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, interactive = false, ...props }, ref) => {
    const hoverAnimation =
      hover === "scale" || interactive
        ? {
            whileHover: { scale: 1.01, y: -2 },
            whileTap: { scale: 0.99 },
            transition: { type: "spring", stiffness: 400, damping: 17 },
          }
        : {}

    return (
      <motion.div
        ref={ref}
        className={cn(
          cardVariants({ variant, hover }),
          interactive && "cursor-pointer",
          className
        )}
        {...hoverAnimation}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
}
