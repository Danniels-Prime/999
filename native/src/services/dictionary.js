/**
 * High-level dictionary facade: combines translation + phonetics,
 * returns a unified result object for the overlay card.
 */
import { translate } from './translation';
import { getPhonetic } from './phonetics';

/**
 * @param {string} text
 * @param {'en_es'|'es_en'} direction
 * @returns {Promise<DictionaryResult>}
 *
 * @typedef {Object} DictionaryResult
 * @property {string} original
 * @property {string} translation
 * @property {string|null} ipa        — null for Spanish source words
 * @property {Array<{en:string,es:string}>} examples
 */
export async function lookup(text, direction = 'en_es') {
  const [translationData, ipa] = await Promise.all([
    translate(text, direction),
    getPhonetic(text, direction),
  ]);

  return {
    original: text,
    translation: translationData.translation,
    ipa,
    examples: translationData.examples,
  };
}
