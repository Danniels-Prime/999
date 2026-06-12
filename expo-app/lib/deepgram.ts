const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';

export async function transcribeAudio(
  audioUri: string,
  apiKey: string,
  language = 'en-US'
): Promise<string | null> {
  const response = await fetch(audioUri);
  const blob = await response.blob();

  const url = `${DEEPGRAM_URL}?model=nova-2&language=${language}&punctuate=true`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'audio/m4a',
    },
    body: blob,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Deepgram ${res.status}`);

  const json = await res.json() as {
    results: {
      channels: Array<{
        alternatives: Array<{ transcript: string }>;
      }>;
    };
  };

  return json.results.channels[0]?.alternatives[0]?.transcript ?? null;
}
