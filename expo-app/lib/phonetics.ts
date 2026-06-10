import type { LangDirection } from '../types';

const WIKTIONARY = 'https://en.wiktionary.org/api/rest_v1/page/definition';

/**
 * Fetches the IPA phonetic transcription for an English word.
 * Spanish words always return null — Spanish is phonetically transparent.
 */
export async function getPhonetic(
  word: string,
  direction: LangDirection
): Promise<string | null> {
  // Only English source words get IPA
  if (direction === 'es_en') return null;

  const clean = word.trim().toLowerCase().split(' ')[0];
  if (!clean || clean.length < 2) return null;

  try {
    const res = await fetch(`${WIKTIONARY}/${encodeURIComponent(clean)}/en`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const json = await res.json() as {
      en?: Array<{
        pronunciations?: Array<{ ipa?: string | string[] }>;
      }>;
    };

    for (const entry of json.en ?? []) {
      for (const pron of entry.pronunciations ?? []) {
        if (pron.ipa) {
          const ipa = Array.isArray(pron.ipa) ? pron.ipa[0] : pron.ipa;
          if (ipa) return ipa;
        }
      }
    }
  } catch {
    // Network failure — return null gracefully
  }

  return null;
}
