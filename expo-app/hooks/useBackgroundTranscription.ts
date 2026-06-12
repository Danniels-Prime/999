import { useState, useEffect, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform, AppState } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const { TranscriptionModule } = NativeModules;

const emitter =
  Platform.OS === 'android' && TranscriptionModule
    ? new NativeEventEmitter(TranscriptionModule)
    : null;

export function useBackgroundTranscription(apiKey: string, language = 'en-US') {
  const [active, setActive]     = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!emitter) return;
    const sub = emitter.addListener('onTranscription', (e: { text: string }) => {
      setTranscript(e.text);
    });
    return () => sub.remove();
  }, []);

  const start = () => {
    if (!TranscriptionModule) return;
    TranscriptionModule.startTranscription(apiKey, language);
    setActive(true);
  };

  const stop = () => {
    if (!TranscriptionModule) return;
    TranscriptionModule.stopTranscription();
    setActive(false);
  };

  const showOverlay = (text: string) => TranscriptionModule?.showOverlay(text);
  const hideOverlay = () => TranscriptionModule?.hideOverlay();

  const canDrawOverlays = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    // Native module path (normal operation)
    if (TranscriptionModule) {
      return TranscriptionModule.canDrawOverlays();
    }
    // Fallback: the module isn't registered yet — return false so the
    // Settings screen keeps showing the Enable button.
    return false;
  }, []);

  const openOverlaySettings = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.action.MANAGE_OVERLAY_PERMISSION' as any,
        { data: 'package:com.overlaylang.app' }
      );
    } catch {
      // Some ROMs don't support the targeted intent; fall back to app info
      await IntentLauncher.startActivityAsync(
        'android.settings.APPLICATION_DETAILS_SETTINGS' as any,
        { data: 'package:com.overlaylang.app' }
      );
    }
  }, []);

  return {
    active, transcript,
    start, stop,
    showOverlay, hideOverlay,
    canDrawOverlays, openOverlaySettings,
  };
}
