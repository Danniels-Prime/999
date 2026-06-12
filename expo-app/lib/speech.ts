import Voice from '@react-native-voice/voice';

export function startListening(locale: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      Voice.onSpeechResults = undefined as any;
      Voice.onSpeechError = undefined as any;
    };

    Voice.onSpeechResults = (event: any) => {
      const text: string | undefined = event.value?.[0]?.trim();
      if (text) {
        cleanup();
        Voice.destroy().catch(() => {});
        resolve(text);
      }
    };

    Voice.onSpeechError = (event: any) => {
      cleanup();
      Voice.destroy().catch(() => {});
      const msg: string = event.error?.message ?? 'Speech recognition failed';
      reject(new Error(msg));
    };

    Voice.start(locale).catch((err: unknown) => {
      cleanup();
      reject(err);
    });
  });
}

export async function stopListening(): Promise<void> {
  Voice.onSpeechResults = undefined as any;
  Voice.onSpeechError = undefined as any;
  await Voice.stop().catch(() => {});
  await Voice.destroy().catch(() => {});
}
