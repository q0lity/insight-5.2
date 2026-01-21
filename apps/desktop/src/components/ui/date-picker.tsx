"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  highlightedDates?: Date[]
  rangeStart?: Date | null
  rangeEnd?: Date | null
  onRangeChange?: (start: Date | null, end: Date | null) => void
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false
  const time = date.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  const endDate = new Date(lastDay)
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))

  const days: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({
    value,
    onChange,
    placeholder = "Select date",
    label,
    error,
    disabled = false,
    className,
    minDate,
    maxDate,
    highlightedDates = [],
    rangeStart,
    rangeEnd,
    onRangeChange,
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [viewDate, setViewDate] = React.useState(value || new Date())
    const [hoverDate, setHoverDate] = React.useState<Date | null>(null)
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const isRangeMode = onRangeChange !== undefined

    const today = React.useMemo(() => new Date(), [])
    const monthDays = React.useMemo(
      () => getMonthDays(viewDate.getFullYear(), viewDate.getMonth()),
      [viewDate]
    )

    // Close on outside click
    React.useEffect(() => {
      if (!isOpen) return
      const handleClick = (e: MouseEvent) => {
        if (
          triggerRef.current?.contains(e.target as Node) ||
          containerRef.current?.contains(e.target as Node)
        )
          return
        setIsOpen(false)
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }, [isOpen])

    const goToPrevMonth = () => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
    }

    const handleDayClick = (day: Date) => {
      if (isRangeMode) {
        if (!rangeStart || (rangeStart && rangeEnd)) {
          onRangeChange?.(day, null)
        } else {
          if (day < rangeStart) {
            onRangeChange?.(day, rangeStart)
          } else {
            onRangeChange?.(rangeStart, day)
          }
          setIsOpen(false)
        }
      } else {
        onChange?.(day)
        setIsOpen(false)
      }
    }

    const isDateDisabled = (date: Date) => {
      if (minDate && date < minDate) return true
      if (maxDate && date > maxDate) return true
      return false
    }

    const isDateHighlighted = (date: Date) => {
      return highlightedDates.some((d) => isSameDay(d, date))
    }

    const displayValue = isRangeMode
      ? rangeStart && rangeEnd
        ? `${formatDate(rangeStart)} - ${formatDate(rangeEnd)}`
        : rangeStart
        ? `${formatDate(rangeStart)} - ...`
        : placeholder
      : value
      ? formatDate(value)
      : placeholder

    const previewRange = isRangeMode && rangeStart && !rangeEnd && hoverDate
      ? { start: rangeStart < hoverDate ? rangeStart : hoverDate, end: rangeStart < hoverDate ? hoverDate : rangeStart }
      : null

    return (
      <div ref={ref} className={cn("relative", className)}>
        {label && (
          <label className={cn(
            "mb-1.5 block text-sm font-semibold transition-colors",
            error ? "text-destructive" : "text-foreground"
          )}>
            {label}
          </label>
        )}

        <motion.button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border-2 bg-background px-3 py-2 text-sm",
            "transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-destructive focus-visible:ring-destructive/30"
              : isOpen
              ? "border-accent ring-2 ring-accent/30"
              : "border-border hover:border-accent/50 focus-visible:border-accent focus-visible:ring-accent/30",
          )}
          whileTap={disabled ? undefined : { scale: 0.98 }}
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className={cn(
            "flex-1 text-left truncate",
            (value || (rangeStart && rangeEnd)) ? "text-foreground" : "text-muted-foreground"
          )}>
            {displayValue}
          </span>
          {(value || rangeStart) && (
            <motion.button
              type="button"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={(e) => {
                e.stopPropagation()
                if (isRangeMode) {
                  onRangeChange?.(null, null)
                } else {
                  onChange?.(null)
                }
              }}
              className="rounded p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </motion.button>
          )}
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="absolute left-0 z-50 mt-1 w-72 origin-top rounded-xl border bg-popover p-3 shadow-xl"
            >
              {/* Header with month navigation */}
              <div className="mb-3 flex items-center justify-between">
                <motion.button
                  type="button"
                  onClick={goToPrevMonth}
                  className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
                <span className="font-semibold text-foreground">
                  {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <motion.button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded-lg p-1.5 hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Day labels */}
              <div className="mb-1 grid grid-cols-7 gap-1">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === viewDate.getMonth()
                  const isToday = isSameDay(day, today)
                  const isSelected = value ? isSameDay(day, value) : false
                  const isRangeSelected = isRangeMode && (
                    (rangeStart && isSameDay(day, rangeStart)) ||
                    (rangeEnd && isSameDay(day, rangeEnd))
                  )
                  const inRange = isRangeMode && (
                    isInRange(day, rangeStart, rangeEnd) ||
                    (previewRange && isInRange(day, previewRange.start, previewRange.end))
                  )
                  const isDisabled = isDateDisabled(day)
                  const isHighlighted = isDateHighlighted(day)

                  return (
                    <motion.button
                      key={idx}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => setHoverDate(day)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all",
                        "disabled:cursor-not-allowed disabled:opacity-30",
                        !isCurrentMonth && "text-muted-foreground/40",
                        isCurrentMonth && !isSelected && !isRangeSelected && "text-foreground hover:bg-accent/10",
                        isToday && !isSelected && !isRangeSelected && "font-bold text-accent",
                        (isSelected || isRangeSelected) && "bg-accent text-accent-foreground",
                        inRange && !isSelected && !isRangeSelected && "bg-accent/20",
                        isHighlighted && !isSelected && "ring-2 ring-accent/50"
                      )}
                      whileHover={isDisabled ? undefined : { scale: 1.1 }}
                      whileTap={isDisabled ? undefined : { scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.01, duration: 0.15 }}
                    >
                      {day.getDate()}
                      {isHighlighted && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Today button */}
              <div className="mt-3 flex justify-center border-t pt-3">
                <motion.button
                  type="button"
                  onClick={() => {
                    setViewDate(today)
                    if (!isRangeMode) {
                      onChange?.(today)
                      setIsOpen(false)
                    }
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Today
                </motion.button>
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
DatePicker.displayName = "DatePicker"

export { DatePicker }
