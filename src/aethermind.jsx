import { useState, useEffect, useRef, useCallback } from 'react';
import './app.css';

const LANGUAGES = [
  { code: 'en-US', label: 'English',    flag: '🇺🇸' },
  { code: 'es-ES', label: 'Español',    flag: '🇪🇸' },
  { code: 'fr-FR', label: 'Français',   flag: '🇫🇷' },
  { code: 'pt-BR', label: 'Português',  flag: '🇧🇷' },
  { code: 'de-DE', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh-CN', label: '中文',       flag: '🇨🇳' },
  { code: 'ja-JP', label: '日本語',     flag: '🇯🇵' },
  { code: 'ar-SA', label: 'العربية',   flag: '🇸🇦' },
];

const STORAGE_KEY = 'lingoLive_apiKey';

async function callClaude(apiKey, term, context, langLabel) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      system:
        `You are a friendly language teacher helping students understand ${langLabel}. ` +
        `Explain words, phrases, idioms, and slang clearly for learners. ` +
        `Always respond in exactly this format:\n\n` +
        `**Meaning:** [what it means, 1-2 sentences]\n` +
        `**Type:** [formal / informal / idiom / slang / common phrase]\n` +
        `**Example:** [one natural sentence using it]\n\n` +
        `If it is an American English idiom or expression, add a brief cultural note. Keep it simple.`,
      messages: [{
        role: 'user',
        content: `Language: ${langLabel}\n\nSelected: "${term}"\n\nContext: "${context.slice(-400)}"`,
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  return (await res.json()).content[0].text;
}

function tokenize(text) {
  return text.split(/(\s+)/).map((t, i) => ({ t, i, space: /^\s+$/.test(t) }));
}

function cleanTerm(raw) {
  return raw.replace(/^[^a-zA-Z0-9'À-ɏ]+|[^a-zA-Z0-9'À-ɏ]+$/g, '') || raw;
}

function renderExpl(text) {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const m = line.match(/^\*\*(.+?):\*\*\s*(.*)/);
    if (m) {
      return (
        <div key={i} style={{ marginBottom: 13 }}>
          <b style={{ color: '#c8b8f8' }}>{m[1]}:</b>{' '}
          <span style={{ color: '#ddd0ff' }}>{m[2]}</span>
        </div>
      );
    }
    return <p key={i} style={{ margin: '4px 0', color: '#ddd0ff' }}>{line}</p>;
  });
}

