import type { Audio } from 'expo-av';

type AudioModule = typeof import('expo-av');
type AudioMode = Parameters<AudioModule['Audio']['setAudioModeAsync']>[0];

let cachedAudio: AudioModule | null = null;

export function getAudioModule() {
  if (cachedAudio) return cachedAudio;
  try {
    cachedAudio = require('expo-av');
    return cachedAudio;
  } catch {
    return null;
  }
}

function getAudio() {
  return getAudioModule()?.Audio ?? null;
}

function resolveInterruptionModes(Audio: AudioModule['Audio']) {
  const interruptionModeIOS =
    (Audio as { InterruptionModeIOS?: { DoNotMix?: number } }).InterruptionModeIOS?.DoNotMix ??
    (Audio as { INTERRUPTION_MODE_IOS_DO_NOT_MIX?: number }).INTERRUPTION_MODE_IOS_DO_NOT_MIX;

  const interruptionModeAndroid =
    (Audio as { InterruptionModeAndroid?: { DoNotMix?: number } }).InterruptionModeAndroid?.DoNotMix ??
    (Audio as { INTERRUPTION_MODE_ANDROID_DO_NOT_MIX?: number }).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;

  return { interruptionModeIOS, interruptionModeAndroid };
}

function getRecordingAudioMode(Audio: AudioModule['Audio']): AudioMode {
  const { interruptionModeIOS, interruptionModeAndroid } = resolveInterruptionModes(Audio);
  return {
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
    ...(typeof interruptionModeIOS === 'number' ? { interruptionModeIOS } : {}),
    ...(typeof interruptionModeAndroid === 'number' ? { interruptionModeAndroid } : {}),
  };
}

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
  const Audio = getAudio();
  if (Audio?.setAudioModeAsync) {
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

// Small, voice-first recording profile (mono AAC) to keep uploads light.
export function getRecordingOptions(): Audio.RecordingOptions | null {
  const audio = getAudioModule();
  if (!audio?.Audio) return null;
  const { Audio: ExpoAudio } = audio;
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
  };
}

export async function ensureRecordingAudioMode() {
  const Audio = getAudio();
  if (!Audio?.setAudioModeAsync) {
    throw new Error('Audio recording is not available in this build.');
  }
  const mode = getRecordingAudioMode(Audio);
  await Audio.setAudioModeAsync(mode);
  if (!Audio.getAudioModeAsync) return;
  const current = await Audio.getAudioModeAsync();
  if ('allowsRecordingIOS' in current && !current.allowsRecordingIOS) {
    await Audio.setAudioModeAsync({ ...current, ...mode });
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
  const Audio = getAudio();
  const recordingOptions = getRecordingOptions();
  if (!Audio?.Recording || !recordingOptions) {
    throw new Error('Audio recording is not available in this build.');
  }
  await stopActiveRecording();
  await ensureRecordingAudioMode();
  try {
    const result = await Audio.Recording.createAsync({
      ...recordingOptions,
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
        ...recordingOptions,
        keepAudioActiveHint: true,
      } as RecordingOptionsWithHints);
      registerActiveRecording(result.recording);
      return result.recording;
    }
    if (/Recording not allowed on iOS/i.test(message)) {
      await ensureRecordingAudioMode();
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...recordingOptions,
        keepAudioActiveHint: true,
      } as RecordingOptionsWithHints);
      await recording.startAsync();
      registerActiveRecording(recording);
      return recording;
    }
    throw err;
  }
}
