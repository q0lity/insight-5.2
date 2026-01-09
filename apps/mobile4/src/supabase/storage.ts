import { getSupabaseSessionUser } from '@/src/supabase/helpers';

const DEFAULT_AUDIO_BUCKET = 'attachments';

const OPENAI_AUDIO_EXTENSIONS = new Set([
  'flac',
  'm4a',
  'mp3',
  'mp4',
  'mpeg',
  'mpga',
  'oga',
  'ogg',
  'wav',
  'webm',
]);

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  caf: 'audio/x-caf',
  aac: 'audio/aac',
};

function getFileExtension(uri: string) {
  const cleaned = uri.split('?')[0]?.split('#')[0] ?? uri;
  const parts = cleaned.split('.');
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1]?.toLowerCase();
  if (!ext || ext.length > 5) return null;
  return ext;
}

function normalizeAudioExtension(ext: string | null) {
  if (!ext) return 'm4a';
  const normalized = ext.toLowerCase();
  if (OPENAI_AUDIO_EXTENSIONS.has(normalized)) return normalized;
  if (normalized === 'caf' || normalized === 'aac') return 'm4a';
  return normalized;
}

function inferContentType(ext: string | null) {
  if (!ext) return 'audio/mp4';
  return AUDIO_CONTENT_TYPES[ext] ?? 'audio/mp4';
}

async function readUriAsBlob(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Unable to read audio file.');
  }
  return response.blob();
}

export type UploadedAudio = {
  bucket: string;
  path: string;
  contentType: string;
  size: number;
};

export async function uploadCaptureAudio(params: {
  captureId: string;
  attachmentId: string;
  uri: string;
  bucket?: string;
}): Promise<UploadedAudio> {
  // IMPORTANT: Do NOT use allowAnonymous here - must match Edge Function's user ID
  const session = await getSupabaseSessionUser({ allowAnonymous: false });
  if (!session) throw new Error('Supabase session not available. Sign in or enable anonymous auth.');
  const { supabase, user } = session;

  const bucket = params.bucket ?? DEFAULT_AUDIO_BUCKET;
  const rawExtension = getFileExtension(params.uri);
  const extension = normalizeAudioExtension(rawExtension);
  if (rawExtension && rawExtension !== extension) {
    console.warn('[Audio] Unsupported extension, forcing .m4a:', rawExtension);
  }
  const contentType = inferContentType(extension);
  const blob = await readUriAsBlob(params.uri);
  const path = `audio/${user.id}/${params.captureId}/${params.attachmentId}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);

  return { bucket, path, contentType, size: blob.size };
}
