type DeepgramTranscriptResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
  };
};

const DEEPGRAM_ENDPOINT =
  'https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true';

export function getDeepgramApiKey() {
  return (process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ?? '').trim();
}

async function readUriAsBlob(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Unable to read audio file.');
  }
  return response.blob();
}

export async function transcribeAudioUriWithDeepgram(uri: string) {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error('Deepgram API key is missing.');
  }
  const blob = await readUriAsBlob(uri);
  const response = await fetch(DEEPGRAM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': blob.type || 'audio/mp4',
    },
    body: blob,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram error (${response.status}): ${errorText}`);
  }
  const data = (await response.json()) as DeepgramTranscriptResponse;
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  return transcript.trim();
}
