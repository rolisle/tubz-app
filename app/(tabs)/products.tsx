import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Product, ProductCategory } from '@/types';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  sweet: '🍬 Sweets',
  toy: '🪀 Toys',
  other: '📦 Other',
};

const CATEGORY_ORDER: ProductCategory[] = ['sweet', 'toy', 'other'];

const EMOJI_SUGGESTIONS = ['🍬', '🍭', '🍫', '🍩', '🌈', '🍊', '🍓', '🦈', '🍉', '🍦', '🥤', '❄️',
                           '🪀', '🤖', '🦄', '🦕', '🐶', '🌀', '⭐', '👾', '🧩', '🎬', '🐉', '🧚'];

type FilterTab = 'all' | ProductCategory;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Sweets', value: 'sweet' },
  { label: 'Toys', value: 'toy' },
  { label: 'Other', value: 'other' },
];

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)['light'];
}

function AddProductModal({ visible, onClose, colors }: AddProductModalProps) {
  const { addProduct } = useApp();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [category, setCategory] = useState<ProductCategory>('sweet');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a product name.');
      return;
    }
    addProduct(trimmed, emoji.trim() || undefined, category);
    setName('');
    setEmoji('');
    setCategory('sweet');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>New Product</Text>

        {/* Category selector */}
        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Category</Text>
        <View style={styles.categoryRow}>
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.categoryBtn,
                {
                  backgroundColor: category === cat ? colors.tint : colors.card,
                  borderColor: category === cat ? colors.tint : colors.border,
                },
              ]}>
              <Text style={[styles.categoryBtnText, { color: category === cat ? '#fff' : colors.subtext }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Name *</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="e.g. Gummy Bears"
          placeholderTextColor={colors.subtext}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
        />

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Emoji (optional)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="e.g. 🍬"
          placeholderTextColor={colors.subtext}
          value={emoji}
          onChangeText={setEmoji}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <View style={styles.emojiRow}>
          {EMOJI_SUGGESTIONS.map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => setEmoji(e)}
              style={[
                styles.emojiChip,
                { borderColor: emoji === e ? colors.tint : colors.border },
              ]}>
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={handleAdd}>
          <Text style={styles.addBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

interface ProductRowProps {
  product: Product;
  onDelete: () => void;
  colors: (typeof Colors)['light'];
}

function ProductRow({ product, onDelete, colors }: ProductRowProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Remove "${product.name}" from the catalog? This won't affect existing machine slots.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={styles.rowEmoji}>{product.emoji ?? '📦'}</Text>
      <Text style={[styles.rowName, { color: colors.text }]}>{product.name}</Text>
      <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProductsScreen() {
  const { state, deleteProduct } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const sections = useMemo(() => {
    const filtered = state.products.filter((p) => {
      const matchCat = filter === 'all' || p.category === filter || (!p.category && filter === 'other');
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filter !== 'all') {
      return [{ title: CATEGORY_LABELS[filter === 'other' ? 'other' : filter as ProductCategory], data: filtered }];
    }

    return CATEGORY_ORDER
      .map((cat) => ({
        title: CATEGORY_LABELS[cat],
        data: filtered.filter((p) => (p.category ?? 'other') === cat),
      }))
      .filter((s) => s.data.length > 0);
  }, [state.products, filter, search]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => setShowAdd(true)}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        {state.products.length} products in catalog
      </Text>

      {/* Search */}
      <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={{ color: colors.subtext, fontSize: 16 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products…"
          placeholderTextColor={colors.subtext}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Text style={{ color: colors.subtext }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setFilter(tab.value)}
            style={[
              styles.filterTab,
              {
                borderBottomColor: filter === tab.value ? colors.tint : 'transparent',
              },
            ]}>
            <Text
              style={[
                styles.filterTabText,
                { color: filter === tab.value ? colors.tint : colors.subtext },
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionHeader, { color: colors.subtext, backgroundColor: colors.background }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onDelete={() => deleteProduct(item.id)}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              {state.products.length === 0
                ? 'Tap + to add products to your catalog.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        }
      />

      <AddProductModal
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
    paddingBottom: 4,
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
  subtitle: {
    paddingHorizontal: 20,
    fontSize: 13,
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 4,
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    marginBottom: 4,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingVertical: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500' },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 17 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyNote: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
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
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  categoryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 4,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  emojiChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 6,
  },
  emojiText: { fontSize: 20 },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
