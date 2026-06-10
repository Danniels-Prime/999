/**
 * Translation service using MyMemory API (free, no API key required).
 * Falls back to the local bundled dictionary on network failure.
 */
import localDict from '../data/top3000_en_es.json';

const BASE_URL = 'https://api.mymemory.translated.net/get';

/**
 * Translates text between English and Spanish.
 * @param {string} text
 * @param {'en_es'|'es_en'} direction
 * @returns {Promise<{translation: string, examples: string[]}>}
 */
export async function translate(text, direction = 'en_es') {
  const langpair = direction === 'en_es' ? 'en|es' : 'es|en';
  const word = text.toLowerCase().trim();

  // 1. Try local dictionary first (instant, offline)
  const local = lookupLocal(word, direction);
  if (local) return local;

  // 2. Fetch from MyMemory API
  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const json = await res.json();

    if (json.responseStatus === 200 && json.responseData?.translatedText) {
      return {
        translation: json.responseData.translatedText,
        examples: extractExamples(json.matches, text, direction),
      };
    }
  } catch (_) {
    // Network failure — fall through to empty result
  }

  return { translation: '—', examples: [] };
}

function lookupLocal(word, direction) {
  const entry = localDict[word];
  if (!entry) return null;

  if (direction === 'en_es') {
    return {
      translation: entry.es,
      examples: entry.ex
        ? [{ en: entry.ex.en, es: entry.ex.es }]
        : [],
    };
  } else {
    // es_en: search by Spanish value (slower but works for a 3000-word set)
    const hit = Object.entries(localDict).find(
      ([, v]) => v.es?.toLowerCase() === word
    );
    if (!hit) return null;
    return {
      translation: hit[0], // English key
      examples: hit[1].ex ? [{ en: hit[1].ex.en, es: hit[1].ex.es }] : [],
    };
  }
}

function extractExamples(matches, original, direction) {
  if (!matches || !Array.isArray(matches)) return [];
  return matches
    .filter(m => m.segment && m.translation && m.quality > 50)
    .slice(0, 2)
    .map(m =>
      direction === 'en_es'
        ? { en: m.segment, es: m.translation }
        : { en: m.translation, es: m.segment }
    );
}
