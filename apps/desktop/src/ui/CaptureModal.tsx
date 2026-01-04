import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './icons'

interface CaptureModalProps {
  isOpen: boolean
  onClose: () => void
  draft: string
  setDraft: (s: string) => void
  isListening: boolean
  onToggleListening: () => void
  interimTranscript: string
  isSaving: boolean
  onSave: () => void
  aiStatus: string
  error: string
  progress: string[]
  attachEventId: string | null
  onDetachEvent: () => void
  attachedEventTitle: string | null
}

const LOADING_PHRASES = [
  "Reading your thoughts...",
  "Finding patterns...",
  "Organizing themes...",
  "Restoring context...",
  "Almost there..."
]

export function CaptureModal({
  isOpen,
  onClose,
  draft,
  setDraft,
  isListening,
  onToggleListening,
  interimTranscript,
  isSaving,
  onSave,
  aiStatus,
  error,
  progress,
  attachEventId,
  onDetachEvent,
  attachedEventTitle,
}: CaptureModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0)

  // Auto-focus and dynamic sizing
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      // Reset height
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isOpen, draft])

  // Smart loading phrases rotation
  useEffect(() => {
    if (!isSaving) {
      setLoadingPhraseIndex(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [isSaving])

  // Dynamic text sizing based on length
  const getTextSizeClass = (length: number) => {
    if (length < 100) return 'text-3xl' // ~22pt
    if (length < 300) return 'text-2xl'
    return 'text-xl' // ~17pt
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="modalOverlay fixed inset-0 z-50 grid place-items-center bg-[rgba(15,23,42,0.32)] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="captureModalCard w-full max-w-3xl bg-[var(--panel)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] relative flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--panel2)]/50 backdrop-blur-md">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">Capture</h2>
                {attachEventId && (
                  <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-[var(--accent)] bg-[var(--accentSoft)] px-2 py-0.5 rounded-full">
                    <span>Appending to: {attachedEventTitle}</span>
                    <button
                      onClick={onDetachEvent}
                      className="hover:text-[var(--text)] transition-colors"
                      title="Detach"
                    >
                      <Icon name="x" className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Main Input Area */}
            <div className="flex-1 relative p-6 flex flex-col min-h-[300px]">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Dump your thoughts..."
                className={`w-full h-full bg-transparent border-none outline-none resize-none font-medium text-[var(--text)] placeholder-[var(--muted2)] leading-relaxed transition-all duration-200 ${getTextSizeClass(draft.length)}`}
                style={{ minHeight: '200px' }}
              />
              
              {/* Interim Voice Transcript Overlay */}
              {isListening && interimTranscript && (
                <div className="absolute bottom-6 left-6 right-6 p-4 bg-[var(--panel)]/90 backdrop-blur border border-[var(--border)] rounded-xl shadow-lg z-10">
                  <p className="text-[var(--muted)] font-bold animate-pulse">
                    ... {interimTranscript}
                  </p>
                </div>
              )}
            </div>

            {/* Status / Progress */}
            {(isSaving || aiStatus || error || progress.length > 0) && (
              <div className="px-6 py-3 bg-[var(--panel2)] border-t border-[var(--border)] text-xs font-bold space-y-1">
                 {error ? (
                    <div className="text-red-500">{error}</div>
                 ) : isSaving ? (
                    <div className="flex items-center gap-2 text-[var(--accent)]">
                        <span className="animate-pulse">✨ {LOADING_PHRASES[loadingPhraseIndex]}</span>
                    </div>
                 ) : (
                    aiStatus && <div className="text-[var(--muted)]">{aiStatus}</div>
                 )}
                 {progress.length > 0 && !isSaving && (
                    <div className="text-[var(--muted)] opacity-70">
                        {progress[progress.length - 1]}
                    </div>
                 )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-4 bg-[var(--panel)] border-t border-[var(--border)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                 <button
                    onClick={onToggleListening}
                    className={`captureVoiceBtn flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        isListening
                        ? 'captureVoiceBtnActive bg-[var(--accent)] text-white shadow-lg'
                        : 'bg-[var(--panel2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)] hover:border-[var(--accent)]/30'
                    }`}
                 >
                    <Icon name="mic" className={isListening ? 'animate-pulse' : ''} />
                    {isListening ? 'Listening...' : 'Voice'}
                 </button>
                 
                 <div className="text-xs font-bold text-[var(--muted2)] hidden sm:block">
                    {draft.length} chars
                 </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                    onClick={() => setDraft('')}
                    disabled={isSaving || !draft}
                    className="px-4 py-2 rounded-xl text-[var(--muted)] font-bold hover:text-[var(--text)] hover:bg-[var(--panel2)] transition-colors disabled:opacity-50"
                >
                    Clear
                </button>
                <button
                    onClick={onSave}
                    disabled={isSaving || !draft.trim()}
                    className="px-6 py-2 rounded-xl bg-[var(--accent)] text-white font-bold shadow-lg shadow-[var(--accentSoft)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                    {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
