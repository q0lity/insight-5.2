export function PlaceholderView(props: { title: string; subtitle?: string }) {
  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="title">{props.title}</div>
          <div className="subhead">{props.subtitle ?? 'Coming soon.'}</div>
        </div>
      </div>
      <div className="glassCard">
        <div className="empty">Placeholder.</div>
      </div>
    </div>
  )
}

