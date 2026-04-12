import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationCard } from '@/components/location-card';
import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { StockLevel } from '@/types';

type Filter = 'all' | StockLevel;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: '1 Box', value: 'full' },
  { label: '½ Box', value: 'half' },
  { label: 'None', value: 'none' },
];

interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)['light'];
}

function AddLocationModal({ visible, onClose, colors }: AddLocationModalProps) {
  const { addLocation } = useApp();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a location name.');
      return;
    }
    addLocation({
      name: trimmed,
      address: address.trim() || undefined,
      stockLevel: 'full',
      lastRestockedAt: null,
      machines: [],
      notes: undefined,
    });
    setName('');
    setAddress('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>New Location</Text>

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Name *</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="e.g. Westfield Food Court"
          placeholderTextColor={colors.subtext}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
        />

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Address (optional)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="e.g. 123 Main St"
          placeholderTextColor={colors.subtext}
          value={address}
          onChangeText={setAddress}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={handleAdd}>
          <Text style={styles.addBtnText}>Add Location</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function LocationsScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = state.locations.filter((loc) => {
    const matchesFilter = filter === 'all' || loc.stockLevel === filter;
    const matchesSearch =
      !search ||
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.address?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Locations</Text>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => setShowAdd(true)}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={{ color: colors.subtext, fontSize: 16 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search locations…"
          placeholderTextColor={colors.subtext}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Text style={{ color: colors.subtext, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f.value ? colors.tint : colors.card,
                borderColor: filter === f.value ? colors.tint : colors.border,
              },
            ]}>
            <Text
              style={[
                styles.filterLabel,
                { color: filter === f.value ? '#fff' : colors.subtext },
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() => router.push({ pathname: '/location/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {state.locations.length === 0 ? 'No locations yet' : 'No results'}
            </Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              {state.locations.length === 0
                ? 'Tap + to add your first location.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        }
      />

      <AddLocationModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 24,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filters: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyNote: { fontSize: 14, textAlign: 'center' },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 4,
  },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
