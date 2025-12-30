import { useState, useEffect } from 'react'
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
    <div className="flex flex-col h-full bg-[#F2F0ED] text-[#1C1C1E] font-['Figtree'] overflow-hidden">
      {/* Header with Segmented Control */}
      <div className="px-10 pt-12 pb-8 bg-[#F2F0ED]/80 backdrop-blur-xl sticky top-0 z-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-gradient shiny-text">Thoughts</h1>
            <p className="text-base text-[#86868B] font-semibold mt-2 uppercase tracking-widest opacity-70">AI Synthesized Wisdom</p>
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-3 px-8 py-3 bg-[#D95D39] text-white rounded-[20px] font-black uppercase tracking-widest shadow-2xl shadow-[#D95D39]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 border-beam`}
          >
            <Icon name="sparkle" className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Synthesizing...' : 'Reflect Now'}
          </button>
        </div>

        <div className="flex p-1.5 bg-white/40 backdrop-blur border border-white/20 rounded-[22px] shadow-sm w-fit">
          <button
            onClick={() => setViewMode('reflections')}
            className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all ${
              viewMode === 'reflections' ? 'bg-white shadow-xl text-[#1C1C1E] scale-[1.02]' : 'text-[#86868B] hover:text-[#1C1C1E]'
            }`}
          >
            Reflections
          </button>
          <button
            onClick={() => setViewMode('archive')}
            className={`px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all ${
              viewMode === 'archive' ? 'bg-white shadow-xl text-[#1C1C1E] scale-[1.02]' : 'text-[#86868B] hover:text-[#1C1C1E]'
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
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5B5F97]/5 to-transparent animate-shimmer" 
                     style={{ backgroundSize: '200% 100%' }} />
                <div className="h-10 w-64 bg-[#F2F0ED] rounded-xl mb-6 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-5 w-full bg-[#F2F0ED] rounded-lg animate-pulse" />
                  <div className="h-5 w-5/6 bg-[#F2F0ED] rounded-lg animate-pulse" />
                </div>
                <div className="mt-10 flex gap-2">
                  <span className="text-[#5B5F97] font-bold text-sm flex items-center gap-2">
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
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">
                    {new Date(ref.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex gap-1.5">
                    {ref.themes.slice(0, 3).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#5B5F97]/20" />
                    ))}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-[#D95D39] transition-colors tracking-tight">{ref.title}</h3>
                <p className="text-[#86868B] text-lg font-medium line-clamp-3 leading-relaxed opacity-80">
                  {ref.summary}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {ref.themes.map(t => (
                    <span key={t.title} className="text-[10px] font-bold px-3 py-1.5 bg-[#FCECE8] text-[#D95D39] rounded-full uppercase tracking-widest border border-[#D95D39]/5">
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
          <div className="py-10 text-center text-[#8E8E93]">
            <p className="font-bold">The Archive</p>
            <p className="text-sm">All reflected notes are stored here securely.</p>
          </div>
        )}
      </div>

      {/* Full Screen Reflection Detail */}
      <AnimatePresence>
        {selectedReflection && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#F2F0ED] flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-8 pb-4 flex items-center justify-between">
              <button 
                onClick={() => setSelectedReflection(null)}
                className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#1C1C1E]"
              >
                <Icon name="chevronDown" />
              </button>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white rounded-full font-bold text-sm shadow-sm border border-[#E5E5EA]">
                  Share
                </button>
                <button className="px-4 py-2 bg-[#D95D39] text-white rounded-full font-bold text-sm shadow-lg shadow-[#D95D39]/20">
                  Export
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-12 py-16 space-y-16 max-w-4xl mx-auto w-full">
              <div className="space-y-6">
                <span className="text-sm font-bold uppercase tracking-[0.3em] text-[#86868B] block text-center">
                  {new Date(selectedReflection.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <h1 className="text-6xl font-serif font-bold leading-[1.1] text-[#1C1C1E] text-center tracking-tight">
                  {selectedReflection.title}
                </h1>
                <p className="text-2xl text-[#1C1C1E] font-medium leading-relaxed opacity-70 text-center max-w-2xl mx-auto">
                  {selectedReflection.summary}
                </p>
              </div>

              <div className="space-y-20 pt-10">
                {selectedReflection.themes.map((theme) => (
                  <div key={theme.title} className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E5E5EA]" />
                        <h2 className="text-sm font-bold tracking-[0.2em] text-[#D95D39] uppercase text-center">
                        {theme.title}
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E5E5EA]" />
                    </div>
                    <div className="max-w-2xl mx-auto">
                      <p className="text-2xl font-serif leading-[1.6] text-[#1C1C1E] first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-[#D95D39]">
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
      </AnimatePresence>

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
