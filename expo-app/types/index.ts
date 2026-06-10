// ── Language ────────────────────────────────────────────────────────────────

export type LangDirection = 'en_es' | 'es_en';

export interface LangPair {
  from: string;
  to: string;
  label: string;
  flag: { from: string; to: string };
}

// ── Dictionary / Translation ─────────────────────────────────────────────────

export interface TranslationResult {
  original: string;
  translation: string;
  ipa: string | null;        // IPA phonetics (English source only)
  examples: ExamplePair[];
  source: 'local' | 'api';   // where the translation came from
  direction: LangDirection;
}

export interface ExamplePair {
  en: string;
  es: string;
}

export interface DictEntry {
  es: string;
  ex?: ExamplePair;
}

// ── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  word: string;
  translation: string;
  ipa: string | null;
  direction: LangDirection;
  timestamp: number;
  synced: boolean;          // true once pushed to Supabase
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  langDirection: LangDirection;
  showPhonetics: boolean;    // IPA toggle (English source only)
  autoTts: boolean;          // read aloud on every lookup
  clipboardMonitor: boolean; // translate on clipboard copy
  supabaseUrl: string;
  supabaseAnonKey: string;
  deepgramApiKey: string;
}

export type SettingsKey = keyof AppSettings;

// ── Speech ───────────────────────────────────────────────────────────────────

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: DeepgramWord[];
      }>;
    }>;
  };
}

// ── Supabase ─────────────────────────────────────────────────────────────────

export interface SupabaseHistoryRow {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  ipa: string | null;
  direction: LangDirection;
  created_at: string;
}

// ── UI ────────────────────────────────────────────────────────────────────────

export type TabRoute = '/' | '/history' | '/settings';

export interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}
