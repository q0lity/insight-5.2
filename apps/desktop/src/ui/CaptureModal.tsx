import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from './icons'
import { CapturePreview } from './CapturePreview'
import { AudioWaveform } from './AudioWaveform'

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
  habitNames?: string[]
  extendedMode?: boolean
  onToggleExtendedMode?: () => void
  anchorMs?: number
  onSuccess?: () => void
}

const LOADING_PHRASES = [
  "Reading your thoughts...",
  "Finding patterns...",
  "Organizing themes...",
  "Restoring context...",
  "Almost there..."
]

// Error messages with helpful context
const ERROR_MESSAGES: Record<string, { title: string; description: string; icon: string }> = {
  'permission': {
    title: 'Microphone Access Required',
    description: 'Please allow microphone access in your browser settings to use voice capture.',
    icon: 'mic-off'
  },
  'network': {
    title: 'Connection Issue',
    description: 'Unable to reach the server. Check your internet connection and try again.',
    icon: 'wifi-off'
  },
  'default': {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    icon: 'alert-circle'
  }
}

function getErrorInfo(error: string): { title: string; description: string; icon: string } {
  const lowerError = error.toLowerCase()
  if (lowerError.includes('permission') || lowerError.includes('microphone') || lowerError.includes('denied')) {
    return ERROR_MESSAGES.permission
  }
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return ERROR_MESSAGES.network
  }
  return { ...ERROR_MESSAGES.default, description: error }
}

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
  habitNames,
  extendedMode = false,
  onToggleExtendedMode,
  anchorMs,
  onSuccess,
}: CaptureModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Track recording start time
  useEffect(() => {
    if (isListening && !recordingStartTime) {
      setRecordingStartTime(Date.now())
    } else if (!isListening && recordingStartTime) {
      setRecordingStartTime(null)
    }
  }, [isListening, recordingStartTime])

  // Combine draft + interim for live preview
  const previewText = useMemo(() => {
    const combined = draft + (interimTranscript ? ` ${interimTranscript}` : '')
    return combined.trim()
  }, [draft, interimTranscript])

  // Auto-focus and dynamic sizing
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
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

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      // Escape to close (only if not saving)
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault()
        onClose()
      }
      // Cmd/Ctrl + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && draft.trim() && !isSaving) {
        e.preventDefault()
        onSave()
      }
      // Space to toggle listening (only when textarea not focused)
      if (e.key === ' ' && document.activeElement !== textareaRef.current && !isSaving) {
        e.preventDefault()
        onToggleListening()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSaving, draft, onClose, onSave, onToggleListening])

  // Handle successful save
  const handleSave = useCallback(() => {
    onSave()
  }, [onSave])

  // Show success state when save completes
  useEffect(() => {
    // Detect when saving transitions from true to false without error
    if (!isSaving && !error && draft.trim() === '' && progress.length > 0) {
      setShowSuccess(true)
      setSuccessMessage('Capture saved successfully!')
      const timer = setTimeout(() => {
        setShowSuccess(false)
        onSuccess?.()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSaving, error, draft, progress.length, onSuccess])

  // Dynamic text sizing based on length
  const getTextSizeClass = (length: number) => {
    if (length < 120) return 'text-xl'
    if (length < 320) return 'text-lg'
    return 'text-base'
  }

  const errorInfo = error ? getErrorInfo(error) : null

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="modalOverlay fixed inset-0 z-50 grid place-items-center bg-[rgba(15,23,42,0.32)] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSaving) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`captureModalCard w-[min(92vw,880px)] bg-[var(--panel)] shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] ${isListening ? 'recording' : ''}`}
          >
            {/* Success Overlay */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  className="captureSuccessOverlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="captureSuccessContent"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                  >
                    <div className="captureSuccessIcon">
                      <motion.div
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <Icon name="check" className="w-12 h-12" />
                      </motion.div>
                    </div>
                    <div className="captureSuccessMessage">{successMessage}</div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  {isListening ? 'Recording' : 'Ready'}
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors disabled:opacity-50"
                title="Close (Esc)"
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

            {/* Waveform Visualization */}
            <AudioWaveform
              isActive={isListening}
              startTime={recordingStartTime ?? undefined}
              barCount={32}
              showTimer={true}
            />

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
                    <span className="captureInterimDots">
                      <span className="captureInterimDot" />
                      <span className="captureInterimDot" />
                      <span className="captureInterimDot" />
                    </span>
                    <span className="captureInterimText">{interimTranscript}</span>
                  </div>
                )}
              </div>

              {previewText && (
                <div className="capturePreviewPanel">
                  <CapturePreview text={previewText} isProcessing={isListening} compact habitNames={habitNames} />
                </div>
              )}
            </div>

            {/* Status / Progress / Error */}
            <AnimatePresence mode="wait">
              {errorInfo && (
                <motion.div
                  className="captureErrorBar"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="captureErrorIcon">
                    <Icon name={errorInfo.icon as any} className="w-5 h-5" />
                  </div>
                  <div className="captureErrorContent">
                    <div className="captureErrorTitle">{errorInfo.title}</div>
                    <div className="captureErrorDescription">{errorInfo.description}</div>
                  </div>
                </motion.div>
              )}
              {!errorInfo && (isSaving || aiStatus || progress.length > 0) && (
                <motion.div
                  className="captureStatusBar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {isSaving ? (
                    <div className="captureLoadingState">
                      <div className="captureLoadingShimmer" />
                      <span className="captureLoadingText">
                        {LOADING_PHRASES[loadingPhraseIndex]}
                      </span>
                    </div>
                  ) : (
                    aiStatus && <div className="text-[var(--muted)]">{aiStatus}</div>
                  )}
                  {progress.length > 0 && !isSaving && (
                    <div className="text-[var(--muted)] opacity-70">
                      {progress[progress.length - 1]}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Actions */}
            <div className="captureFooter">
              <div className="captureFooterLeft">
                <button
                  onClick={onToggleListening}
                  disabled={isSaving}
                  className={`captureControlBtn ${isListening ? 'captureControlBtnStop' : 'captureControlBtnStart'}`}
                >
                  <Icon name={isListening ? 'square' : 'mic'} className="captureControlIcon" />
                  <span className="captureControlLabel">{isListening ? 'Stop' : 'Record'}</span>
                  <span className="captureControlHint">{isListening ? 'Space' : 'Space'}</span>
                </button>
              </div>

              <div className="captureFooterRight">
                <button
                  onClick={() => {
                    if (isListening) onToggleListening()
                    setDraft('')
                  }}
                  disabled={isSaving || (!draft && !isListening)}
                  className="captureControlBtn captureControlBtnSecondary"
                >
                  <Icon name="x" className="captureControlIcon" />
                  <span className="captureControlLabel">Cancel</span>
                  <span className="captureControlHint">Esc</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !draft.trim()}
                  className="captureControlBtn captureControlBtnPrimary"
                >
                  <Icon name="check" className="captureControlIcon" />
                  <span className="captureControlLabel">{isSaving ? 'Saving...' : 'Save'}</span>
                  <span className="captureControlHint">⌘↵</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
