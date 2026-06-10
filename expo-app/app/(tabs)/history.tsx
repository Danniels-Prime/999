import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../hooks/useSettings';
import { useHistory } from '../../hooks/useHistory';
import { useTranslation } from '../../hooks/useTranslation';
import { HistoryItem } from '../../components/HistoryItem';
import { TranslationCard } from '../../components/TranslationCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';
import type { HistoryEntry } from '../../types';

export default function HistoryScreen() {
  const { settings } = useSettings();
  const { history, removeEntry, clearHistory } = useHistory(settings);
  const { result, lookup } = useTranslation(settings);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  const filtered = query.trim()
    ? history.filter(
        (h) =>
          h.word.toLowerCase().includes(query.toLowerCase()) ||
          h.translation.toLowerCase().includes(query.toLowerCase())
      )
    : history;

  const handlePress = async (entry: HistoryEntry) => {
    setSelected(entry);
    await lookup(entry.word);
  };

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Delete all saved words?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearBtn}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search words…"
        placeholderTextColor={Colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {selected && result && (
        <View style={styles.cardWrap}>
          <TranslationCard
            result={result}
            direction={settings.langDirection}
            showPhonetics={settings.showPhonetics}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {history.length === 0 ? 'No words looked up yet.' : 'No matches found.'}
          </Text>
        }
        renderItem={({ item }) => (
          <HistoryItem
            entry={item}
            onPress={handlePress}
            onDelete={removeEntry}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  clearBtn: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  search: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  cardWrap: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  empty: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
