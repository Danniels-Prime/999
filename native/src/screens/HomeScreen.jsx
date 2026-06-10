import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  NativeModules, NativeEventEmitter, SafeAreaView,
} from 'react-native';
import PermissionWizard from '../components/PermissionWizard';
import OverlayCard from '../components/OverlayCard';

const { OverlayModule } = NativeModules;
const emitter = OverlayModule ? new NativeEventEmitter(OverlayModule) : null;

export default function HomeScreen() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [previewWord, setPreviewWord] = useState(null);

  // Listen for words activated by native services
  useEffect(() => {
    if (!emitter) return;
    const sub = emitter.addListener('onWordActivated', ({ word }) => {
      setPreviewWord(word);
    });
    return () => sub.remove();
  }, []);

  // Start services once permissions are granted
  useEffect(() => {
    if (permissionsGranted) {
      OverlayModule?.startServices?.();
    }
  }, [permissionsGranted]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.appName}>OverlayLang</Text>
        <Text style={styles.tagline}>Translate any word, anywhere.</Text>

        {!permissionsGranted ? (
          <PermissionWizard onAllGranted={() => setPermissionsGranted(true)} />
        ) : (
          <View style={styles.activeBox}>
            <Text style={styles.activeIcon}>⚡</Text>
            <Text style={styles.activeTitle}>Active & listening</Text>
            <Text style={styles.activeDesc}>
              Double-tap any word, slowly drag over text, or long-press a sentence
              in any app to see the translation. Works on your home screen too.
            </Text>
          </View>
        )}

        {/* How to use */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activation methods</Text>
          {METHODS.map(m => (
            <View key={m.key} style={styles.methodRow}>
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>{m.name}</Text>
                <Text style={styles.methodDesc}>{m.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Preview card (shown when native event fires while app is open) */}
        {previewWord && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Last word</Text>
            <OverlayCard
              word={previewWord}
              mode={1}
              onClose={() => setPreviewWord(null)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const METHODS = [
  {
    key: 'dt',
    icon: '👆👆',
    name: 'Double-tap',
    desc: 'Tap a word twice quickly. Shows translation instantly.',
  },
  {
    key: 'gd',
    icon: '👆→',
    name: 'Ghost drag',
    desc: 'Slowly slide your finger across a word or phrase, then lift. Reads it aloud + translates.',
  },
  {
    key: 'lp',
    icon: '✊',
    name: 'Long press + spread',
    desc: 'Hold down, then drag to select a full sentence. Shows the natural translation.',
  },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6C63FF',
    letterSpacing: 1,
  },
  tagline: { fontSize: 15, color: '#9E9CBC', marginTop: 4 },
  activeBox: {
    backgroundColor: '#0F2027',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4CAF5044',
    alignItems: 'center',
    gap: 8,
  },
  activeIcon: { fontSize: 32 },
  activeTitle: { fontSize: 18, fontWeight: '700', color: '#4CAF50' },
  activeDesc: { fontSize: 13, color: '#9E9CBC', lineHeight: 20, textAlign: 'center' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#EAEAF5' },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 14,
  },
  methodIcon: { fontSize: 22, width: 36 },
  methodName: { fontSize: 14, fontWeight: '600', color: '#EAEAF5', marginBottom: 2 },
  methodDesc: { fontSize: 12, color: '#9E9CBC', lineHeight: 17 },
  previewSection: { gap: 12 },
});
