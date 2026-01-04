import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initTheme } from './ui/theme'
import { ErrorBoundary, installGlobalErrorHandlers } from './ui/error-boundary'
import { bootstrapSupabaseAuth } from './supabase/bootstrap'

const rootEl = document.getElementById('root')

function formatError(err: unknown) {
  if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack ?? ''}`
  return typeof err === 'string' ? err : JSON.stringify(err, null, 2)
}

function renderFatal(err: unknown) {
  const target = rootEl ?? document.body
  const msg = formatError(err)
  const container = document.createElement('div')
  container.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(0,0,0,0.75)',
    'color:#e5e7eb',
    'display:grid',
    'place-items:center',
    'padding:24px',
    'z-index:100000',
    'font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    'font-size:12px',
  ].join(';')
  container.innerHTML = `
    <div style="max-width:980px; width:100%; background:#111827; border:1px solid #374151; border-radius:12px; padding:16px; white-space:pre-wrap;">
      <div style="font-weight:700; margin-bottom:8px;">App boot failed</div>
      <div>${msg.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] ?? ch))}</div>
    </div>
  `
  target.appendChild(container)
}

installGlobalErrorHandlers((err) => {
  console.error('Global error:', err)
  renderFatal(err)
})

try {
  initTheme()
} catch (e) {
  console.error('initTheme failed:', e)
}

void bootstrapSupabaseAuth()

async function boot() {
  if (!rootEl) {
    renderFatal(new Error('Root element #root not found in document.'))
    return
  }
  try {
    const { default: App } = await import('./App.tsx')
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  } catch (err) {
    console.error('App boot failed:', err)
    renderFatal(err)
  }
}

void boot()
