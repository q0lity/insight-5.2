import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const insightButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow-sm",
          "hover:bg-primary/90 hover:shadow-md",
          "active:bg-primary/85",
        ].join(" "),
        destructive: [
          "bg-destructive text-white shadow-sm",
          "hover:bg-destructive/90 hover:shadow-md",
          "active:bg-destructive/85",
        ].join(" "),
        outline: [
          "border border-border bg-transparent text-foreground",
          "hover:bg-secondary hover:border-border2",
          "active:bg-secondary/80",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80",
          "active:bg-secondary/70",
        ].join(" "),
        ghost: [
          "text-foreground",
          "hover:bg-secondary hover:text-foreground",
          "active:bg-secondary/80",
        ].join(" "),
        link: [
          "text-primary underline-offset-4",
          "hover:underline",
          "active:opacity-80",
        ].join(" "),
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md [&_svg]:size-3",
        sm: "h-8 px-3 text-xs rounded-md [&_svg]:size-3.5",
        default: "h-9 px-4 text-sm rounded-lg [&_svg]:size-4",
        lg: "h-10 px-5 text-sm rounded-lg [&_svg]:size-4",
        xl: "h-11 px-6 text-base rounded-xl [&_svg]:size-5",
        icon: "h-9 w-9 rounded-lg [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-3.5",
        "icon-lg": "h-10 w-10 rounded-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InsightButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof insightButtonVariants> {
  asChild?: boolean
  loading?: boolean
}

const InsightButton = React.forwardRef<HTMLButtonElement, InsightButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(insightButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
InsightButton.displayName = "InsightButton"

export { InsightButton, insightButtonVariants }
