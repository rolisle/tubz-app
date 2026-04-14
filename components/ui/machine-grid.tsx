import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PRODUCT_IMAGES } from '@/constants/product-images';
import { Colors } from '@/constants/theme';
import { primaryColor, useSettings } from '@/context/settings-context';
import { GradView } from '@/components/ui/grad-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Machine, Product } from '@/types';

function ProductThumb({
  product,
  size,
  fallback,
}: {
  product: Product | null | undefined;
  size: number;
  fallback?: string;
}) {
  const source = product
    ? (product.localImageUri ? { uri: product.localImageUri } : PRODUCT_IMAGES[product.id])
    : undefined;
  if (source) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size, borderRadius: 4 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <Text style={{ fontSize: size * 0.7, width: size, textAlign: 'center' }}>
      {product?.emoji ?? fallback ?? '📦'}
    </Text>
  );
}

type ViewMode = 'grid' | 'list';

interface MachineGridProps {
  machine: Machine;
  products: Product[];
  onUpdate: (updated: Machine) => void;
  readonly?: boolean;
}

interface SlotPickerProps {
  slotIndex: number;
  products: Product[];
  machineType: Machine['type'];
  onSelect: (productId: string | null) => void;
  onClose: () => void;
  colorScheme: 'light' | 'dark';
}

function SlotPicker({ slotIndex, products, machineType, onSelect, onClose, colorScheme }: SlotPickerProps) {
  const colors = Colors[colorScheme];
  const filtered = products.filter((p) => !p.category || p.category === machineType);

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
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.productRow, { borderColor: colors.border }]}
              onPress={() => onSelect(item.id)}>
              <ProductThumb product={item} size={30} />
              <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              No {machineType} products in catalog yet.{'\n'}Add them in the Products tab.
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
  onSlotCountChange: (productId: string, delta: number) => void;
  readonly?: boolean;
  colors: (typeof Colors)['light'];
  machineColor: string[];
}

