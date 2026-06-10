import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, SafeAreaView, NativeModules,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { OverlayModule } = NativeModules;
const PREFS_KEY = 'overlay_lang_prefs';

const DEFAULT_PREFS = {
  langDirection: 'en_es', // 'en_es' | 'es_en'
  phonetics: true,         // show IPA (English source only)
  clipboardMonitor: true,  // bonus: also trigger on clipboard copy
};

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(raw => {
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    });
  }, []);

  const save = async updated => {
    setPrefs(updated);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    // Sync language direction to native layer immediately
    if (updated.langDirection) {
      OverlayModule?.setLanguageDirection?.(updated.langDirection);
    }
    // Toggle clipboard service
    if (updated.clipboardMonitor !== prefs.clipboardMonitor) {
      if (updated.clipboardMonitor) {
        OverlayModule?.startServices?.();
      } else {
        OverlayModule?.stopServices?.();
      }
    }
  };

  const toggle = key => save({ ...prefs, [key]: !prefs[key] });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Language direction */}
        <Section title="Language">
          <Text style={styles.label}>Translation direction</Text>
          <View style={styles.dirRow}>
            {[
              { value: 'en_es', label: '🇺🇸 EN  →  🇪🇸 ES' },
              { value: 'es_en', label: '🇪🇸 ES  →  🇺🇸 EN' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dirBtn, prefs.langDirection === opt.value && styles.dirBtnActive]}
                onPress={() => save({ ...prefs, langDirection: opt.value })}
              >
                <Text style={[
                  styles.dirBtnTxt,
                  prefs.langDirection === opt.value && styles.dirBtnTxtActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            More languages coming soon — Spanish and English are the first pair.
          </Text>
        </Section>

        {/* Output options */}
        <Section title="Output">
          <ToggleRow
            label="Show phonetics (IPA)"
            desc="American English pronunciation. Not shown for Spanish — Spanish is already phonetic."
            value={prefs.phonetics}
            onToggle={() => toggle('phonetics')}
          />
        </Section>

        {/* Activation */}
        <Section title="Activation">
          <ToggleRow
            label="Clipboard monitor"
            desc="When you copy any word in another app, the overlay appears automatically."
            value={prefs.clipboardMonitor}
            onToggle={() => toggle('clipboardMonitor')}
          />
          <Text style={styles.hint}>
            Double-tap, ghost drag, and long press are always active when the accessibility service is on.
          </Text>
        </Section>

        {/* TTS note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔊 Auto-read aloud</Text>
          <Text style={styles.infoDesc}>
            Every activation reads the word or phrase aloud automatically — no button needed.
            The voice matches your chosen language direction.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ToggleRow({ label, desc, value, onToggle }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {desc ? <Text style={styles.hint}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#2A2A4A', true: '#6C63FF' }}
        thumbColor={value ? '#fff' : '#555575'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: '#EAEAF5' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6C63FF', textTransform: 'uppercase', letterSpacing: 1 },
  sectionBody: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16, gap: 16, borderWidth: 1, borderColor: '#2A2A4A' },
  label: { fontSize: 15, fontWeight: '600', color: '#EAEAF5', marginBottom: 2 },
  hint: { fontSize: 12, color: '#9E9CBC', lineHeight: 17 },
  dirRow: { flexDirection: 'row', gap: 10 },
  dirBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A4A', alignItems: 'center' },
  dirBtnActive: { borderColor: '#6C63FF', backgroundColor: '#6C63FF22' },
  dirBtnTxt: { fontSize: 13, color: '#9E9CBC', fontWeight: '600' },
  dirBtnTxtActive: { color: '#6C63FF' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoBox: { backgroundColor: '#6C63FF11', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#6C63FF33', gap: 6 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  infoDesc: { fontSize: 13, color: '#B0AEC8', lineHeight: 19 },
});
