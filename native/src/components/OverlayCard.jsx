/**
 * OverlayCard — the floating translation popup.
 *
 * Registered as its own RN root component ("OverlayCard") so the native
 * OverlayService can mount it independently inside a WindowManager view.
 * Also usable as a regular component inside the main app (e.g. for preview).
 *
 * Props (from OverlayService initialProperties or JS parent):
 *   word   {string}  — the word/phrase to translate
 *   mode   {number}  — 1=translation only, 2=TTS+translation, 3=sentence, 4=clipboard
 *   onClose {fn}     — called when user taps ×
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, PanResponder, NativeModules,
  AppRegistry, useColorScheme,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lookup } from '../services/dictionary';

const { OverlayModule } = NativeModules;

const PREFS_KEY = 'overlay_lang_prefs';

export default function OverlayCard({ word = '', mode = 1, onClose }) {
  const [result, setResult] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showPhonetics, setShowPhonetics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState('en_es');

  // Draggable position
  const pan = useState(() => new Animated.ValueXY())[0];
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({ x: pan.x._value, y: pan.y._value });
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => pan.flattenOffset(),
  });

  useEffect(() => {
    (async () => {
      try {
        const prefs = JSON.parse(await AsyncStorage.getItem(PREFS_KEY) || '{}');
        const dir = prefs.langDirection || 'en_es';
        const phonOn = prefs.phonetics !== false;
        setDirection(dir);
        setShowPhonetics(phonOn);

        const data = await lookup(word, dir);
        setResult(data);
      } catch (_) {
        setResult({ original: word, translation: '—', ipa: null, examples: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [word]);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
    else OverlayModule?.hideOverlay?.();
  }, [onClose]);

  const sourceLang = direction === 'en_es' ? '🇺🇸' : '🇪🇸';
  const targetLang = direction === 'en_es' ? '🇪🇸' : '🇺🇸';

  return (
    <Animated.View
      style={[styles.card, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.wordText} numberOfLines={2}>
          {sourceLang} <Text style={styles.word}>{word}</Text>
        </Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6C63FF" style={{ marginVertical: 16 }} />
      ) : (
        <>
          {/* Translation — always shown */}
          <View style={styles.translationRow}>
            <Text style={styles.targetLangIcon}>{targetLang}</Text>
            <Text style={styles.translation}>{result?.translation ?? '—'}</Text>
          </View>

          {/* IPA phonetics — English source only, Settings toggle */}
          {showPhonetics && direction === 'en_es' && result?.ipa && (
            <Text style={styles.ipa}>{result.ipa} · American English</Text>
          )}

          <View style={styles.divider} />

          {/* Examples — behind a button */}
          <TouchableOpacity
            onPress={() => setShowExamples(v => !v)}
            style={styles.examplesBtn}
          >
            <Text style={styles.examplesBtnTxt}>
              {showExamples ? 'Hide examples ▲' : 'See examples ▼'}
            </Text>
          </TouchableOpacity>

          {showExamples && result?.examples?.length > 0 && (
            <View style={styles.examplesContainer}>
              {result.examples.map((ex, i) => (
                <View key={i} style={styles.exampleItem}>
                  <Text style={styles.exampleEN}>📖 {ex.en}</Text>
                  <Text style={styles.exampleES}>📖 {ex.es}</Text>
                </View>
              ))}
            </View>
          )}

          {showExamples && (!result?.examples || result.examples.length === 0) && (
            <Text style={styles.noExamples}>No examples available</Text>
          )}
        </>
      )}

      <View style={styles.modeTag}>
        <Text style={styles.modeTagTxt}>{modeName(mode)}</Text>
      </View>
    </Animated.View>
  );
}

function modeName(mode) {
  switch (mode) {
    case 1: return 'double-tap';
    case 2: return 'ghost drag';
    case 3: return 'selection';
    case 4: return 'clipboard';
    default: return '';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 18,
    padding: 16,
    minWidth: 280,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 24,
    borderWidth: 1,
    borderColor: '#6C63FF33',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  wordText: {
    flex: 1,
    fontSize: 15,
    color: '#B0AEC8',
    marginRight: 8,
  },
  word: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAF5',
  },
  closeBtn: {
    padding: 4,
    marginTop: -2,
  },
  closeTxt: {
    fontSize: 18,
    color: '#6C63FF',
    fontWeight: '600',
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  targetLangIcon: {
    fontSize: 22,
  },
  translation: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6C63FF',
    flex: 1,
    flexWrap: 'wrap',
  },
  ipa: {
    fontSize: 13,
    color: '#9E9CBC',
    fontStyle: 'italic',
    marginBottom: 8,
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A4A',
    marginVertical: 10,
  },
  examplesBtn: {
    paddingVertical: 4,
  },
  examplesBtnTxt: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  examplesContainer: {
    marginTop: 8,
    gap: 10,
  },
  exampleItem: {
    gap: 2,
  },
  exampleEN: {
    fontSize: 12,
    color: '#C8C7DC',
    lineHeight: 18,
  },
  exampleES: {
    fontSize: 12,
    color: '#9E9CBC',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  noExamples: {
    fontSize: 12,
    color: '#555575',
    marginTop: 6,
  },
  modeTag: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  modeTagTxt: {
    fontSize: 10,
    color: '#444464',
    fontStyle: 'italic',
  },
});

// Register as a standalone RN root for OverlayService to mount
AppRegistry.registerComponent('OverlayCard', () => OverlayCard);
