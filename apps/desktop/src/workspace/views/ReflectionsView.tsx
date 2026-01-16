import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/icons'
import { listReflections, type Reflection } from '../../storage/reflections'

export function ReflectionsView() {
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null)
  const [viewMode, setViewMode] = useState<'reflections' | 'archive'>('reflections')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    void listReflections().then(setReflections)
  }, [])

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      // In a real app, this would trigger LLM synthesis
    }, 3000)
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] font-['Figtree'] overflow-hidden">
      {/* Header with Segmented Control */}
      <div className="px-10 pt-12 pb-8 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-gradient shiny-text">Thoughts</h1>
            <p className="text-base text-[var(--muted)] font-semibold mt-2 uppercase tracking-widest opacity-70">AI Synthesized Wisdom</p>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-3 px-8 py-3 bg-[var(--accent)] border border-[var(--accentBorder)] text-white rounded-[20px] font-black uppercase tracking-widest shadow-[0_16px_32px_var(--glowSoft)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 border-beam`}
          >
            <Icon name="sparkle" className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Synthesizing...' : 'Reflect Now'}
          </button>
        </div>

        <div className="flex p-1.5 bg-[var(--glass2)] backdrop-blur border border-[var(--border)] rounded-[22px] shadow-sm w-fit">
          <button
            onClick={() => setViewMode('reflections')}
            className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all ${
              viewMode === 'reflections' ? 'bg-[var(--glass3)] shadow-xl text-[var(--text)] scale-[1.02]' : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Reflections
          </button>
          <button
            onClick={() => setViewMode('archive')}
            className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all ${
              viewMode === 'archive' ? 'bg-[var(--glass3)] shadow-xl text-[var(--text)] scale-[1.02]' : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            Archive
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-32 space-y-10 max-w-5xl mx-auto w-full">
        {viewMode === 'reflections' ? (
          <AnimatePresence mode="popLayout">
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glassCard relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[var(--glass2)]/40" />
                <div className="h-10 w-64 bg-[var(--glass2)] rounded-xl mb-6 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-5 w-full bg-[var(--glass2)] rounded-lg animate-pulse" />
                  <div className="h-5 w-5/6 bg-[var(--glass2)] rounded-lg animate-pulse" />
                </div>
                <div className="mt-10 flex gap-2">
                  <span className="text-[var(--accent)] font-bold text-sm flex items-center gap-2">
                    <Icon name="sparkle" size={14} className="animate-spin" />
                    Finding patterns...
                  </span>
                </div>
              </motion.div>
            )}

            {reflections.map((ref) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedReflection(ref)}
                className="glassCard cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {new Date(ref.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex gap-1.5">
                    {ref.themes.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[var(--accent)]/20" />
                    ))}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-[var(--accent)] transition-colors tracking-tight">{ref.title}</h3>
                <p className="text-[var(--muted)] text-lg font-medium line-clamp-3 leading-relaxed opacity-80">
                  {ref.summary}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {ref.themes.map(t => (
                    <span key={t.title} className="text-[10px] font-bold px-3 py-1.5 bg-[var(--accentSoft)] text-[var(--accent)] rounded-full uppercase tracking-widest border border-[var(--accentBorder)]">
                      {t.title}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}

            {reflections.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Icon name="sparkle" size={48} className="mb-4" />
                <p className="font-bold">No reflections yet.</p>
                <p className="text-sm">Capture more notes to generate your first synthesis.</p>
              </div>
            )}
          </AnimatePresence>
        ) : (
          <div className="py-10 text-center text-[var(--muted)]">
            <p className="font-bold">The Archive</p>
            <p className="text-sm">All reflected notes are stored here securely.</p>
          </div>
        )}
      </div>

      {/* Full Screen Reflection Detail - Portaled to body to escape overflow constraints */}
      {createPortal(
        <AnimatePresence>
          {selectedReflection && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden"
            >
              <div className="px-6 pt-8 pb-4 flex items-center justify-between">
                <button
                  onClick={() => setSelectedReflection(null)}
                  className="w-10 h-10 rounded-full bg-[var(--glass2)] shadow-md flex items-center justify-center text-[var(--text)]"
                >
                  <Icon name="chevronDown" />
                </button>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-[var(--glass2)] rounded-full font-bold text-sm shadow-sm border border-[var(--border)]">
                    Share
                  </button>
                  <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-full font-bold text-sm shadow-lg shadow-[var(--accent)]/20">
                    Export
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-12 py-16 space-y-16 max-w-4xl mx-auto w-full">
                <div className="space-y-6">
                  <span className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--muted)] block text-center">
                    {new Date(selectedReflection.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <h1 className="text-6xl font-serif font-bold leading-[1.1] text-[var(--text)] text-center tracking-tight">
                    {selectedReflection.title}
                  </h1>
                  <p className="text-2xl text-[var(--text)] font-medium leading-relaxed opacity-70 text-center max-w-2xl mx-auto">
                    {selectedReflection.summary}
                  </p>
                </div>

                <div className="space-y-20 pt-10">
                  {selectedReflection.themes.map((theme) => (
                    <div key={theme.title} className="space-y-8">
                      <div className="flex items-center gap-4">
                          <div className="h-px flex-1 bg-[var(--border)]" />
                          <h2 className="text-sm font-bold tracking-[0.2em] text-[var(--accent)] uppercase text-center">
                          {theme.title}
                          </h2>
                          <div className="h-px flex-1 bg-[var(--border)]" />
                      </div>
                      <div className="max-w-2xl mx-auto">
                        <p className="text-2xl font-serif leading-[1.6] text-[var(--text)] first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-[var(--accent)]">
                          {theme.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-10 pb-20 text-center opacity-30">
                  <Icon name="sparkle" size={24} className="mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">End of Synthesis</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
      `}</style>
    </div>
  )
}
