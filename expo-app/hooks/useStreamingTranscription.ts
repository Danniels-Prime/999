import { useState, useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { TranscriptionModule } = NativeModules;
const emitter =
  Platform.OS === 'android' && TranscriptionModule
    ? new NativeEventEmitter(TranscriptionModule)
    : null;

export interface Segment {
  id: string;
  text: string;
  timestamp: number;
}

export function useStreamingTranscription(apiKey: string, language = 'en-US', langDirection = 'en_es') {
  const [active, setActive]     = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [partial, setPartial]   = useState('');

  useEffect(() => {
    if (!emitter) return;

    const finalSub = emitter.addListener('onTranscription', (e: { text: string }) => {
      setPartial('');
      setSegments(prev => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, text: e.text, timestamp: Date.now() },
      ]);
      TranscriptionModule?.showOverlay(e.text, langDirection);
    });

    const partialSub = emitter.addListener('onTranscriptionPartial', (e: { text: string }) => {
      setPartial(e.text);
      TranscriptionModule?.showOverlay(e.text + ' …', langDirection);
    });

    return () => {
      finalSub.remove();
      partialSub.remove();
    };
  }, []);

  const start = () => {
    if (!TranscriptionModule) return;
    TranscriptionModule.startTranscription(apiKey, language);
    setActive(true);
    setSegments([]);
    setPartial('');
  };

  const stop = () => {
    if (!TranscriptionModule) return;
    TranscriptionModule.stopTranscription();
    TranscriptionModule.hideOverlay();
    setActive(false);
    setPartial('');
  };

  const clear = () => setSegments([]);

  return { active, segments, partial, start, stop, clear };
}
