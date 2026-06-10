import type { LangDirection, TranslationResult, ExamplePair } from '../types';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

// Minimal offline fallback — common EN→ES words
const LOCAL: Record<string, { es: string; ex?: ExamplePair }> = {
  hello: { es: 'hola', ex: { en: 'Hello! How are you?', es: '¡Hola! ¿Cómo estás?' } },
  goodbye: { es: 'adiós', ex: { en: 'Goodbye, see you tomorrow.', es: 'Adiós, hasta mañana.' } },
  thanks: { es: 'gracias', ex: { en: 'Thanks for your help.', es: 'Gracias por tu ayuda.' } },
  please: { es: 'por favor', ex: { en: 'Please help me.', es: 'Por favor ayúdame.' } },
  yes: { es: 'sí' },
  no: { es: 'no' },
  water: { es: 'agua', ex: { en: 'Can I have water?', es: '¿Puedo tomar agua?' } },
  food: { es: 'comida', ex: { en: 'The food is good.', es: 'La comida está buena.' } },
  love: { es: 'amor', ex: { en: 'Love is beautiful.', es: 'El amor es hermoso.' } },
  good: { es: 'bueno', ex: { en: "That's a good idea.", es: 'Esa es una buena idea.' } },
  bad: { es: 'malo', ex: { en: 'This is bad.', es: 'Esto es malo.' } },
  happy: { es: 'feliz' },
  sad: { es: 'triste' },
  fast: { es: 'rápido' },
  slow: { es: 'lento' },
  big: { es: 'grande' },
  small: { es: 'pequeño' },
  today: { es: 'hoy' },
  tomorrow: { es: 'mañana' },
  help: { es: 'ayuda', ex: { en: 'I need help.', es: 'Necesito ayuda.' } },
};

function lookupLocal(word: string, direction: LangDirection): TranslationResult | null {
  const w = word.trim().toLowerCase();

  if (direction === 'en_es') {
    const entry = LOCAL[w];
    if (!entry) return null;
    return {
      original: word,
      translation: entry.es,
      ipa: null,
      examples: entry.ex ? [entry.ex] : [],
      source: 'local',
      direction,
    };
  }

  // es_en: linear scan by Spanish value
  const hit = Object.entries(LOCAL).find(([, v]) => v.es.toLowerCase() === w);
  if (!hit) return null;
  return {
    original: word,
    translation: hit[0],
    ipa: null,
    examples: hit[1].ex ? [hit[1].ex] : [],
    source: 'local',
    direction,
  };
}

export async function translate(
  text: string,
  direction: LangDirection
): Promise<TranslationResult> {
  const local = lookupLocal(text, direction);
  if (local) return local;

  const langpair = direction === 'en_es' ? 'en|es' : 'es|en';

  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await res.json() as {
      responseStatus: number;
      responseData: { translatedText: string };
      matches?: Array<{ segment: string; translation: string; quality: number }>;
    };

    if (json.responseStatus === 200 && json.responseData?.translatedText) {
      const examples = (json.matches ?? [])
        .filter((m) => m.quality > 60)
        .slice(0, 2)
        .map((m): ExamplePair =>
          direction === 'en_es'
            ? { en: m.segment, es: m.translation }
            : { en: m.translation, es: m.segment }
        );

      return {
        original: text,
        translation: json.responseData.translatedText,
        ipa: null,
        examples,
        source: 'api',
        direction,
      };
    }
  } catch {
    // Network unavailable — fall through
  }

  return {
    original: text,
    translation: '—',
    ipa: null,
    examples: [],
    source: 'api',
    direction,
  };
}
