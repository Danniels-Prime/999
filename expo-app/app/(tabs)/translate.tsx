import { useCallback, useState } from 'react';
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
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { useHistory } from '../../hooks/useHistory';
import { transcribeAudio } from '../../lib/deepgram';
import { TranslationCard } from '../../components/TranslationCard';
import { WordInput } from '../../components/WordInput';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

export default function TranslateScreen() {
  const { settings } = useSettings();
  const { result, loading, error, lookup } = useTranslation(settings);
  const { addEntry } = useHistory(settings);

  const [recording, setRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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
      setRecording(false);
      await audioRecorder.stop();
      const uri = audioRecorder.getStatus().url ?? null;
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
      try {
        const { status } = await AudioModule.requestRecordingPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Microphone permission is needed for voice input.');
          return;
        }
        await AudioModule.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setRecording(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('Error', 'Could not start recording.');
      }
    }
  }, [recording, settings.deepgramApiKey, handleLookup, audioRecorder]);

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
          <View style={styles.header}>
            <Text style={styles.title}>Translate</Text>
            <Text style={styles.dirLabel}>{dirLabel}</Text>
          </View>

          <WordInput
            onSubmit={handleLookup}
            onMicPress={handleMicPress}
            loading={loading}
            recording={recording}
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {result && (
            <TranslationCard
              result={result}
              direction={settings.langDirection}
              showPhonetics={settings.showPhonetics}
            />
          )}

          {!result && !loading && !error && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>Type to translate</Text>
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
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { gap: 4, marginBottom: Spacing.xs },
  title: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    letterSpacing: 1,
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
  emptyIcon: { fontSize: 48 },
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
