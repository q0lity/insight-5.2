import React from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  error: Error | null
  details: string | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, details: null }

  static getDerivedStateFromError(error: Error) {
    return { error, details: error?.stack ?? String(error) }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, details: `${error?.stack ?? String(error)}\n\n${info.componentStack ?? ''}` })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="errRoot" role="alert">
        <div className="errCard">
          <div className="errTitle">App crashed</div>
          <div className="errSub">Open DevTools Console for details. This panel shows the captured stack.</div>
          <pre className="errStack">{this.state.details ?? 'Unknown error'}</pre>
          <button className="errBtn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}

export function installGlobalErrorHandlers(onError: (err: unknown) => void) {
  window.addEventListener('error', (e) => onError((e as ErrorEvent).error ?? (e as ErrorEvent).message))
  window.addEventListener('unhandledrejection', (e) => onError((e as PromiseRejectionEvent).reason))
}