export default function AethermindApp() {
  /* api key */
  const [apiKey, setApiKey]     = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [keyInput, setKeyInput] = useState('');
  const [showSetup, setShowSetup] = useState(!localStorage.getItem(STORAGE_KEY));

  /* language */
  const [lang, setLang]           = useState('en-US');
  const [showLangMenu, setShowLangMenu] = useState(false);

  /* speech */
  const [listening, setListening] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [segments, setSegments]   = useState([]);
  const [interim, setInterim]     = useState('');

  /* explanation panel: { term, context, loading, text, error } */
  const [panel, setPanel] = useState(null);

  const recRef  = useRef(null);
  const areaRef = useRef(null);
  const idRef   = useRef(0);

  /* ── speech recognition ── */
  const startListening = useCallback(async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition requires Chrome or Safari. Please switch browsers.');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicDenied(true);
      return;
    }
    setMicDenied(false);

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = lang;

    rec.onresult = (e) => {
      let int = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript.trim();
          if (t) setSegments(prev => [...prev, { id: idRef.current++, text: t }]);
        } else {
          int += e.results[i][0].transcript;
        }
      }
      setInterim(int);
    };

    rec.onerror = (e) => { if (e.error === 'not-allowed') setMicDenied(true); };
    rec.onend   = () => { if (recRef.current === rec) { try { rec.start(); } catch {} } };

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang]);

  const stopListening = useCallback(() => {
    if (recRef.current) {
      recRef.current.onend = null;
      recRef.current.stop();
      recRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  /* ── auto-scroll transcript ── */
  useEffect(() => {
    if (areaRef.current) areaRef.current.scrollTop = areaRef.current.scrollHeight;
  }, [segments, interim]);

  /* ── fetch AI explanation ── */
  useEffect(() => {
    if (!panel?.loading) return;
    if (!apiKey) {
      setPanel(p => p ? { ...p, loading: false } : null);
      return;
    }
    const { term, context } = panel;
    const label = LANGUAGES.find(l => l.code === lang)?.label || 'English';
    callClaude(apiKey, term, context, label)
      .then(text => setPanel(p => (p?.term === term && p.loading) ? { ...p, text, loading: false } : p))
      .catch(err  => setPanel(p => (p?.term === term && p.loading) ? { ...p, error: err.message, loading: false } : p));
  }, [panel, apiKey, lang]);

  /* ── explain a word or phrase ── */
  const explain = useCallback((raw, ctx) => {
    const term = cleanTerm(raw);
    if (!term) return;
    setPanel({ term, context: ctx, loading: true, text: null, error: null });
  }, []);

  /* ── handle text selection on transcript ── */
  const handlePointerUp = useCallback(() => {
    const sel     = window.getSelection();
    const selText = sel?.toString().trim();
    if (selText && selText.length > 1 && areaRef.current?.contains(sel.anchorNode)) {
      const ctx = segments.map(s => s.text).join(' ');
      explain(selText, ctx);
      sel.removeAllRanges();
    }
  }, [segments, explain]);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  /* ════════════════════════════════════════
     SETUP SCREEN
  ════════════════════════════════════════ */
  if (showSetup) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.brand}>🌐 LingoLive</div>
          <p style={S.tagline}>
            Real-time speech transcription + AI explanations for language learners.
          </p>
          <div style={S.features}>
            <div style={S.feat}>🎤  Live transcription in 8 languages</div>
            <div style={S.feat}>💡  Tap any word for an instant explanation</div>
            <div style={S.feat}>📚  Idioms, slang &amp; phrases made clear</div>
          </div>
          <label style={S.fieldLabel}>Anthropic API Key</label>
          <input
            type="password"
            placeholder="sk-ant-api03-…"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            style={S.textInput}
            autoComplete="off"
            spellCheck={false}
          />
          <p style={S.micro}>Stored only on this device. Powers the AI explanations.</p>
          <button
            style={{ ...S.primaryBtn, opacity: keyInput.length > 20 ? 1 : 0.4 }}
            disabled={keyInput.length <= 20}
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, keyInput);
              setApiKey(keyInput);
              setShowSetup(false);
            }}
          >
            Start Learning →
          </button>
          {apiKey && (
            <button style={S.ghostBtn} onClick={() => setShowSetup(false)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     MAIN APP
  ════════════════════════════════════════ */
  return (
    <div style={S.app}>

      {/* ── header ── */}
      <header style={S.header}>
        <span style={S.appTitle}>LingoLive</span>
        <button style={S.langPill} onClick={() => setShowLangMenu(v => !v)}>
          {currentLang.flag} {currentLang.label} ▾
        </button>
      </header>

      {/* ── language menu ── */}
      {showLangMenu && (
        <>
          <div style={S.menuBackdrop} onClick={() => setShowLangMenu(false)} />
          <nav style={S.langMenu}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                style={{ ...S.langItem, ...(l.code === lang ? S.langItemOn : {}) }}
                onClick={() => {
                  setLang(l.code);
                  setShowLangMenu(false);
                  if (listening) { stopListening(); setTimeout(startListening, 300); }
                }}
              >
                <span style={{ marginRight: 8 }}>{l.flag}</span>{l.label}
              </button>
            ))}
          </nav>
        </>
      )}

      {/* ── transcript area ── */}
      <main
        ref={areaRef}
        style={S.transcript}
        onPointerUp={handlePointerUp}
      >
        {segments.length === 0 && !interim ? (
          <div style={S.empty}>
            {listening
              ? '🎤  Listening…\nStart speaking'
              : '⬇  Tap the mic to start recording\n\nTap any word — or select a phrase —\nfor an instant AI explanation'}
          </div>
        ) : (
          <>
            {segments.map(seg => (
              <p key={seg.id} style={S.seg}>
                {tokenize(seg.text).map(({ t, i, space }) =>
                  space
                    ? <span key={i}> </span>
                    : (
                      <span
                        key={i}
                        className="lw"
                        onClick={() => {
                          if (!window.getSelection()?.toString()) explain(t, seg.text);
                        }}
                      >
                        {t}
                      </span>
                    )
                )}
              </p>
            ))}
            {interim && (
              <p style={{ ...S.seg, color: '#5a4080', fontStyle: 'italic' }}>{interim}</p>
            )}
          </>
        )}
      </main>

      {/* ── controls ── */}
      <div style={S.controls}>
        {segments.length > 0 ? (
          <button style={S.sideBtn} onClick={() => { setSegments([]); setInterim(''); }}>Clear</button>
        ) : (
          <div style={{ width: 64 }} />
        )}
        <button
          className={listening ? 'mic-active' : ''}
          style={{ ...S.micBtn, ...(listening ? S.micOn : {}) }}
          onClick={listening ? stopListening : startListening}
          aria-label={listening ? 'Stop recording' : 'Start recording'}
        >
          {listening ? '⏹' : '🎤'}
        </button>
        <button style={S.sideBtn} onClick={() => setShowSetup(true)}>⚙</button>
      </div>

      {/* ── mic denied banner ── */}
      {micDenied && (
        <div style={S.denied}>
          Microphone blocked. Go to your browser or device settings and allow microphone access, then try again.
        </div>
      )}

      {/* ── explanation panel ── */}
      {panel && (
        <div style={S.overlay} onClick={() => setPanel(null)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.handle} />
            <button style={S.closeBtn} onClick={() => setPanel(null)}>✕</button>

            <div style={S.panelTerm}>"{panel.term}"</div>
            <div style={S.panelMeta}>{currentLang.flag} {currentLang.label} · AI Explanation</div>

            <div style={S.panelContent}>
              {panel.loading && <div style={S.loadingMsg}>Explaining…</div>}
              {panel.error   && <div style={S.errMsg}>{panel.error}</div>}
              {panel.text    && renderExpl(panel.text)}
              {!panel.loading && !panel.text && !panel.error && (
                <div style={S.noKey}>
                  <p>Add your Anthropic API key to see AI explanations.</p>
                  <button
                    style={S.addKeyBtn}
                    onClick={() => { setPanel(null); setShowSetup(true); }}
                  >
                    Add API Key →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   STYLES
════════════════════════════════════════ */
const S = {
  /* setup */
  page:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03010a', padding: 20, fontFamily: 'system-ui,-apple-system,sans-serif' },
  card:       { background: '#0d0a1a', border: '1px solid #1e1535', borderRadius: 20, padding: '34px 26px', maxWidth: 420, width: '100%' },
  brand:      { fontSize: 27, fontWeight: 900, color: '#c8b8f8', marginBottom: 10 },
  tagline:    { color: '#9080b0', fontSize: 15, lineHeight: 1.65, margin: '0 0 22px' },
  features:   { marginBottom: 26 },
  feat:       { color: '#7060a0', fontSize: 14, marginBottom: 9, lineHeight: 1.5 },
  fieldLabel: { display: 'block', color: '#c8b8f8', fontSize: 13, fontWeight: 600, marginBottom: 8 },
  textInput:  { width: '100%', padding: '12px 14px', background: '#1a1030', border: '1px solid #3a2a5a', borderRadius: 10, color: '#e0d6ff', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  micro:      { color: '#5a4a8a', fontSize: 12, margin: '8px 0 22px' },
  primaryBtn: { width: '100%', padding: 14, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' },
  ghostBtn:   { display: 'block', width: '100%', marginTop: 12, padding: '12px', background: 'transparent', border: '1px solid #2a1f4a', color: '#7060a0', borderRadius: 12, fontSize: 15, cursor: 'pointer' },

  /* app shell */
  app:          { display: 'flex', flexDirection: 'column', height: '100vh', background: '#03010a', fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden', position: 'relative' },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #120d22', background: '#07040f', flexShrink: 0 },
  appTitle:     { fontSize: 19, fontWeight: 800, color: '#c8b8f8', letterSpacing: '0.04em' },
  langPill:     { background: '#150f28', border: '1px solid #2a1f4a', color: '#b0a0d8', padding: '7px 14px', borderRadius: 20, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  menuBackdrop: { position: 'fixed', inset: 0, zIndex: 10 },
  langMenu:     { position: 'absolute', top: 56, right: 14, background: '#0d0a1a', border: '1px solid #2a1f4a', borderRadius: 14, zIndex: 20, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.75)', minWidth: 168 },
  langItem:     { display: 'flex', alignItems: 'center', width: '100%', padding: '11px 18px', background: 'transparent', border: 'none', color: '#ddd0ff', fontSize: 15, cursor: 'pointer', textAlign: 'left' },
  langItemOn:   { background: '#1e1535', color: '#c8b8f8', fontWeight: 600 },

  /* transcript */
  transcript: { flex: 1, overflowY: 'auto', padding: '20px 18px', fontSize: 21, lineHeight: 2.05, userSelect: 'text', WebkitUserSelect: 'text' },
  empty:      { color: '#3a2a5a', fontSize: 16, lineHeight: 1.95, textAlign: 'center', marginTop: '22vh', whiteSpace: 'pre-line' },
  seg:        { margin: '0 0 18px', color: '#e0d6ff', wordBreak: 'break-word' },

  /* controls */
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '16px 20px', borderTop: '1px solid #120d22', background: '#07040f', flexShrink: 0 },
  sideBtn:  { background: '#150f28', border: '1px solid #2a1f4a', color: '#9080b8', padding: '10px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 14, minWidth: 64 },
  micBtn:   { width: 64, height: 64, borderRadius: '50%', border: 'none', fontSize: 26, cursor: 'pointer', background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', boxShadow: '0 4px 20px rgba(124,58,237,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  micOn:    { background: 'linear-gradient(135deg,#991b1b,#ef4444)', boxShadow: '0 4px 20px rgba(239,68,68,0.55)' },
  denied:   { background: '#450a0a', color: '#fca5a5', padding: '12px 18px', fontSize: 13, textAlign: 'center', lineHeight: 1.55 },

  /* explanation panel */
  overlay:    { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(3px)' },
  sheet:      { background: '#0d0a1a', borderRadius: '22px 22px 0 0', padding: '18px 22px 48px', width: '100%', maxWidth: 640, border: '1px solid #1e1535', borderBottom: 'none', maxHeight: '72vh', overflowY: 'auto', position: 'relative' },
  handle:     { width: 38, height: 4, background: '#2a1f4a', borderRadius: 2, margin: '0 auto 16px' },
  closeBtn:   { position: 'absolute', top: 18, right: 18, background: '#1a1030', border: 'none', color: '#8070a8', fontSize: 17, cursor: 'pointer', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  panelTerm:  { fontSize: 23, fontWeight: 700, color: '#c8b8f8', paddingRight: 36, marginBottom: 5, wordBreak: 'break-word' },
  panelMeta:  { fontSize: 11, color: '#5a4a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 },
  panelContent: { fontSize: 16, lineHeight: 1.8 },
  loadingMsg: { color: '#6050a0', fontStyle: 'italic' },
  errMsg:     { color: '#f87171', fontSize: 14 },
  noKey:      { color: '#7060a0', fontSize: 15, lineHeight: 1.65 },
  addKeyBtn:  { display: 'inline-block', marginTop: 10, background: 'linear-gradient(135deg,#6d28d9,#a855f7)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
};
