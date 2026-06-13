import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AudioModule } from 'expo-audio';
import { useSettings } from '../../hooks/useSettings';
import { useStreamingTranscription, type Segment } from '../../hooks/useStreamingTranscription';
import { WordDetailSheet } from '../../components/WordDetailSheet';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface WordToken {
  word: string;
  segmentId: string;
  segmentText: string;
}

function SegmentLine({ segment, onWordPress }: {
  segment: Segment;
  onWordPress: (token: WordToken) => void;
}) {
  const words = segment.text.split(/(\s+)/).filter(Boolean);
  return (
    <Text style={styles.segmentLine}>
      {words.map((token, i) => {
        if (/^\s+$/.test(token)) return <Text key={i}>{token}</Text>;
        return (
          <Text
            key={i}
            style={styles.wordToken}
            onPress={() => onWordPress({ word: token.replace(/[^a-zA-ZÀ-ÿ''-]/g, ''), segmentId: segment.id, segmentText: segment.text })}
          >
            {token}
          </Text>
        );
      })}
    </Text>
  );
}

export default function LiveScreen() {
  const { settings } = useSettings();
  const langCode = settings.langDirection === 'en_es' ? 'en-US' : 'es';
  const { active, segments, partial, start, stop } = useStreamingTranscription(
    settings.deepgramApiKey,
    langCode
  );

  const scrollRef = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<WordToken | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [segments, partial]);

  const handleToggle = async () => {
    if (active) {
      stop();
      return;
    }

    if (!settings.deepgramApiKey) {
      Alert.alert(
        'Deepgram API Key Required',
        'Go to Settings → Voice Input and enter your Deepgram API key to enable live captions.',
        [{ text: 'OK' }]
      );
      return;
    }

    const { status } = await AudioModule.requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Microphone permission is needed for live captions.');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    start();
  };

  const handleWordPress = (token: WordToken) => {
    if (!token.word) return;
    Haptics.selectionAsync();
    setSelected(token);
  };

  const dirLabel = settings.langDirection === 'en_es' ? '🇺🇸 → 🇪🇸' : '🇪🇸 → 🇺🇸';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>OverlayLang</Text>
        <Text style={styles.dirLabel}>{dirLabel}  ·  Live Captions</Text>
      </View>

      {/* Captions area */}
      <ScrollView
        ref={scrollRef}
        style={styles.captionsScroll}
        contentContainerStyle={styles.captionsContent}
        showsVerticalScrollIndicator={false}
      >
        {segments.length === 0 && !partial && !active && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={styles.emptyTitle}>
              {settings.deepgramApiKey ? 'Tap the mic to start' : 'Add Deepgram key in Settings'}
            </Text>
            <Text style={styles.emptyBody}>
              Everything spoken will appear here in real-time.{'\n'}
              Tap any word for translation + explanation.
            </Text>
          </View>
        )}

        {segments.map((seg) => (
          <SegmentLine key={seg.id} segment={seg} onWordPress={handleWordPress} />
        ))}

        {/* Partial / in-progress text */}
        {partial ? (
          <Text style={styles.partialText}>{partial}</Text>
        ) : null}

        {active && !partial && (
          <Text style={styles.listeningDot}>●</Text>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.micBtn, active && styles.micBtnActive]}
          onPress={handleToggle}
          activeOpacity={0.8}
        >
          <Text style={styles.micBtnText}>{active ? '⏹  Stop' : '🎙  Start'}</Text>
        </TouchableOpacity>
      </View>

      {/* Word detail sheet */}
      {selected && (
        <WordDetailSheet
          word={selected.word}
          sentence={selected.segmentText}
          direction={settings.langDirection}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  appName: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize['2xl'],
    color: Colors.accent,
    letterSpacing: 2,
  },
  dirLabel: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  captionsScroll: {
    flex: 1,
  },
  captionsContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: FontFamily.sansSemibold,
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  segmentLine: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    lineHeight: 28,
    flexWrap: 'wrap',
  },
  wordToken: {
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: Colors.accentDim,
    textDecorationStyle: 'dotted',
  },
  partialText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  listeningDot: {
    color: Colors.accent,
    fontSize: 10,
    opacity: 0.6,
  },
  controls: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  micBtn: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  micBtnActive: {
    backgroundColor: '#FF4D6D22',
    borderColor: '#FF4D6D44',
  },
  micBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
});
