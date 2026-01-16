import { Audio } from 'expo-av';

type AudioMode = Parameters<typeof Audio.setAudioModeAsync>[0];

// Small, voice-first recording profile (mono AAC) to keep uploads light.
export const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
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
};

const interruptionModeIOS =
  (Audio as { InterruptionModeIOS?: { DoNotMix?: number } }).InterruptionModeIOS?.DoNotMix ??
  (Audio as { INTERRUPTION_MODE_IOS_DO_NOT_MIX?: number }).INTERRUPTION_MODE_IOS_DO_NOT_MIX;

const interruptionModeAndroid =
  (Audio as { InterruptionModeAndroid?: { DoNotMix?: number } }).InterruptionModeAndroid?.DoNotMix ??
  (Audio as { INTERRUPTION_MODE_ANDROID_DO_NOT_MIX?: number }).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;

export const RECORDING_AUDIO_MODE: AudioMode = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: false,
  ...(typeof interruptionModeIOS === 'number' ? { interruptionModeIOS } : {}),
  ...(typeof interruptionModeAndroid === 'number' ? { interruptionModeAndroid } : {}),
};

export const IDLE_AUDIO_MODE: AudioMode = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
};

let activeRecording: Audio.Recording | null = null;

async function stopRecordingInstance(recording: Audio.Recording) {
  try {
    const status = await recording.getStatusAsync();
    if (status.isLoaded) {
      await recording.stopAndUnloadAsync();
      return;
    }
  } catch {
    // ignore status failures
  }
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // ignore stop failures
  }
}

export async function stopActiveRecording() {
  if (!activeRecording) return;
  const current = activeRecording;
  activeRecording = null;
  await stopRecordingInstance(current);
  if (typeof Audio.setAudioModeAsync === 'function') {
    try {
      await Audio.setAudioModeAsync(IDLE_AUDIO_MODE);
    } catch {
      // ignore audio mode reset errors
    }
  }
}

export function registerActiveRecording(recording: Audio.Recording | null) {
  activeRecording = recording;
}

export function clearActiveRecording(recording?: Audio.Recording | null) {
  if (!recording || activeRecording === recording) {
    activeRecording = null;
  }
}

export async function ensureRecordingAudioMode() {
  if (typeof Audio.setAudioModeAsync !== 'function') {
    throw new Error('Audio recording is not available in this build.');
  }
  await Audio.setAudioModeAsync(RECORDING_AUDIO_MODE);
  if (typeof Audio.getAudioModeAsync !== 'function') return;
  const mode = await Audio.getAudioModeAsync();
  if ('allowsRecordingIOS' in mode && !mode.allowsRecordingIOS) {
    await Audio.setAudioModeAsync({ ...mode, ...RECORDING_AUDIO_MODE });
    const retry = await Audio.getAudioModeAsync();
    if ('allowsRecordingIOS' in retry && !retry.allowsRecordingIOS) {
      throw new Error('Recording not allowed on iOS. Enable with Audio.setAudioModeAsync.');
    }
  }
}

type RecordingOptionsWithHints = Audio.RecordingOptions & {
  keepAudioActiveHint?: boolean;
};

export async function createRecordingWithRetry() {
  await stopActiveRecording();
  await ensureRecordingAudioMode();
  try {
    const result = await Audio.Recording.createAsync({
      ...RECORDING_OPTIONS,
      keepAudioActiveHint: true,
    } as RecordingOptionsWithHints);
    registerActiveRecording(result.recording);
    return result.recording;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/only one (recording|recorder)|recording in progress/i.test(message)) {
      await stopActiveRecording();
      await ensureRecordingAudioMode();
      const result = await Audio.Recording.createAsync({
        ...RECORDING_OPTIONS,
        keepAudioActiveHint: true,
      } as RecordingOptionsWithHints);
      registerActiveRecording(result.recording);
      return result.recording;
    }
    if (/Recording not allowed on iOS/i.test(message)) {
      await ensureRecordingAudioMode();
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...RECORDING_OPTIONS,
        keepAudioActiveHint: true,
      } as RecordingOptionsWithHints);
      await recording.startAsync();
      registerActiveRecording(recording);
      return recording;
    }
    throw err;
  }
}
