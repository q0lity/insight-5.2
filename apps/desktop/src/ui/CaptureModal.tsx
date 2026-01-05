import { useEffect, useRef, useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './icons'
import { CapturePreview } from './CapturePreview'

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
  extendedMode?: boolean
  onToggleExtendedMode?: () => void
  anchorMs?: number
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
  extendedMode = false,
  onToggleExtendedMode,
  anchorMs,
}: CaptureModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0)

  // Combine draft + interim for live preview
  const previewText = useMemo(() => {
    const combined = draft + (interimTranscript ? ` ${interimTranscript}` : '')
    return combined.trim()
  }, [draft, interimTranscript])

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
    if (length < 120) return 'text-xl'
    if (length < 320) return 'text-lg'
    return 'text-base'
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
            className={`captureModalCard w-[min(92vw,880px)] bg-[var(--panel)] shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] ${isListening ? 'recording' : ''}`}
          >
            {/* Header */}
            <div className="captureModalHeader">
              <div className="captureModalHeaderLeft">
                <h2 className="text-lg font-bold text-[var(--text)] tracking-tight">Capture</h2>
                {onToggleExtendedMode && (
                  <button
                    onClick={onToggleExtendedMode}
                    className={`extended-toggle ${extendedMode ? 'active' : ''}`}
                    title={extendedMode ? 'Extended mode: up to 1 hour' : 'Click for extended recording (up to 1 hour)'}
                  >
                    <Icon name="bolt" size={14} />
                    {extendedMode ? '1hr' : 'Extend'}
                  </button>
                )}
                <div className={`captureLivePill ${isListening ? 'active' : ''}`}>
                  <span className="captureLiveDot" />
                  {isListening ? 'Listening' : 'Ready'}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {attachEventId && (
              <div className="captureAttachRow">
                <span className="captureAttachLabel">Appending to</span>
                <span className="captureAttachTitle">{attachedEventTitle}</span>
                <button onClick={onDetachEvent} className="captureAttachDetach" title="Detach">
                  <Icon name="x" className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Main Input + Preview */}
            <div className="captureModalBody">
              <div className="captureSheet">
                <div className="captureSheetHeader">
                  <div className="captureSheetTitle">Live transcript</div>
                  <div className="captureSheetMeta">
                    <span className={`captureSheetStatus ${isListening ? 'active' : ''}`}>
                      {isListening ? 'Transcribing' : 'Idle'}
                    </span>
                    <span className="captureSheetCount">{draft.length} chars</span>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Start talking or type your notes..."
                  className={`captureTextarea ${getTextSizeClass(draft.length)}`}
                />
                {isListening && interimTranscript && (
                  <div className="captureInterim">
                    <span className="captureInterimLead">...</span> {interimTranscript}
                  </div>
                )}
              </div>

              {previewText && (
                <div className="capturePreviewPanel">
                  <CapturePreview text={previewText} isProcessing={isListening} compact />
                </div>
              )}
            </div>

            {/* Status / Progress */}
            {(isSaving || aiStatus || error || progress.length > 0) && (
              <div className="captureStatusBar">
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
            <div className="captureFooter">
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
