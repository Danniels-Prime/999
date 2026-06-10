import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { useHistory } from '../../hooks/useHistory';
import { transcribeAudio } from '../../lib/deepgram';
import { TranslationCard } from '../../components/TranslationCard';
import { WordInput } from '../../components/WordInput';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export default function HomeScreen() {
  const { settings } = useSettings();
  const { result, loading, error, lookup } = useTranslation(settings);
  const { addEntry } = useHistory(settings);

  const [recording, setRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const handleLookup = useCallback(
    async (text: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await lookup(text);
      if (res) addEntry(res);
    },
    [lookup, addEntry]
  );

  const handleMicPress = useCallback(async () => {
    if (!settings.deepgramApiKey) {
      Alert.alert(
        'Deepgram API Key Required',
        'Add your Deepgram API key in Settings to use voice input.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (recording) {
      // Stop recording
      setRecording(false);
      const rec = recordingRef.current;
      if (!rec) return;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      if (uri) {
        try {
          const transcript = await transcribeAudio(uri, settings.deepgramApiKey);
          if (transcript) await handleLookup(transcript);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Transcription failed';
          Alert.alert('Voice Error', msg);
        }
      }
    } else {
      // Start recording
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone permission is needed for voice input.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: rec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = rec;
        setRecording(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('Error', 'Could not start recording.');
      }
    }
  }, [recording, settings.deepgramApiKey, handleLookup]);

  const dirLabel =
    settings.langDirection === 'en_es' ? '🇺🇸 EN  →  🇪🇸 ES' : '🇪🇸 ES  →  🇺🇸 EN';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>OverlayLang</Text>
            <Text style={styles.dirLabel}>{dirLabel}</Text>
          </View>

          {/* Input */}
          <WordInput
            onSubmit={handleLookup}
            onMicPress={handleMicPress}
            loading={loading}
            recording={recording}
          />

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Result */}
          {result && (
            <TranslationCard
              result={result}
              direction={settings.langDirection}
              showPhonetics={settings.showPhonetics}
            />
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>Ready to translate</Text>
              <Text style={styles.emptyBody}>
                Type a word or phrase above, or tap the mic for voice input.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingTop: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: 4,
  },
  appName: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize['3xl'],
    color: Colors.accent,
    letterSpacing: 2,
  },
  dirLabel: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  errorBox: {
    backgroundColor: '#FF4D6D22',
    borderRadius: 10,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FF4D6D44',
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontFamily: FontFamily.sansSemibold,
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
  },
  emptyBody: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
