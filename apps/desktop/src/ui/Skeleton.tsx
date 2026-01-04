/**
 * Skeleton Loading Component
 *
 * Provides placeholder loading states for content that's being fetched.
 * Uses CSS animations for smooth pulse effect.
 */

import { motion } from 'framer-motion'

type SkeletonProps = {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  animate?: boolean
}

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'lg',
  animate = true,
}: SkeletonProps) {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded]

  return (
    <div
      className={`bg-[var(--panel)] ${roundedClass} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{
        width: width,
        height: height,
      }}
    />
  )
}

/**
 * Skeleton for text content
 */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
          rounded="md"
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for a card/item in a list
 */
export function SkeletonCard({
  className = '',
  showIcon = true,
  showMeta = true,
}: {
  className?: string
  showIcon?: boolean
  showMeta?: boolean
}) {
  return (
    <div className={`p-4 bg-[var(--panel)] rounded-2xl space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        {showIcon && <Skeleton width={40} height={40} rounded="xl" />}
        <div className="flex-1 space-y-2">
          <Skeleton height={18} width="70%" rounded="md" />
          {showMeta && <Skeleton height={14} width="40%" rounded="md" />}
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for habit card
 */
export function SkeletonHabitCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 bg-[var(--panel)] rounded-2xl space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton width={44} height={44} rounded="xl" />
          <div className="space-y-2">
            <Skeleton height={18} width={120} rounded="md" />
            <Skeleton height={14} width={80} rounded="md" />
          </div>
        </div>
        <Skeleton width={48} height={24} rounded="full" />
      </div>
      {/* Mini heatmap skeleton */}
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={16} height={16} rounded="sm" />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for event card in timeline
 */
export function SkeletonEventCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-[var(--panel)] rounded-2xl space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton width={12} height={48} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={18} width="60%" rounded="md" />
          <div className="flex gap-2">
            <Skeleton height={14} width={60} rounded="md" />
            <Skeleton height={14} width={40} rounded="md" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton for a note in notes view
 */
export function SkeletonNote({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 bg-[var(--panel)] rounded-2xl space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton height={20} width="50%" rounded="md" />
        <Skeleton height={14} width={60} rounded="md" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton height={24} width={50} rounded="full" />
        <Skeleton height={24} width={60} rounded="full" />
      </div>
    </div>
  )
}

/**
 * Skeleton for stats/metrics grid
 */
export function SkeletonStatsGrid({
  count = 4,
  className = '',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-[var(--panel)] rounded-2xl space-y-2">
          <Skeleton height={12} width="60%" rounded="md" />
          <Skeleton height={28} width="80%" rounded="md" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for rewards/progress card
 */
export function SkeletonProgressCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-6 bg-[var(--panel)] rounded-2xl space-y-6 ${className}`}>
      <div className="flex items-center justify-center">
        <Skeleton width={120} height={120} rounded="full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-[var(--bg)] rounded-xl space-y-2">
          <Skeleton height={10} width="60%" rounded="md" />
          <Skeleton height={20} width="80%" rounded="md" />
        </div>
        <div className="p-4 bg-[var(--bg)] rounded-xl space-y-2">
          <Skeleton height={10} width="60%" rounded="md" />
          <Skeleton height={20} width="80%" rounded="md" />
        </div>
      </div>
    </div>
  )
}

/**
 * Full view skeleton - for when entire view is loading
 */
export function SkeletonView({
  type = 'list',
  count = 5,
  className = '',
}: {
  type?: 'list' | 'grid' | 'cards'
  count?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`space-y-4 ${className}`}
    >
      {type === 'list' &&
        Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      {type === 'cards' &&
        Array.from({ length: count }).map((_, i) => (
          <SkeletonHabitCard key={i} />
        ))}
      {type === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
