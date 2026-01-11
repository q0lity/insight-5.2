import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const insightChipVariants = cva(
  [
    "inline-flex items-center gap-1.5 font-medium",
    "transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/10 text-primary",
        outline: "border border-border bg-transparent text-foreground",
        ghost: "bg-transparent text-muted-foreground",
      },
      size: {
        xs: "h-5 px-1.5 text-[10px] rounded",
        sm: "h-6 px-2 text-xs rounded-md",
        default: "h-7 px-2.5 text-xs rounded-md",
        lg: "h-8 px-3 text-sm rounded-lg",
      },
      selectable: {
        true: "cursor-pointer",
        false: "",
      },
      selected: {
        true: "",
        false: "",
      },
      dismissible: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      // Selectable hover states
      {
        selectable: true,
        variant: "default",
        className: "hover:bg-secondary/80 active:bg-secondary/70",
      },
      {
        selectable: true,
        variant: "primary",
        className: "hover:bg-primary/15 active:bg-primary/20",
      },
      {
        selectable: true,
        variant: "outline",
        className: "hover:bg-secondary hover:border-border2 active:bg-secondary/80",
      },
      {
        selectable: true,
        variant: "ghost",
        className: "hover:bg-secondary hover:text-foreground active:bg-secondary/80",
      },
      // Selected states
      {
        selected: true,
        variant: "default",
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      {
        selected: true,
        variant: "primary",
        className: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      {
        selected: true,
        variant: "outline",
        className: "border-primary bg-primary/10 text-primary",
      },
      {
        selected: true,
        variant: "ghost",
        className: "bg-primary/10 text-primary",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      selectable: false,
      selected: false,
      dismissible: false,
    },
  }
)

export interface InsightChipProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect">,
    VariantProps<typeof insightChipVariants> {
  onDismiss?: () => void
  onSelect?: (selected: boolean) => void
  icon?: React.ReactNode
}

const InsightChip = React.forwardRef<HTMLDivElement, InsightChipProps>(
  (
    {
      className,
      variant,
      size,
      selectable,
      selected,
      dismissible,
      onDismiss,
      onSelect,
      icon,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectable && onSelect) {
        onSelect(!selected)
      }
      onClick?.(e)
    }

    const handleDismiss = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onDismiss?.()
    }

    const iconSize = {
      xs: "size-2.5",
      sm: "size-3",
      default: "size-3.5",
      lg: "size-4",
    }[size || "default"]

    return (
      <div
        ref={ref}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
        aria-pressed={selectable ? selected : undefined}
        className={cn(
          insightChipVariants({ variant, size, selectable, selected, dismissible, className })
        )}
        onClick={handleClick}
        {...props}
      >
        {icon && <span className={cn("shrink-0", iconSize)}>{icon}</span>}
        <span className="truncate">{children}</span>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              "shrink-0 rounded-full p-0.5",
              "transition-colors duration-150",
              "hover:bg-black/10 active:bg-black/20",
              "dark:hover:bg-white/10 dark:active:bg-white/20",
              iconSize
            )}
            aria-label="Dismiss"
          >
            <X className="size-full" />
          </button>
        )}
      </div>
    )
  }
)
InsightChip.displayName = "InsightChip"

export { InsightChip, insightChipVariants }
