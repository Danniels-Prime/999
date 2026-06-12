import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, PermissionsAndroid, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { AudioModule } from 'expo-audio';
import { useSettings } from '../../hooks/useSettings';
import { useBackgroundTranscription } from '../../hooks/useBackgroundTranscription';
import {
  ToggleRow, PermissionRow, SecretRow, SectionHeader,
} from '../../components/SettingsRow';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';
import type { LangDirection } from '../../types';

const DIRECTION_OPTIONS: Array<{ value: LangDirection; label: string }> = [
  { value: 'en_es', label: '🇺🇸 EN  →  🇪🇸 ES' },
  { value: 'es_en', label: '🇪🇸 ES  →  🇺🇸 EN' },
];

export default function SettingsScreen() {
  const { settings, updateKey } = useSettings();
  const bgLang = settings.langDirection === 'en_es' ? 'en-US' : 'es';
  const { active, start, stop, canDrawOverlays, openOverlaySettings } =
    useBackgroundTranscription(settings.deepgramApiKey, bgLang);

  const [micGranted,     setMicGranted]     = useState<boolean | null>(null);
  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);
  const [notifGranted,   setNotifGranted]   = useState<boolean | null>(null);

  const refreshPermissions = useCallback(async () => {
    const mic = await AudioModule.getRecordingPermissionsAsync();
    setMicGranted(mic.granted);

    const overlay = await canDrawOverlays();
    setOverlayGranted(overlay);

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const notif = await PermissionsAndroid.check(
        'android.permission.POST_NOTIFICATIONS' as any
      );
      setNotifGranted(notif);
    } else {
      setNotifGranted(true);
    }
  }, [canDrawOverlays]);

  // Initial check
  useEffect(() => { refreshPermissions(); }, [refreshPermissions]);

  // Re-check whenever the app returns to foreground (user came back from Android Settings)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermissions();
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  const requestMic = async () => {
    await AudioModule.requestRecordingPermissionsAsync();
    await refreshPermissions();
  };

  const handleOverlayPress = async () => {
    await openOverlaySettings();
    // Wait a beat — Android needs a moment to persist the permission change
    await new Promise((r) => setTimeout(r, 600));
    await refreshPermissions();
  };

  const requestNotifications = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any
      );
      await refreshPermissions();
    }
  };

  const handleBgToggle = (v: boolean) => { if (v) start(); else stop(); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <SectionHeader title="Permissions" />
        <View style={styles.group}>
          <PermissionRow
            label="Microphone"
            description="Required for voice input and background transcription."
            granted={micGranted}
            onAction={requestMic}
          />
          <PermissionRow
            label="Draw Over Apps"
            description="Shows floating overlay with transcription while using other apps."
            granted={overlayGranted}
            onAction={handleOverlayPress}
            actionLabel="Enable"
          />
          <PermissionRow
            label="Notifications"
            description="Shows persistent notification while background listening is active."
            granted={notifGranted}
            onAction={requestNotifications}
          />
          <ToggleRow
            label="Background Mic"
            description="Keep recording and transcribing when the app is in the background."
            value={active}
            onToggle={handleBgToggle}
          />
        </View>

        <SectionHeader title="Language" />
        <View style={styles.dirRow}>
          {DIRECTION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dirBtn,
                settings.langDirection === opt.value && styles.dirBtnActive,
              ]}
              onPress={() => updateKey('langDirection', opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dirBtnText,
                  settings.langDirection === opt.value && styles.dirBtnTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Output" />
        <View style={styles.group}>
          <ToggleRow
            label="Show phonetics (IPA)"
            description="American English pronunciation. English source only — Spanish needs no IPA."
            value={settings.showPhonetics}
            onToggle={(v) => updateKey('showPhonetics', v)}
          />
          <ToggleRow
            label="Auto read aloud"
            description="Speak the word automatically on every translation."
            value={settings.autoTts}
            onToggle={(v) => updateKey('autoTts', v)}
          />
        </View>

        <SectionHeader title="Voice Input" />
        <View style={styles.group}>
          <SecretRow
            label="Deepgram API Key"
            description="Nova-2 model. Free tier: 12,000 min/year. Get key at console.deepgram.com"
            value={settings.deepgramApiKey}
            placeholder="dg_••••••••••••••••••••••••••••••••"
            onChangeText={(v) => updateKey('deepgramApiKey', v)}
          />
        </View>

        <SectionHeader title="Sync (optional)" />
        <View style={styles.group}>
          <SecretRow
            label="Supabase URL"
            description="Your project URL from supabase.com/dashboard/project/_/settings/api"
            value={settings.supabaseUrl}
            placeholder="https://xxxx.supabase.co"
            onChangeText={(v) => updateKey('supabaseUrl', v)}
          />
          <SecretRow
            label="Supabase Anon Key"
            description="Public anon key from the same page. Row Level Security must be enabled."
            value={settings.supabaseAnonKey}
            placeholder="eyJhbGci…"
            onChangeText={(v) => updateKey('supabaseAnonKey', v)}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Privacy</Text>
          <Text style={styles.infoBody}>
            All API keys are stored only on this device using AsyncStorage.{' '}
            They are never sent to any server other than the service you configured.{' '}
            No analytics. No tracking.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  title:  {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  dirRow: { flexDirection: 'row', gap: Spacing.sm },
  dirBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
  },
  dirBtnActive:     { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  dirBtnText:       { fontFamily: FontFamily.mono, fontSize: FontSize.sm, color: Colors.textSecondary },
  dirBtnTextActive: { color: Colors.accent },
  group:  { gap: Spacing.sm },
  infoBox: {
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  infoTitle: { fontFamily: FontFamily.sansSemibold, fontSize: FontSize.sm, color: Colors.accent },
  infoBody:  {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
