import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'

type Breadcrumb = {
  label: string
  onClick?: () => void
}

type Props = {
  title: string
  icon?: IconName
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
}

export function ViewHeader({ title, icon, subtitle, breadcrumbs, actions }: Props) {
  return (
    <header className="viewHeader">
      <div className="flex flex-col gap-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="viewBreadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="breadcrumbSep">/</span>}
                {crumb.onClick ? (
                  <button onClick={crumb.onClick}>{crumb.label}</button>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="viewTitle">
          {icon && <Icon name={icon} size={20} />}
          <span>{title}</span>
          {subtitle && <span className="text-sm font-medium text-[var(--muted)] ml-2">{subtitle}</span>}
        </div>
      </div>
      {actions && <div className="viewActions">{actions}</div>}
    </header>
  )
}
