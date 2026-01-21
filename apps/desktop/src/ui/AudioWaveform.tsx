import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AudioWaveformProps {
  isActive: boolean
  barCount?: number
  showTimer?: boolean
  startTime?: number
  className?: string
}

export function AudioWaveform({
  isActive,
  barCount = 24,
  showTimer = true,
  startTime,
  className = '',
}: AudioWaveformProps) {
  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array(barCount).fill(0.1))
  const [elapsedMs, setElapsedMs] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  // Format elapsed time as MM:SS
  const formattedTime = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [elapsedMs])

  // Update timer
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedMs(0)
      return
    }
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime)
    }, 100)
    return () => clearInterval(interval)
  }, [isActive, startTime])

  // Process audio levels from analyser
  const processAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !isActive) return

    analyserRef.current.getByteFrequencyData(dataArrayRef.current)

    // Map frequency data to our bar count with some smoothing
    const newLevels: number[] = []
    const dataLength = dataArrayRef.current.length
    const sliceWidth = Math.floor(dataLength / barCount)

    for (let i = 0; i < barCount; i++) {
      const start = i * sliceWidth
      const end = start + sliceWidth
      let sum = 0
      for (let j = start; j < end && j < dataLength; j++) {
        sum += dataArrayRef.current[j]
      }
      // Normalize to 0-1 range, with minimum of 0.08 for visual appeal
      const normalized = Math.max(0.08, (sum / sliceWidth) / 255)
      newLevels.push(normalized)
    }

    setAudioLevels(newLevels)
    animationFrameRef.current = requestAnimationFrame(processAudio)
  }, [isActive, barCount])

  // Set up audio context and analyser
  useEffect(() => {
    if (!isActive) {
      // Cleanup when not active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      analyserRef.current = null
      dataArrayRef.current = null
      setAudioLevels(Array(barCount).fill(0.1))
      return
    }

    // Initialize audio analysis
    async function initAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.7
        analyserRef.current = analyser

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

        processAudio()
      } catch (error) {
        console.error('Failed to initialize audio analysis:', error)
        // Generate simulated levels if mic access fails
        simulateLevels()
      }
    }

    // Fallback: simulate audio levels if we can't get mic access
    function simulateLevels() {
      const update = () => {
        if (!isActive) return
        const simulated = Array(barCount).fill(0).map(() =>
          Math.max(0.1, 0.3 + Math.random() * 0.5)
        )
        setAudioLevels(simulated)
        animationFrameRef.current = requestAnimationFrame(update)
      }
      animationFrameRef.current = requestAnimationFrame(update)
    }

    initAudio()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isActive, barCount, processAudio])

  return (
    <div className={`captureWaveformContainer ${className}`}>
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="captureWaveformInner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Pulsing record indicator */}
            <div className="captureRecordIndicator">
              <span className="captureRecordDot" />
              <span className="captureRecordLabel">REC</span>
            </div>

            {/* Waveform bars */}
            <div className="captureWaveformBars">
              {audioLevels.map((level, index) => (
                <motion.div
                  key={index}
                  className="captureWaveformBar"
                  style={{
                    height: `${Math.max(4, level * 40)}px`,
                  }}
                  animate={{
                    height: `${Math.max(4, level * 40)}px`,
                    opacity: 0.6 + level * 0.4,
                  }}
                  transition={{
                    duration: 0.05,
                    ease: 'linear',
                  }}
                />
              ))}
            </div>

            {/* Timer display */}
            {showTimer && (
              <div className="captureWaveformTimer">
                {formattedTime}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
