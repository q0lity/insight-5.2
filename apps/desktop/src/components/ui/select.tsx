"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Search, X } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  className?: string
  containerClassName?: string
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({
    options,
    value,
    onValueChange,
    placeholder = "Select an option",
    label,
    error,
    disabled = false,
    searchable = false,
    searchPlaceholder = "Search...",
    className,
    containerClassName,
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [highlightedIndex, setHighlightedIndex] = React.useState(0)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const searchInputRef = React.useRef<HTMLInputElement>(null)
    const listRef = React.useRef<HTMLDivElement>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = React.useMemo(() => {
      if (!search) return options
      const searchLower = search.toLowerCase()
      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchLower) ||
          opt.description?.toLowerCase().includes(searchLower)
      )
    }, [options, search])

    // Reset highlight when filtered options change
    React.useEffect(() => {
      setHighlightedIndex(0)
    }, [filteredOptions])

    // Focus search input when opened
    React.useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, [isOpen, searchable])

    // Close on outside click
    React.useEffect(() => {
      if (!isOpen) return
      const handleClick = (e: MouseEvent) => {
        if (
          triggerRef.current?.contains(e.target as Node) ||
          listRef.current?.contains(e.target as Node)
        )
          return
        setIsOpen(false)
        setSearch("")
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }, [isOpen])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      switch (e.key) {
        case "Enter":
        case " ":
          if (!isOpen) {
            e.preventDefault()
            setIsOpen(true)
          } else if (filteredOptions[highlightedIndex]) {
            e.preventDefault()
            selectOption(filteredOptions[highlightedIndex])
          }
          break
        case "ArrowDown":
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else {
            setHighlightedIndex((prev) =>
              Math.min(prev + 1, filteredOptions.length - 1)
            )
          }
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) => Math.max(prev - 1, 0))
          break
        case "Escape":
          setIsOpen(false)
          setSearch("")
          break
      }
    }

    const selectOption = (option: SelectOption) => {
      if (option.disabled) return
      onValueChange?.(option.value)
      setIsOpen(false)
      setSearch("")
      triggerRef.current?.focus()
    }

    return (
      <div ref={ref} className={cn("relative", containerClassName)}>
        {label && (
          <label
            className={cn(
              "mb-1.5 block text-sm font-semibold transition-colors duration-200",
              error ? "text-destructive" : "text-foreground"
            )}
          >
            {label}
          </label>
        )}
        <motion.button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border-2 bg-background px-3 py-2 text-sm",
            "transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus-visible:ring-destructive/30"
              : isOpen
              ? "border-accent ring-2 ring-accent/30"
              : "border-border hover:border-accent/50 focus-visible:border-accent focus-visible:ring-accent/30",
            className
          )}
          whileTap={disabled ? undefined : { scale: 0.98 }}
        >
          <span
            className={cn(
              "truncate",
              selectedOption ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {selectedOption?.label || placeholder}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={listRef}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 400,
              }}
              className={cn(
                "absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg",
                "origin-top"
              )}
            >
              {searchable && (
                <div className="border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={searchPlaceholder}
                      className={cn(
                        "w-full rounded-md border bg-background py-2 pl-8 pr-8 text-sm",
                        "placeholder:text-muted-foreground",
                        "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      )}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = option.value === value
                    const isHighlighted = index === highlightedIndex

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => selectOption(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm",
                          "transition-colors duration-100",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          isHighlighted && "bg-accent/10",
                          isSelected && "bg-accent text-accent-foreground"
                        )}
                        whileHover={
                          option.disabled
                            ? undefined
                            : { backgroundColor: "var(--accent-10)" }
                        }
                        whileTap={
                          option.disabled ? undefined : { scale: 0.98 }
                        }
                      >
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          {option.description && (
                            <div
                              className={cn(
                                "text-xs",
                                isSelected
                                  ? "text-accent-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {option.description}
                            </div>
                          )}
                        </div>
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{
                                type: "spring",
                                damping: 20,
                                stiffness: 400,
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    )
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-1.5 text-xs text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
