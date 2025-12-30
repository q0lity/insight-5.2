import type { ReactNode } from 'react'

export type WorkspaceViewKey =
  | 'dashboard'
  | 'notes'
  | 'goals'
  | 'goal-detail'
  | 'projects'
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

export function Pane(props: {
  title?: string
  tabs: WorkspaceTab[]
  activeTabId: string
  onActivate: (id: string) => void
  onClose?: (id: string) => void
  onFocus?: () => void
  children: ReactNode
}) {
  return (
    <div className="wsPaneRoot" onMouseDown={props.onFocus}>
      <div className="wsTabbar">
        <div className="wsTabs">
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
        </div>
      </div>
      <div className="wsPaneBody">{props.children}</div>
    </div>
  )
}
