import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../hooks/useSettings';
import {
  ToggleRow,
  SecretRow,
  SectionHeader,
} from '../../components/SettingsRow';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';
import type { LangDirection } from '../../types';

const DIRECTION_OPTIONS: Array<{ value: LangDirection; label: string }> = [
  { value: 'en_es', label: '🇺🇸 EN  →  🇪🇸 ES' },
  { value: 'es_en', label: '🇪🇸 ES  →  🇺🇸 EN' },
];

export default function SettingsScreen() {
  const { settings, updateKey } = useSettings();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Language */}
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

        {/* Output */}
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

        {/* Voice */}
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

        {/* Supabase */}
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
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            onChangeText={(v) => updateKey('supabaseAnonKey', v)}
          />
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Privacy</Text>
          <Text style={styles.infoBody}>
            All API keys are stored only on this device using AsyncStorage.
            They are never sent to any server other than the service you configured.
            No analytics. No tracking.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  dirRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
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
  dirBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentGlow,
  },
  dirBtnText: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  dirBtnTextActive: {
    color: Colors.accent,
  },
  group: {
    gap: Spacing.sm,
  },
  infoBox: {
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  infoTitle: {
    fontFamily: FontFamily.sansSemibold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  infoBody: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
