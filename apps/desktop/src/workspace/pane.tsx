import { type ReactNode, useRef, useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export type WorkspaceViewKey =
  | 'dashboard'
  | 'notes'
  | 'goals'
  | 'goal-detail'
  | 'ecosystem'
  | 'projects'
  | 'trackers'
  | 'habits'
  | 'rewards'
  | 'reports'
  | 'health'
  | 'people'
  | 'places'
  | 'tags'
  | 'tasks'
  | 'calendar'
  | 'assistant'
  | 'settings'
  | 'timeline'
  | 'reflections'

export type WorkspaceTab = {
  id: string
  title: string
  view: WorkspaceViewKey
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
}

export function Pane(props: {
  title?: string
  tabs: WorkspaceTab[]
  activeTabId: string
  onActivate: (id: string) => void
  onClose?: (id: string) => void
  onFocus?: () => void
  children: ReactNode
}) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    if (!tabsRef.current) return
    const activeButton = tabsRef.current.querySelector('.wsTab.active') as HTMLElement | null
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [props.activeTabId, props.tabs])

  return (
    <div className="wsPaneRoot" onMouseDown={props.onFocus}>
      <div className="wsTabbar">
        <div className="wsTabs" ref={tabsRef}>
          {props.tabs.map((t) => (
            <button
              key={t.id}
              className={t.id === props.activeTabId ? 'wsTab active' : 'wsTab'}
              onClick={() => props.onActivate(t.id)}>
              <span className="wsTabTitle">{t.title}</span>
              {props.onClose && props.tabs.length > 1 ? (
                <span
                  className="wsTabClose"
                  role="button"
                  aria-label="Close tab"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    props.onClose?.(t.id)
                  }}>
                  ×
                </span>
              ) : null}
            </button>
          ))}
          <motion.div
            className="wsTabIndicator"
            layoutId="tab-indicator"
            initial={false}
            animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </div>
      </div>
      <div className="wsPaneBody">
        <AnimatePresence mode="wait">
          <motion.div
            key={props.activeTabId}
            className="wsPaneContent"
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
          >
            {props.children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
