import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow } from '../constants/theme';
import type { TranslationResult, LangDirection } from '../types';

interface Props {
  result: TranslationResult;
  direction: LangDirection;
  showPhonetics: boolean;
}

export function TranslationCard({ result, direction, showPhonetics }: Props) {
  const [showExamples, setShowExamples] = useState(false);

  const srcFlag = direction === 'en_es' ? '🇺🇸' : '🇪🇸';
  const tgtFlag = direction === 'en_es' ? '🇪🇸' : '🇺🇸';
  const tgtLang = direction === 'en_es' ? 'es-ES' : 'en-US';

  const handleSpeak = () => {
    Speech.speak(result.translation, { language: tgtLang });
  };

  return (
    <View style={styles.card}>
      {/* Original word */}
      <View style={styles.originalRow}>
        <Text style={styles.flagText}>{srcFlag}</Text>
        <Text style={styles.originalText} numberOfLines={3}>
          {result.original}
        </Text>
        {result.source === 'local' && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>offline</Text>
          </View>
        )}
      </View>

      {/* IPA phonetics */}
      {showPhonetics && result.ipa && (
        <Text style={styles.ipa}>{result.ipa} · American English</Text>
      )}

      <View style={styles.divider} />

      {/* Translation + speak button */}
      <View style={styles.translationRow}>
        <Text style={styles.flagText}>{tgtFlag}</Text>
        <Text style={styles.translationText} numberOfLines={4}>
          {result.translation}
        </Text>
        <TouchableOpacity onPress={handleSpeak} style={styles.speakBtn} activeOpacity={0.7}>
          <Text style={styles.speakBtnText}>🔊</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Examples toggle */}
      <TouchableOpacity
        onPress={() => setShowExamples((v) => !v)}
        style={styles.examplesBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.examplesBtnText}>
          {showExamples ? 'Hide examples ▲' : 'Show examples ▼'}
        </Text>
      </TouchableOpacity>

      {showExamples &&
        (result.examples.length > 0 ? (
          <View style={styles.examplesContainer}>
            {result.examples.map((ex, i) => (
              <View key={i} style={styles.exampleItem}>
                <Text style={styles.exampleEN}>📖 {ex.en}</Text>
                <Text style={styles.exampleES}>   {ex.es}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noExamples}>No examples available</Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    ...Shadow.accent,
  },
  originalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  flagText: {
    fontSize: 22,
    lineHeight: 28,
  },
  originalText: {
    flex: 1,
    fontFamily: FontFamily.sansSemibold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  offlineBadge: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  offlineBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
  ipa: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: 30,
    marginBottom: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  translationText: {
    flex: 1,
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize['2xl'],
    color: Colors.accent,
    lineHeight: 34,
  },
  speakBtn: {
    padding: Spacing.xs,
  },
  speakBtnText: {
    fontSize: 22,
  },
  examplesBtn: {
    paddingVertical: Spacing.xs,
  },
  examplesBtnText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: FontSize.sm,
    color: Colors.accentLight,
  },
  examplesContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  exampleItem: {
    gap: 2,
  },
  exampleEN: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  exampleES: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  noExamples: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
