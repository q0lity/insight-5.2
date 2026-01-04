import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnimatedNumber } from './useAnimatedNumber'

type ActiveSessionBannerProps = {
  title: string
  category?: string | null
  subcategory?: string | null
  startedAt: number
  estimatedMinutes?: number | null
  importance?: number | null
  difficulty?: number | null
  onStop: () => void
  onOpen?: () => void
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function calculateXP(elapsedMs: number, importance: number, difficulty: number) {
  const minutes = elapsedMs / 60000
  const base = importance * difficulty * minutes
  return Math.round(base * 100) / 100
}

export function ActiveSessionBanner({
  title,
  category,
  subcategory,
  startedAt,
  estimatedMinutes,
  importance = 5,
  difficulty = 5,
  onStop,
  onOpen,
}: ActiveSessionBannerProps) {
  const [now, setNow] = useState(Date.now())
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])

  const elapsedMs = now - startedAt
  const totalMs = estimatedMinutes != null ? estimatedMinutes * 60 * 1000 : null
  const remainingMs = totalMs != null ? Math.max(0, totalMs - elapsedMs) : null
  const progress = totalMs ? Math.min(1, elapsedMs / totalMs) : 0

  const xp = calculateXP(elapsedMs, importance, difficulty)
  const animatedXp = useAnimatedNumber(xp, { durationMs: 300 })

  const breadcrumb = [category, subcategory, title].filter(Boolean).join(' | ')

  return (
    <AnimatePresence mode="wait">
      {minimized ? (
        <motion.div
          key="minimized"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="asbMinimized"
          onClick={() => setMinimized(false)}
        >
          <div className="asbMinDot" />
          <span className="asbMinTitle">{title}</span>
          <span className="asbMinClock">{formatClock(elapsedMs)}</span>
          <span className="asbMinXp">+{animatedXp.toFixed(1)} XP</span>
          <button className="asbMinExpand" aria-label="Expand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="asbRoot"
        >
          <div className="asbLine" />
          <div className="asbContent">
            <div className="asbHeader">
              <div className="asbHeaderLeft">
                <div className="asbDot">
                  <motion.div
                    className="asbDotPulse"
                    animate={{ scale: [1, 1.8, 2], opacity: [0.6, 0.2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                </div>
                <span className="asbLabel">ACTIVE SESSION</span>
              </div>
              <button className="asbMinimizeBtn" onClick={() => setMinimized(true)} aria-label="Minimize">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>

            {breadcrumb !== title && (
              <div className="asbBreadcrumb">{breadcrumb}</div>
            )}

            <div className="asbTitle">{title}</div>

            <div className="asbClock">{formatClock(elapsedMs)}</div>

            {totalMs != null && (
              <div className="asbProgressWrap">
                <div className="asbProgressTrack">
                  <motion.div
                    className="asbProgressFill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <span className="asbProgressPct">{Math.round(progress * 100)}%</span>
              </div>
            )}

            {remainingMs != null && remainingMs > 0 && (
              <div className="asbRemaining">{formatClock(remainingMs)} remaining</div>
            )}

            <div className="asbXp">+{animatedXp.toFixed(1)} XP</div>

            <div className="asbActions">
              {onOpen && (
                <button className="asbOpenBtn" onClick={onOpen}>
                  Open
                </button>
              )}
              <button className="asbStopBtn" onClick={onStop}>
                Stop Session
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
