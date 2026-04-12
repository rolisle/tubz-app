import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Machine, Product } from '@/types';

type ViewMode = 'grid' | 'list';

interface MachineGridProps {
  machine: Machine;
  products: Product[];
  onUpdate: (updated: Machine) => void;
  onStockChange: (productId: string, delta: number) => void;
  readonly?: boolean;
}

interface SlotPickerProps {
  slotIndex: number;
  products: Product[];
  onSelect: (productId: string | null) => void;
  onClose: () => void;
  colorScheme: 'light' | 'dark';
}

function SlotPicker({ slotIndex, products, onSelect, onClose, colorScheme }: SlotPickerProps) {
  const colors = Colors[colorScheme];

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Slot {slotIndex + 1}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.sheetClose, { color: colors.subtext }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.productRow, { borderColor: colors.border }]}
          onPress={() => onSelect(null)}>
          <Text style={styles.productEmoji}>–</Text>
          <Text style={[styles.productName, { color: colors.subtext }]}>Empty</Text>
        </TouchableOpacity>

        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.productRow, { borderColor: colors.border }]}
              onPress={() => onSelect(item.id)}>
              <Text style={styles.productEmoji}>{item.emoji ?? '📦'}</Text>
              <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              No products in catalog yet.{'\n'}Add products in the Products tab.
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

interface MergedItem {
  productId: string | null;
  product: Product | null;
  slotCount: number;
  slotIndices: number[];
}

function buildMergedList(slots: (string | null)[], products: Product[]): MergedItem[] {
  const map = new Map<string, MergedItem>();

  slots.forEach((id, i) => {
    const key = id ?? '__empty__';
    if (map.has(key)) {
      const item = map.get(key)!;
      item.slotCount += 1;
      item.slotIndices.push(i);
    } else {
      map.set(key, {
        productId: id,
        product: id ? (products.find((p) => p.id === id) ?? null) : null,
        slotCount: 1,
        slotIndices: [i],
      });
    }
  });

  return [...map.values()].sort((a, b) => {
    if (a.productId === null) return 1;
    if (b.productId === null) return -1;
    return (a.product?.name ?? '').localeCompare(b.product?.name ?? '');
  });
}

interface ListViewProps {
  machine: Machine;
  products: Product[];
  onSlotPress: (index: number) => void;
  onStockChange: (productId: string, delta: number) => void;
  readonly?: boolean;
  colors: (typeof Colors)['light'];
}

