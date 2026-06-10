import { useCallback, useEffect, useState } from 'react';
import { getItem, setItem, STORAGE_KEYS } from '../lib/storage';
import { syncHistoryEntry } from '../lib/supabase';
import type { AppSettings, HistoryEntry, TranslationResult } from '../types';

function makeEntry(result: TranslationResult): HistoryEntry {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    word: result.original,
    translation: result.translation,
    ipa: result.ipa,
    direction: result.direction,
    timestamp: Date.now(),
    synced: false,
  };
}

export function useHistory(settings: AppSettings) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY).then((saved) => {
      if (saved) setHistory(saved);
    });
  }, []);

  const persist = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries);
    setItem(STORAGE_KEYS.HISTORY, entries);
  }, []);

  const addEntry = useCallback(
    async (result: TranslationResult) => {
      const entry = makeEntry(result);

      setHistory((prev) => {
        const deduped = prev.filter(
          (h) => !(h.word === entry.word && h.direction === entry.direction)
        );
        const next = [entry, ...deduped].slice(0, 500);
        setItem(STORAGE_KEYS.HISTORY, next);
        return next;
      });

      // Optionally sync to Supabase
      if (settings.supabaseUrl && settings.supabaseAnonKey) {
        try {
          await syncHistoryEntry(entry, settings.supabaseUrl, settings.supabaseAnonKey);
        } catch {
          // Sync failure is non-fatal
        }
      }
    },
    [settings.supabaseUrl, settings.supabaseAnonKey]
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist(history.filter((h) => h.id !== id));
    },
    [history, persist]
  );

  const clearHistory = useCallback(() => {
    persist([]);
  }, [persist]);

  return { history, addEntry, removeEntry, clearHistory };
}