function ListView({ machine, products, onSlotPress, onSlotCountChange, readonly, colors, machineColor }: ListViewProps) {
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

        const canAddMore = machine.slots.some((s) => s === null);

        return (
          <TouchableOpacity
            key={item.productId}
            disabled={readonly}
            onPress={() => !readonly && onSlotPress(item.slotIndices[0])}
            style={[
              styles.listRow,
              { borderColor: colors.border },
            ]}
            activeOpacity={readonly ? 1 : 0.6}>
            <GradView colors={machineColor} style={[StyleSheet.absoluteFill, { opacity: 0.05 }]} />
            <ProductThumb product={item.product} size={48} />

            <View style={styles.listInfo}>
              <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                {item.product?.name ?? 'Unknown'}
              </Text>
              <Text style={[styles.listSlotCount, { color: colors.subtext }]}>
                ×{item.slotCount} in machine
              </Text>
            </View>

            {/* Slot count +/- controls */}
            <View style={styles.stockControls}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onSlotCountChange(item.productId!, -1); }}
                hitSlop={6}
                style={[styles.stockBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.stockBtnText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stockValue, { color: colors.text }]}>
                {item.slotCount}
              </Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onSlotCountChange(item.productId!, +1); }}
                hitSlop={6}
                disabled={!canAddMore}
                style={[styles.stockBtn, { borderColor: colors.border, backgroundColor: colors.card, opacity: canAddMore ? 1 : 0.3 }]}>
                <Text style={[styles.stockBtnText, { color: colors.text }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Empty slot footer when mixed — tappable to fill the next empty slot */}
      {filledCount > 0 && (() => {
        const emptyItem = merged.find((m) => m.productId === null);
        if (!emptyItem) return null;
        return (
          <TouchableOpacity
            disabled={readonly}
            onPress={() => !readonly && onSlotPress(emptyItem.slotIndices[0])}
            style={[styles.listRow, styles.listRowEmpty, { borderColor: colors.border }]}
            activeOpacity={readonly ? 1 : 0.6}>
            <Text style={[styles.listEmoji, { opacity: 0.5 }]}>＋</Text>
            <Text style={[styles.listName, { color: colors.subtext }]}>Add to empty slot</Text>
            <Text style={[styles.listCount, { color: colors.subtext }]}>×{emptyItem.slotCount}</Text>
          </TouchableOpacity>
        );
      })()}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MachineGrid({ machine, products, onUpdate, readonly }: MachineGridProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const machineColors = machine.type === 'sweet' ? settings.sweetColor : settings.toyColor;
  const machineColorPrimary = primaryColor(machineColors);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const compact = (slots: (string | null)[]): (string | null)[] => {
    const filled = slots.filter(Boolean) as string[];
    return [...filled, ...Array(9 - filled.length).fill(null)];
  };

  const handleSlotPress = useCallback(
    (index: number) => { if (!readonly) setActiveSlot(index); },
    [readonly]
  );

  const handleProductSelect = useCallback(
    (productId: string | null) => {
      if (activeSlot === null) return;
      const newSlots = [...machine.slots];
      newSlots[activeSlot] = productId;
      onUpdate({ ...machine, slots: compact(newSlots) });
      setActiveSlot(null);
    },
    [activeSlot, machine, onUpdate]
  );

  const handleSlotCountChange = useCallback(
    (productId: string, delta: number) => {
      const newSlots = [...machine.slots];
      if (delta > 0) {
        const emptyIndex = newSlots.findIndex((s) => s === null);
        if (emptyIndex === -1) return;
        newSlots[emptyIndex] = productId;
      } else {
        const lastIndex = newSlots.reduce((found, id, i) => id === productId ? i : found, -1);
        if (lastIndex === -1) return;
        newSlots[lastIndex] = null;
      }
      onUpdate({ ...machine, slots: compact(newSlots) });
    },
    [machine, onUpdate]
  );

  const getProduct = (id: string | null) =>
    id ? products.find((p) => p.id === id) ?? null : null;

  return (
    <View style={styles.container}>
      {/* Toggle bar */}
      <View style={[styles.toggleBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => setViewMode('grid')}
          style={styles.toggleBtn}>
          {viewMode === 'grid' && <GradView colors={machineColors} style={StyleSheet.absoluteFill} />}
          <Text style={[styles.toggleIcon, { color: viewMode === 'grid' ? '#fff' : colors.subtext }]}>⊞</Text>
          <Text style={[styles.toggleLabel, { color: viewMode === 'grid' ? '#fff' : colors.subtext }]}>Grid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={styles.toggleBtn}>
          {viewMode === 'list' && <GradView colors={machineColors} style={StyleSheet.absoluteFill} />}
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
                    backgroundColor: isEmpty ? colors.card : 'transparent',
                    borderColor: isEmpty ? colors.border : machineColorPrimary + '55',
                  },
                ]}>
                {!isEmpty && (
                  <GradView colors={machineColors} style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} />
                )}
                {product ? (
                  (() => {
                    const src = product.localImageUri
                      ? { uri: product.localImageUri }
                      : PRODUCT_IMAGES[product.id];
                    return src
                      ? <Image source={src} style={styles.slotImage} resizeMode="contain" />
                      : <Text style={styles.slotEmoji}>{product.emoji ?? '📦'}</Text>;
                  })()
                ) : (
                  <View style={styles.slotEmpty}>
                    <Text style={[styles.slotEmoji, { color: colors.subtext }]}>+</Text>
                    <Text style={[styles.slotAddLabel, { color: colors.subtext }]}>Add more</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ListView
          machine={machine}
          products={products}
          onSlotPress={handleSlotPress}
          onSlotCountChange={handleSlotCountChange}
          readonly={readonly}
          colors={colors}
          machineColor={machineColors}
        />
      )}

      {activeSlot !== null && (
        <SlotPicker
          slotIndex={activeSlot}
          products={products}
          machineType={machine.type}
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
    overflow: 'hidden',
  },
  toggleIcon: { fontSize: 15, lineHeight: 15, includeFontPadding: false },
  toggleLabel: { fontSize: 12, fontWeight: '600' },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '30%',
    aspectRatio: 300 / 479,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotImage: { width: '100%', height: '100%' },
  slotEmpty: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmoji: { fontSize: 22, lineHeight: 22, includeFontPadding: false },
  slotAddLabel: { fontSize: 9, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  // List
  listContainer: { gap: 2 },
  listEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
    overflow: 'hidden',
  },
  listRowEmpty: { opacity: 0.6 },
  listEmoji: { fontSize: 32, lineHeight: 32, includeFontPadding: false, width: 48, textAlign: 'center' },
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
  stockBtnText: { fontSize: 16, lineHeight: 16, fontWeight: '500', includeFontPadding: false },
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
