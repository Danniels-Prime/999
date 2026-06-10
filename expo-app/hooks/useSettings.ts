import { useCallback, useEffect, useState } from 'react';
import { getItem, setItem, STORAGE_KEYS } from '../lib/storage';
import type { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  langDirection: 'en_es',
  showPhonetics: true,
  autoTts: true,
  clipboardMonitor: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  deepgramApiKey: '',
};

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getItem<AppSettings>(STORAGE_KEYS.SETTINGS).then((saved) => {
      if (saved) setSettingsState({ ...DEFAULT_SETTINGS, ...saved });
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      setItem(STORAGE_KEYS.SETTINGS, next);
      return next;
    });
  }, []);

  const updateKey = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      await updateSettings({ [key]: value } as Partial<AppSettings>);
    },
    [updateSettings]
  );

  return { settings, updateSettings, updateKey, loaded };
}
