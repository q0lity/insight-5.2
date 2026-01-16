import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../ui/icons'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [autoReflect, setAutoReflect] = useState(false)
  const [frequency, setFrequency] = useState('daily')
  const [time, setTime] = useState('08:00')
  const [showPermissionBanner, setShowPermissionBanner] = useState(false)

  const toggleAutoReflect = () => {
    if (!autoReflect) {
      // Logic for permission request simulation
      setShowPermissionBanner(true)
    }
    setAutoReflect(!autoReflect)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="modalOverlay fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-sm grid place-items-center"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-[var(--glass)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col font-['Figtree']"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">Settings</h2>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[var(--glass2)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="flex-1 px-8 py-4 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Auto-Reflect Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-1">
                  <div className="space-y-1">
                    <h3 className="font-bold text-[var(--text)]">Auto-Reflect</h3>
                    <p className="text-sm text-[var(--muted)]">Generate briefs automatically.</p>
                  </div>
                  <button 
                    onClick={toggleAutoReflect}
                    className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${
                      autoReflect ? 'bg-[#3D8856]' : 'bg-[var(--border2)]'
                    }`}
                  >
                    <motion.div 
                      animate={{ x: autoReflect ? 24 : 0 }}
                      className="w-6 h-6 bg-[var(--glass3)] rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {autoReflect && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="p-4 bg-[var(--glass2)] rounded-2xl space-y-4 border border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-[var(--text)]">Frequency</label>
                          <select 
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="bg-transparent text-[var(--accent)] font-bold text-sm outline-none cursor-pointer"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekdays">Weekdays</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                        <div className="h-px bg-[var(--border)]" />
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-[var(--text)]">Schedule</label>
                          <input 
                            type="time" 
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="bg-transparent text-[var(--accent)] font-bold text-sm outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {showPermissionBanner && (
                   <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-[var(--accentSoft)] rounded-2xl flex items-start gap-3 border border-[var(--accentBorder)]"
                   >
                     <div className="text-[var(--accent)] mt-0.5">
                        <Icon name="bolt" size={16} />
                     </div>
                     <div className="space-y-1">
                        <p className="text-sm font-bold text-[var(--accent)]">Enable Notifications</p>
                        <p className="text-xs text-[var(--accent)]/70 leading-relaxed">
                          Briefs work best when they can find you. Enable notifications in System Settings to receive your daily reflections.
                        </p>
                     </div>
                     <button 
                        onClick={() => setShowPermissionBanner(false)}
                        className="text-[var(--accent)]/40 hover:text-[var(--accent)]"
                     >
                        <Icon name="x" size={14} />
                     </button>
                   </motion.div>
                )}
              </div>

              {/* Other Settings Placeholder */}
              <div className="space-y-6 pt-4 border-t border-[var(--border)]">
                 <div className="flex items-center justify-between group cursor-pointer">
                    <span className="font-bold text-[var(--text)]">Export All Data</span>
                    <Icon name="chevronRight" className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />
                 </div>
                 <div className="flex items-center justify-between group cursor-pointer">
                    <span className="font-bold text-[var(--text)]">Privacy Policy</span>
                    <Icon name="chevronRight" className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors" />
                 </div>
                 <div className="flex items-center justify-between group cursor-pointer">
                    <span className="font-bold text-red-500">Delete Account</span>
                    <Icon name="chevronRight" className="text-red-500/50 group-hover:text-red-500 transition-colors" />
                 </div>
              </div>
            </div>

            <div className="p-8 bg-[var(--glass2)] border-t border-[var(--border)]">
               <button 
                onClick={onClose}
                className="w-full py-4 bg-[var(--accent)] border border-[var(--accentBorder)] text-white rounded-2xl font-bold shadow-[0_12px_24px_var(--glowSoft)] transition-transform active:scale-95"
               >
                Done
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
