/**
 * Fetches IPA phonetic transcription for English words.
 * Spanish words are NOT transcribed — Spanish is phonetically transparent.
 *
 * Source: Wiktionary REST API (free, CC-BY-SA, no key needed).
 */

const WIKTIONARY_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition';

/**
 * Returns the IPA string for an English word, or null if unavailable / Spanish input.
 * @param {string} word
 * @param {'en_es'|'es_en'} direction — Spanish input always returns null
 * @returns {Promise<string|null>}
 */
export async function getPhonetic(word, direction = 'en_es') {
  // Spanish words don't need phonetics
  if (direction === 'es_en') return null;

  const clean = word.trim().toLowerCase().split(' ')[0]; // single word only
  if (!clean || clean.length < 2) return null;

  try {
    const res = await fetch(`${WIKTIONARY_URL}/${encodeURIComponent(clean)}/en`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const entries = json.en || [];

    for (const entry of entries) {
      const prons = entry.pronunciations;
      if (prons && Array.isArray(prons)) {
        for (const pron of prons) {
          // Prefer entries labeled "US" or without label (General American)
          if (pron.ipa) {
            const ipa = Array.isArray(pron.ipa) ? pron.ipa[0] : pron.ipa;
            if (typeof ipa === 'string') return ipa;
          }
        }
      }
    }
  } catch (_) {
    // Network failure or parse error — return null gracefully
  }

  return null;
}
