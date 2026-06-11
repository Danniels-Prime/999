import { useState, useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { TranscriptionModule } = NativeModules;

// Only wire up the emitter on Android where the native module exists
const emitter =
  Platform.OS === 'android' && TranscriptionModule
    ? new NativeEventEmitter(TranscriptionModule)
    : null;

export function useBackgroundTranscription(apiKey: string, language = 'en-US') {
  const [active, setActive] = useState(false);
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

  const showOverlay = (text: string) => {
    TranscriptionModule?.showOverlay(text);
  };

  const hideOverlay = () => {
    TranscriptionModule?.hideOverlay();
  };

  const canDrawOverlays = (): Promise<boolean> => {
    if (!TranscriptionModule) return Promise.resolve(false);
    return TranscriptionModule.canDrawOverlays();
  };

  return { active, transcript, start, stop, showOverlay, hideOverlay, canDrawOverlays };
}
