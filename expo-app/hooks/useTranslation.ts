import { useCallback, useState } from 'react';
import { translate } from '../lib/translation';
import { getPhonetic } from '../lib/phonetics';
import type { AppSettings, TranslationResult } from '../types';

interface UseTranslationReturn {
  result: TranslationResult | null;
  loading: boolean;
  error: string | null;
  lookup: (text: string) => Promise<TranslationResult | null>;
  clear: () => void;
}

export function useTranslation(settings: AppSettings): UseTranslationReturn {
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(
    async (text: string): Promise<TranslationResult | null> => {
      const trimmed = text.trim();
      if (!trimmed) return null;

      setLoading(true);
      setError(null);

      try {
        const [translationData, ipa] = await Promise.all([
          translate(trimmed, settings.langDirection),
          settings.showPhonetics
            ? getPhonetic(trimmed, settings.langDirection)
            : Promise.resolve(null),
        ]);

        const full: TranslationResult = { ...translationData, ipa };
        setResult(full);
        return full;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Translation failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [settings.langDirection, settings.showPhonetics]
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, lookup, clear };
}
