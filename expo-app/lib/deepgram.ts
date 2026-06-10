/**
 * Deepgram Nova-2 speech-to-text.
 * API key is stored in user Settings — never hardcoded.
 */
import type { DeepgramResponse } from '../types';

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';

export async function transcribeAudio(
  audioUri: string,
  apiKey: string,
  language = 'en-US'
): Promise<string> {
  if (!apiKey) throw new Error('Deepgram API key not configured. Add it in Settings.');

  // Read the file as a blob
  const response = await fetch(audioUri);
  const blob = await response.blob();

  const res = await fetch(
    `${DEEPGRAM_URL}?model=nova-2&language=${language}&punctuate=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': blob.type || 'audio/webm',
      },
      body: blob,
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as DeepgramResponse;
  const transcript =
    json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';

  return transcript.trim();
}
