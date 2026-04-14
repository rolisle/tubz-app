import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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

import { PRODUCT_IMAGES } from '@/constants/product-images';
import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { primaryColor, useSettings } from '@/context/settings-context';
import { GradView } from '@/components/ui/grad-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MachineType, Product } from '@/types';

/* ─── Constants ─────────────────────────────────────────────── */

const STORAGE_KEY = '@tubz_restock_v1';
const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: 'Sweet Machine 🍬',
  toy: 'Toy Machine 🪀',
};
const MAX_QTY: Record<MachineType, number> = { sweet: 9, toy: 12 };

/* ─── Local data model ───────────────────────────────────────── */

interface RestockItem {
  id: string;
  productId: string;
  qty: number;
  done?: boolean;
}
interface RestockMachine {
  id: string;
  type: MachineType;
  items: RestockItem[];
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ─── ProductThumb ────────────────────────────────────────────── */

function ProductThumb({ product, size }: { product: Product | undefined; size: number }) {
  const src = product?.localImageUri
    ? { uri: product.localImageUri }
    : product ? PRODUCT_IMAGES[product.id] : undefined;
  if (src) {
    return <Image source={src} style={{ width: size, height: size, borderRadius: 6 }} resizeMode="cover" />;
  }
  return (
    <Text style={{ fontSize: size * 0.7, width: size, textAlign: 'center', lineHeight: size, includeFontPadding: false }}>
      {product?.emoji ?? '📦'}
    </Text>
  );
}

/* ─── Product picker modal ───────────────────────────────────── */

interface ProductPickerProps {
  machineType: MachineType;
  products: Product[];
  onSelect: (productId: string) => void;
  onClose: () => void;
}

function ProductPicker({ machineType, products, onSelect, onClose }: ProductPickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !p.category || p.category === machineType)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, machineType, search]);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Add product</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.sheetClose, { color: colors.subtext }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: searchFocused ? accent : colors.border }]}>
          <Text style={[styles.searchIcon, { color: colors.subtext }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search products…"
            placeholderTextColor={colors.subtext}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.pickerRow, { borderBottomColor: colors.border }]}
              onPress={() => { onSelect(item.id); onClose(); }}>
              <ProductThumb product={item} size={36} />
              <Text style={[styles.pickerRowName, { color: colors.text }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.pickerEmpty, { color: colors.subtext }]}>
              {search ? `No results for "${search}"` : 'No products match this machine type.'}
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

/* ─── Machine card ───────────────────────────────────────────── */

interface MachineCardProps {
  machine: RestockMachine;
  products: Product[];
  colors: (typeof Colors)['light'];
  accent: string;
  onChange: (updated: RestockMachine) => void;
  onRemove: () => void;
}

