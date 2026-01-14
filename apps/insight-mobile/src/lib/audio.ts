import type { Audio } from 'expo-av'

let cachedAudio: typeof import('expo-av') | null = null

function getAudioModule() {
  if (cachedAudio) return cachedAudio
  try {
    cachedAudio = require('expo-av')
    return cachedAudio
  } catch {
    return null
  }
}

// Small, voice-first recording profile (mono AAC) to keep uploads light.
export function getRecordingOptions(): Audio.RecordingOptions | null {
  const audio = getAudioModule()
  if (!audio?.Audio) return null
  const { Audio: ExpoAudio } = audio
  return {
    isMeteringEnabled: true,
    android: {
      extension: '.m4a',
      outputFormat: ExpoAudio.AndroidOutputFormat.MPEG_4,
      audioEncoder: ExpoAudio.AndroidAudioEncoder.AAC,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: ExpoAudio.IOSOutputFormat.MPEG4AAC,
      audioQuality: ExpoAudio.IOSAudioQuality.MEDIUM,
      sampleRate: 22050,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 64000,
    },
  }
}
