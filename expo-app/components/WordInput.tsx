import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../constants/theme';

interface Props {
  onSubmit: (text: string) => void;
  onMicPress: () => void;
  loading: boolean;
  recording: boolean;
  placeholder?: string;
}

export function WordInput({
  onSubmit,
  onMicPress,
  loading,
  recording,
  placeholder = 'Type a word or phrase…',
}: Props) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, recording && styles.inputRowRecording]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          multiline={false}
          editable={!loading}
        />

        {/* Mic button */}
        <TouchableOpacity
          onPress={onMicPress}
          style={[styles.micBtn, recording && styles.micBtnActive]}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>{recording ? '⏹' : '🎩'}</Text>
        </TouchableOpacity>
      </View>

      {/* Translate button */}
      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.translateBtn, (!text.trim() || loading) && styles.translateBtnDisabled]}
        activeOpacity={0.8}
        disabled={!text.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.bg} size="small" />
        ) : (
          <Text style={styles.translateBtnText}>Translate ⚡</Text>
        )}
      </TouchableOpacity>

      {recording && (
        <Text style={styles.recordingHint}>Recording… tap ⏹ to stop</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    gap: Spacing.sm,
  },
  inputRowRecording: {
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  micBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
  },
  micBtnActive: {
    backgroundColor: Colors.accentDim,
  },
  micIcon: {
    fontSize: 20,
  },
  translateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateBtnDisabled: {
    opacity: 0.4,
  },
  translateBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: FontSize.md,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  recordingHint: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.accent,
    textAlign: 'center',
  },
});
