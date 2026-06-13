import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { translate } from '../lib/translation';
import { getPhonetic } from '../lib/phonetics';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../constants/theme';
import type { LangDirection } from '../types';

interface Props {
  word: string;
  sentence: string;
  direction: LangDirection;
  onClose: () => void;
}

export function WordDetailSheet({ word, sentence, direction, onClose }: Props) {
  const [wordResult, setWordResult] = useState<{ translation: string; ipa: string | null; examples: Array<{ en: string; es: string }> } | null>(null);
  const [sentenceTranslation, setSentenceTranslation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setWordResult(null);
    setSentenceTranslation('');

    (async () => {
      try {
        const [wordRes, ipa, sentRes] = await Promise.all([
          translate(word, direction),
          getPhonetic(word, direction),
          sentence !== word ? translate(sentence, direction) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setWordResult({ translation: wordRes.translation, ipa, examples: wordRes.examples });
        setSentenceTranslation(sentRes?.translation ?? '');
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [word, sentence, direction]);

  const srcFlag = direction === 'en_es' ? '🇺🇸' : '🇪🇸';
  const tgtFlag = direction === 'en_es' ? '🇪🇸' : '🇺🇸';

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Word */}
          <View style={styles.wordRow}>
            <Text style={styles.flagBig}>{srcFlag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.wordText}>{word}</Text>
              {wordResult?.ipa && (
                <Text style={styles.ipa}>{wordResult.ipa}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing.lg }} />
          ) : (
            <>
              {/* Word translation */}
              {wordResult && (
                <View style={styles.translationBlock}>
                  <Text style={styles.blockLabel}>{tgtFlag} Translation</Text>
                  <Text style={styles.translationText}>{wordResult.translation}</Text>
                </View>
              )}

              {/* Sentence context */}
              {sentence !== word && sentence.trim().length > 0 && (
                <View style={styles.contextBlock}>
                  <Text style={styles.blockLabel}>In context</Text>
                  <Text style={styles.contextSrc}>"{sentence}"</Text>
                  {sentenceTranslation ? (
                    <Text style={styles.contextTgt}>→ "{sentenceTranslation}"</Text>
                  ) : null}
                </View>
              )}

              {/* Examples */}
              {wordResult && wordResult.examples.length > 0 && (
                <View style={styles.examplesBlock}>
                  <Text style={styles.blockLabel}>Examples</Text>
                  {wordResult.examples.slice(0, 3).map((ex, i) => (
                    <View key={i} style={styles.exampleItem}>
                      <Text style={styles.exampleSrc}>{direction === 'en_es' ? ex.en : ex.es}</Text>
                      <Text style={styles.exampleTgt}>{direction === 'en_es' ? ex.es : ex.en}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
  },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.borderAccent,
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  flagBig: { fontSize: 28 },
  wordText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },
  ipa: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  closeBtnText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  blockLabel: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  translationBlock: {
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  translationText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.xl,
    color: Colors.accent,
  },
  contextBlock: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  contextSrc: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contextTgt: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  examplesBlock: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exampleItem: {
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    gap: 2,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accentDim,
  },
  exampleSrc: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  exampleTgt: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
