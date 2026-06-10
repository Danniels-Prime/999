/**
 * History screen: shows all words the user has looked up, stored in AsyncStorage.
 * Tapping a word re-opens its overlay card inline for quick review.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OverlayCard from '../components/OverlayCard';

const HISTORY_KEY = 'overlay_lang_history';
const MAX_HISTORY = 500;

export async function addToHistory(word, translation, direction) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    const exists = history.findIndex(h => h.word === word && h.direction === direction);
    if (exists !== -1) history.splice(exists, 1);
    history.unshift({ word, translation, direction, ts: Date.now() });
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    setHistory(raw ? JSON.parse(raw) : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = query.trim()
    ? history.filter(h =>
        h.word.toLowerCase().includes(query.toLowerCase()) ||
        (h.translation && h.translation.toLowerCase().includes(query.toLowerCase()))
      )
    : history;

  const clearAll = async () => {
    await AsyncStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearBtn}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search words..."
        placeholderTextColor="#555575"
        value={query}
        onChangeText={setQuery}
      />

      {selected && (
        <View style={styles.cardWrap}>
          <OverlayCard
            word={selected.word}
            mode={1}
            onClose={() => setSelected(null)}
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => `${item.word}_${i}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {history.length === 0 ? 'No words looked up yet.' : 'No matches.'}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.historyItem}
            onPress={() => setSelected(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.historyWord}>{item.word}</Text>
              <Text style={styles.historyTranslation}>{item.translation}</Text>
            </View>
            <Text style={styles.historyDir}>
              {item.direction === 'en_es' ? '🇺🇸→🇪🇸' : '🇪🇸→🇺🇸'}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#EAEAF5' },
  clearBtn: { fontSize: 13, color: '#6C63FF' },
  search: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#1A1A2E', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    color: '#EAEAF5', fontSize: 14,
    borderWidth: 1, borderColor: '#2A2A4A',
  },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  empty: { color: '#555575', fontSize: 14, textAlign: 'center', marginTop: 40 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#2A2A4A',
  },
  historyWord: { fontSize: 15, fontWeight: '700', color: '#EAEAF5', marginBottom: 2 },
  historyTranslation: { fontSize: 13, color: '#6C63FF' },
  historyDir: { fontSize: 14 },
  cardWrap: { marginHorizontal: 20, marginBottom: 12 },
});
