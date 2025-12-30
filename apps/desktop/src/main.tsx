import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initTheme } from './ui/theme'
import { ErrorBoundary, installGlobalErrorHandlers } from './ui/error-boundary'
import { bootstrapSupabaseAuth } from './supabase/bootstrap'

installGlobalErrorHandlers((err) => {
  console.error('Global error:', err)
})

try {
  initTheme()
} catch (e) {
  console.error('initTheme failed:', e)
}

void bootstrapSupabaseAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