function ListView({ machine, products, onSlotPress, onStockChange, readonly, colors }: ListViewProps) {
  const merged = useMemo(
    () => buildMergedList(machine.slots, products),
    [machine.slots, products]
  );

  const filledCount = machine.slots.filter(Boolean).length;

  return (
    <View style={styles.listContainer}>
      {filledCount === 0 && (
        <Text style={[styles.listEmpty, { color: colors.subtext }]}>No items loaded</Text>
      )}

      {merged.map((item) => {
        if (item.productId === null) {
          // Show empty row only if ALL slots are empty
          if (filledCount > 0) return null;
          return (
            <TouchableOpacity
              key="__empty__"
              disabled={readonly}
              onPress={() => !readonly && onSlotPress(item.slotIndices[0])}
              style={[styles.listRow, { borderColor: colors.border }]}
              activeOpacity={readonly ? 1 : 0.6}>
              <Text style={[styles.listEmoji, { opacity: 0.35 }]}>＋</Text>
              <Text style={[styles.listName, { color: colors.subtext }]}>Empty</Text>
              <Text style={[styles.listCount, { color: colors.subtext }]}>×{item.slotCount}</Text>
            </TouchableOpacity>
          );
        }

        const stockCount = machine.stockCounts[item.productId] ?? 0;

        return (
          <TouchableOpacity
            key={item.productId}
            disabled={readonly}
            onPress={() => !readonly && onSlotPress(item.slotIndices[0])}
            style={[
              styles.listRow,
              { borderColor: colors.border, backgroundColor: colors.tint + '0C' },
            ]}
            activeOpacity={readonly ? 1 : 0.6}>
            <Text style={styles.listEmoji}>{item.product?.emoji ?? '📦'}</Text>

            <View style={styles.listInfo}>
              <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                {item.product?.name ?? 'Unknown'}
              </Text>
              {item.slotCount > 1 && (
                <Text style={[styles.listSlotCount, { color: colors.subtext }]}>
                  ×{item.slotCount} in machine
                </Text>
              )}
            </View>

            {/* Stock +/- controls */}
            <View style={styles.stockControls}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onStockChange(item.productId!, -1); }}
                hitSlop={6}
                style={[styles.stockBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.stockBtnText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stockValue, { color: stockCount > 0 ? colors.text : colors.subtext }]}>
                {stockCount}
              </Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onStockChange(item.productId!, +1); }}
                hitSlop={6}
                style={[styles.stockBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.stockBtnText, { color: colors.text }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Empty slot footer when mixed */}
      {filledCount > 0 && (() => {
        const emptyItem = merged.find((m) => m.productId === null);
        if (!emptyItem) return null;
        return (
          <View style={[styles.listRow, styles.listRowEmpty, { borderColor: colors.border }]}>
            <Text style={[styles.listEmoji, { opacity: 0.3 }]}>–</Text>
            <Text style={[styles.listName, { color: colors.subtext }]}>Empty slots</Text>
            <Text style={[styles.listCount, { color: colors.subtext }]}>×{emptyItem.slotCount}</Text>
          </View>
        );
      })()}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MachineGrid({ machine, products, onUpdate, onStockChange, readonly }: MachineGridProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleSlotPress = useCallback(
    (index: number) => { if (!readonly) setActiveSlot(index); },
    [readonly]
  );

  const handleProductSelect = useCallback(
    (productId: string | null) => {
      if (activeSlot === null) return;
      const newSlots = [...machine.slots];
      newSlots[activeSlot] = productId;
      onUpdate({ ...machine, slots: newSlots });
      setActiveSlot(null);
    },
    [activeSlot, machine, onUpdate]
  );

  const getProduct = (id: string | null) =>
    id ? products.find((p) => p.id === id) ?? null : null;

  return (
    <View style={styles.container}>
      {/* Toggle bar */}
      <View style={[styles.toggleBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => setViewMode('grid')}
          style={[styles.toggleBtn, viewMode === 'grid' && { backgroundColor: colors.tint }]}>
          <Text style={[styles.toggleIcon, { color: viewMode === 'grid' ? '#fff' : colors.subtext }]}>⊞</Text>
          <Text style={[styles.toggleLabel, { color: viewMode === 'grid' ? '#fff' : colors.subtext }]}>Grid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: colors.tint }]}>
          <Text style={[styles.toggleIcon, { color: viewMode === 'list' ? '#fff' : colors.subtext }]}>≡</Text>
          <Text style={[styles.toggleLabel, { color: viewMode === 'list' ? '#fff' : colors.subtext }]}>List</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'grid' ? (
        <View style={styles.grid}>
          {Array.from({ length: 9 }).map((_, i) => {
            const product = getProduct(machine.slots[i] ?? null);
            const isEmpty = !product;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleSlotPress(i)}
                activeOpacity={readonly ? 1 : 0.7}
                style={[
                  styles.slot,
                  {
                    backgroundColor: isEmpty ? colors.card : colors.tint + '18',
                    borderColor: isEmpty ? colors.border : colors.tint + '55',
                  },
                ]}>
                <Text style={styles.slotEmoji}>{product ? (product.emoji ?? '📦') : '+'}</Text>
                <Text
                  style={[styles.slotLabel, { color: isEmpty ? colors.subtext : colors.text }]}
                  numberOfLines={1}>
                  {product ? product.name : 'Empty'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ListView
          machine={machine}
          products={products}
          onSlotPress={handleSlotPress}
          onStockChange={onStockChange}
          readonly={readonly}
          colors={colors}
        />
      )}

      {activeSlot !== null && (
        <SlotPicker
          slotIndex={activeSlot}
          products={products}
          onSelect={handleProductSelect}
          onClose={() => setActiveSlot(null)}
          colorScheme={colorScheme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  // Toggle
  toggleBar: {
    flexDirection: 'row',
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleIcon: { fontSize: 15, lineHeight: 18 },
  toggleLabel: { fontSize: 12, fontWeight: '600' },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 4,
  },
  slotEmoji: { fontSize: 22 },
  slotLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  // List
  listContainer: { gap: 2 },
  listEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  listRowEmpty: { opacity: 0.6 },
  listEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  listInfo: { flex: 1, gap: 1 },
  listName: { fontSize: 14, fontWeight: '500' },
  listSlotCount: { fontSize: 11 },
  listCount: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
  // Stock controls
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBtnText: { fontSize: 16, lineHeight: 20, fontWeight: '500' },
  stockValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'center',
  },
  // Slot Picker
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '60%',
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '600' },
  sheetClose: { fontSize: 15, fontWeight: '500' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  productName: { fontSize: 16 },
  emptyNote: {
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
});
