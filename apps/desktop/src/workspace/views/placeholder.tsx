import { GlassPanel } from '@/components/ui/glass-panel'

export function PlaceholderView(props: { title: string; subtitle?: string }) {
  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="title">{props.title}</div>
          <div className="subhead">{props.subtitle ?? 'Coming soon.'}</div>
        </div>
      </div>
      <GlassPanel glow>
        <div className="empty">Placeholder.</div>
      </GlassPanel>
    </div>
  )
}
