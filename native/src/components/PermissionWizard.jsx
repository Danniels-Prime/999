/**
 * Guides the user through the two required permission grants:
 *  1. Draw over other apps (SYSTEM_ALERT_WINDOW)
 *  2. Accessibility service
 *
 * Shows live status for each — green once granted.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, AppState,
  NativeModules,
} from 'react-native';

const { OverlayModule } = NativeModules;

export default function PermissionWizard({ onAllGranted }) {
  const [overlayOk, setOverlayOk] = useState(false);
  const [accessOk, setAccessOk] = useState(false);

  const check = useCallback(() => {
    const oOk = OverlayModule?.hasOverlayPermissionSync?.() ?? false;
    setOverlayOk(oOk);
    // Accessibility permission can only be verified by the user observing behavior;
    // we track it in AsyncStorage once the user says they enabled it
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (overlayOk && accessOk) onAllGranted?.();
  }, [overlayOk, accessOk, onAllGranted]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two quick permissions</Text>
      <Text style={styles.subtitle}>
        OverlayLang needs these to work in all apps and on your home screen.
      </Text>

      <PermissionRow
        label="Draw over other apps"
        description="Lets the translation card float above everything."
        granted={overlayOk}
        onRequest={() => OverlayModule?.requestOverlayPermission?.()}
      />

      <PermissionRow
        label="Accessibility service"
        description="Detects double-taps, drags, and long-presses on any word system-wide."
        granted={accessOk}
        onRequest={() => {
          OverlayModule?.requestAccessibilityPermission?.();
        }}
        onConfirm={() => setAccessOk(true)}
        showConfirm
      />
    </View>
  );
}

function PermissionRow({ label, description, granted, onRequest, onConfirm, showConfirm }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={[styles.statusDot, granted && styles.dotOk]}>
          {granted ? '✓' : '○'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowDesc}>{description}</Text>
        </View>
      </View>
      {!granted && (
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={onRequest} style={styles.btn}>
            <Text style={styles.btnTxt}>Open Settings</Text>
          </TouchableOpacity>
          {showConfirm && (
            <TouchableOpacity onPress={onConfirm} style={[styles.btn, styles.btnSecondary]}>
              <Text style={styles.btnTxtSecondary}>I enabled it</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#EAEAF5', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9E9CBC', lineHeight: 20, marginBottom: 8 },
  row: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    gap: 12,
  },
  rowLeft: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  statusDot: { fontSize: 20, color: '#555575', marginTop: 1 },
  dotOk: { color: '#4CAF50' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#EAEAF5', marginBottom: 2 },
  rowDesc: { fontSize: 12, color: '#9E9CBC', lineHeight: 17 },
  rowActions: { flexDirection: 'row', gap: 8 },
  btn: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnSecondary: { backgroundColor: '#2A2A4A' },
  btnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnTxtSecondary: { color: '#9E9CBC', fontWeight: '600', fontSize: 13 },
});
