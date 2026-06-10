import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../constants/theme';
import type { HistoryEntry } from '../types';

interface Props {
  entry: HistoryEntry;
  onPress: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

export function HistoryItem({ entry, onPress, onDelete }: Props) {
  const dirLabel = entry.direction === 'en_es' ? '🇺🇸→🇪🇸' : '🇪🇸→🇺🇸';
  const date = new Date(entry.timestamp);
  const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity
      onPress={() => onPress(entry)}
      activeOpacity={0.75}
      style={styles.row}
    >
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.word} numberOfLines={1}>
            {entry.word}
          </Text>
          <Text style={styles.dir}>{dirLabel}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.translation} numberOfLines={1}>
            {entry.translation}
          </Text>
          <Text style={styles.date}>{timeStr}</Text>
        </View>
        {entry.ipa && (
          <Text style={styles.ipa}>{entry.ipa}</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onDelete(entry.id)}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  word: {
    fontFamily: FontFamily.sansSemibold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  dir: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  translation: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.accent,
    flex: 1,
  },
  date: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  ipa: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  deleteIcon: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