function MachineCard({ machine, products, colors, accent, onChange, onRemove }: MachineCardProps) {
  const [showPicker, setShowPicker] = useState(false);
  const max = MAX_QTY[machine.type];

  const setQty = useCallback((itemId: string, delta: number) => {
    const existing = machine.items.find((i) => i.id === itemId);
    if (!existing) return;
    const newQty = Math.max(0, Math.min(max, existing.qty + delta));
    const newItems = newQty === 0
      ? machine.items.filter((i) => i.id !== itemId)
      : machine.items.map((i) => i.id === itemId ? { ...i, qty: newQty } : i);
    onChange({ ...machine, items: newItems });
  }, [machine, max, onChange]);

  const handleAddProduct = useCallback((productId: string) => {
    onChange({ ...machine, items: [...machine.items, { id: uid(), productId, qty: 0, done: false }] });
  }, [machine, onChange]);

  const toggleDone = useCallback((itemId: string) => {
    onChange({
      ...machine,
      items: machine.items.map((i) => i.id === itemId ? { ...i, done: !i.done } : i),
    });
  }, [machine, onChange]);

  const totalQty = machine.items.reduce((s, i) => s + i.qty, 0);

  return (
    <View style={[styles.machineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.machineHeader}>
        <View style={styles.machineTitleRow}>
          <Text style={[styles.machineTitle, { color: colors.text }]}>{MACHINE_LABELS[machine.type]}</Text>
          {totalQty > 0 && (
            <View style={[styles.totalBadge, { backgroundColor: accent + '22' }]}>
              <Text style={[styles.totalBadgeText, { color: accent }]}>{totalQty} total</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Text style={{ color: '#ef4444', fontSize: 13 }}>Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      {machine.items.length === 0 ? (
        <Text style={[styles.emptyMachine, { color: colors.subtext }]}>No products added yet.</Text>
      ) : (
        machine.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          const pct = item.qty / max;
          const barColor = pct < 0.4 ? '#ef4444' : pct < 0.75 ? '#f59e0b' : '#22c55e';
          return (
            <View key={item.id} style={[styles.itemRow, { borderTopColor: colors.border, opacity: item.done ? 0.4 : 1 }]}>
              {/* Done toggle */}
              <TouchableOpacity onPress={() => toggleDone(item.id)} hitSlop={8} style={[styles.doneBtn, { borderColor: item.done ? accent : colors.border, backgroundColor: item.done ? accent : 'transparent' }]}>
                {item.done && <Text style={styles.doneTick}>✓</Text>}
              </TouchableOpacity>

              <ProductThumb product={product} size={50} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text, textDecorationLine: item.done ? 'line-through' : 'none' }]} numberOfLines={1}>
                  {product?.name ?? item.productId}
                </Text>
                {!item.done && (
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
                  </View>
                )}
              </View>
              {!item.done && (
                <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => setQty(item.id, -1)}
                  disabled={item.qty === 0}
                  hitSlop={6}
                  style={[styles.counterBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: item.qty === 0 ? 0.3 : 1 }]}>
                  <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
                </TouchableOpacity>
                  <Text style={[styles.counterVal, { color: colors.text }]}>
                    {item.qty}
                    <Text style={[styles.counterMax, { color: colors.subtext }]}>/{max}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQty(item.id, +1)}
                    disabled={item.qty >= max}
                    hitSlop={6}
                    style={[styles.counterBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: item.qty >= max ? 0.3 : 1 }]}>
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>＋</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Add product button */}
      <TouchableOpacity
        style={[styles.addProductBtn, { borderColor: accent }]}
        onPress={() => setShowPicker(true)}>
        <Text style={[styles.addProductText, { color: accent }]}>+ Add product</Text>
      </TouchableOpacity>

      {showPicker && (
        <ProductPicker
          machineType={machine.type}
          products={products}
          onSelect={handleAddProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </View>
  );
}

/* ─── Main screen ────────────────────────────────────────────── */

export default function RestockScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const sweetColor = settings.sweetColor;
  const toyColor = settings.toyColor;

  const defaultMachines = (): RestockMachine[] => [
    { id: uid(), type: 'sweet', items: [] },
    { id: uid(), type: 'toy', items: [] },
  ];

  const [machines, setMachines] = useState<RestockMachine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: RestockMachine[] = JSON.parse(raw);
          setMachines(parsed.length > 0 ? parsed : defaultMachines());
        } catch { setMachines(defaultMachines()); }
      } else {
        setMachines(defaultMachines());
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  }, [machines, loaded]);

  const addMachine = (type: MachineType) => {
    setMachines((prev) => [...prev, { id: uid(), type, items: [] }]);
  };

  const updateMachine = useCallback((updated: RestockMachine) => {
    setMachines((prev) => prev.map((m) => m.id === updated.id ? updated : m));
  }, []);

  const removeMachine = (id: string) => {
    Alert.alert('Remove Machine', 'Remove this machine from your restock list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMachines((prev) => prev.filter((m) => m.id !== id)) },
    ]);
  };

  const clearAll = () => {
    if (machines.length === 0) return;
    Alert.alert('Clear Restock List', 'Remove all machines and reset quantities?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMachines([]) },
    ]);
  };

  const totalItems = useMemo(() => machines.reduce((s, m) => s + m.items.reduce((ss, i) => ss + i.qty, 0), 0), [machines]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Restock</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {totalItems > 0 ? `${totalItems} item${totalItems !== 1 ? 's' : ''} planned` : 'Plan your next restock run'}
          </Text>
        </View>
        {machines.length > 0 && (
          <TouchableOpacity onPress={clearAll} hitSlop={8}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '500' }}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Add machine buttons */}
        <View style={styles.addMachineRow}>
          <TouchableOpacity
            style={[styles.addMachineBtn, { borderColor: primaryColor(sweetColor) }]}
            onPress={() => addMachine('sweet')}>
            <GradView colors={sweetColor} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} />
            <Text style={styles.addMachineEmoji}>🍬</Text>
            <Text style={[styles.addMachineBtnText, { color: primaryColor(sweetColor) }]}>Sweet Machine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addMachineBtn, { borderColor: primaryColor(toyColor) }]}
            onPress={() => addMachine('toy')}>
            <GradView colors={toyColor} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} />
            <Text style={styles.addMachineEmoji}>🪀</Text>
            <Text style={[styles.addMachineBtnText, { color: primaryColor(toyColor) }]}>Toy Machine</Text>
          </TouchableOpacity>
        </View>

        {machines.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing to restock yet</Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              Add a sweet or toy machine above, then set how many of each product you need.
            </Text>
          </View>
        ) : (
          machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              products={state.products}
              colors={colors}
              accent={accent}
              onChange={updateMachine}
              onRemove={() => removeMachine(machine.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  addMachineRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addMachineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 14,
    overflow: 'hidden',
  },
  addMachineEmoji: { fontSize: 18 },
  addMachineBtnText: { fontSize: 14, fontWeight: '600' },
  // Machine card
  machineCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  machineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  machineTitle: { fontSize: 15, fontWeight: '700' },
  totalBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  totalBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyMachine: { fontSize: 13, paddingHorizontal: 14, paddingBottom: 10 },
  // Done toggle
  doneBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doneTick: { fontSize: 12, lineHeight: 12, includeFontPadding: false, color: '#fff', fontWeight: '700' },
  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: { flex: 1, gap: 5 },
  itemName: { fontSize: 13, fontWeight: '500' },
  barTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 16, lineHeight: 16, includeFontPadding: false, fontWeight: '500' },
  counterVal: { fontSize: 15, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  counterMax: { fontSize: 11, fontWeight: '400' },
  // Add product button
  addProductBtn: {
    margin: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  addProductText: { fontSize: 13, fontWeight: '600' },
  // Product picker modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetClose: { fontSize: 15 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowName: { flex: 1, fontSize: 14, fontWeight: '500' },
  pickerAdded: { fontSize: 12 },
  pickerEmpty: { padding: 20, textAlign: 'center', fontSize: 13 },
  // Empty state
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyNote: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
