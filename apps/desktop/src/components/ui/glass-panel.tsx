import * as React from 'react'

import { cn } from '@/lib/utils'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, glow = false, ...props }, ref) => (
    <div ref={ref} className={cn('glassCard glassPanel', glow && 'glassPanelGlow', className)} {...props} />
  ),
)

GlassPanel.displayName = 'GlassPanel'
