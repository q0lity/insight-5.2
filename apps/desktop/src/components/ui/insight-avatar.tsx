import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const insightAvatarVariants = cva(
  [
    "relative inline-flex items-center justify-center shrink-0 overflow-hidden",
    "bg-secondary text-secondary-foreground font-medium",
    "transition-all duration-150 ease-out",
  ].join(" "),
  {
    variants: {
      size: {
        xs: "size-6 text-[10px] rounded",
        sm: "size-8 text-xs rounded-md",
        default: "size-10 text-sm rounded-lg",
        lg: "size-12 text-base rounded-lg",
        xl: "size-16 text-lg rounded-xl",
        "2xl": "size-20 text-xl rounded-xl",
      },
      shape: {
        circle: "rounded-full",
        square: "",
      },
      ring: {
        true: "ring-2 ring-background",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      shape: "circle",
      ring: false,
    },
  }
)

export interface InsightAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof insightAvatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  delayMs?: number
}

const InsightAvatar = React.forwardRef<HTMLDivElement, InsightAvatarProps>(
  ({ className, size, shape, ring, src, alt, fallback, delayMs = 0, ...props }, ref) => {
    const [imageLoaded, setImageLoaded] = React.useState(false)
    const [showFallback, setShowFallback] = React.useState(false)

    React.useEffect(() => {
      if (!src) {
        setShowFallback(true)
        return
      }

      setImageLoaded(false)
      setShowFallback(false)

      const img = new Image()
      img.src = src
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setShowFallback(true)

      if (delayMs > 0) {
        const timeout = setTimeout(() => {
          if (!imageLoaded) setShowFallback(true)
        }, delayMs)
        return () => clearTimeout(timeout)
      }
    }, [src, delayMs])

    // Generate initials from fallback or alt text
    const getInitials = (text: string): string => {
      if (!text) return "?"
      const words = text.trim().split(/\s+/)
      if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase()
      }
      return (words[0][0] + words[words.length - 1][0]).toUpperCase()
    }

    const initials = getInitials(fallback || alt || "")

    return (
      <div
        ref={ref}
        className={cn(insightAvatarVariants({ size, shape, ring, className }))}
        {...props}
      >
        {imageLoaded && src && (
          <img
            src={src}
            alt={alt}
            className={cn(
              "aspect-square size-full object-cover",
              "animate-in fade-in-0 duration-200"
            )}
          />
        )}
        {(showFallback || (!imageLoaded && !src)) && (
          <span
            className={cn(
              "flex size-full items-center justify-center",
              "bg-gradient-to-br from-secondary to-secondary/80",
              "select-none uppercase"
            )}
          >
            {initials}
          </span>
        )}
      </div>
    )
  }
)
InsightAvatar.displayName = "InsightAvatar"

// Avatar group for stacked display
const InsightAvatarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    max?: number
    children: React.ReactNode
  }
>(({ className, max = 4, children, ...props }, ref) => {
  const childArray = React.Children.toArray(children)
  const displayChildren = childArray.slice(0, max)
  const remaining = childArray.length - max

  return (
    <div
      ref={ref}
      className={cn("flex -space-x-2", className)}
      {...props}
    >
      {displayChildren.map((child, index) => (
        <div
          key={index}
          className="relative"
          style={{ zIndex: displayChildren.length - index }}
        >
          {React.isValidElement<InsightAvatarProps>(child)
            ? React.cloneElement(child, { ring: true })
            : child}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "relative flex items-center justify-center",
            "size-10 rounded-full",
            "bg-secondary text-secondary-foreground text-sm font-medium",
            "ring-2 ring-background"
          )}
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
})
InsightAvatarGroup.displayName = "InsightAvatarGroup"

export { InsightAvatar, InsightAvatarGroup, insightAvatarVariants }
