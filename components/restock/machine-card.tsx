import { memo, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { GradView } from "@/components/ui/grad-view";
import { ProductPickerModal } from "@/components/ui/product-picker-modal";
import { ProductThumb } from "@/components/ui/product-thumb";
import { MACHINE_LABELS } from "@/constants/machine-labels";
import { Colors } from "@/constants/theme";
import { type AppColor, primaryColor } from "@/context/settings-context";
import type { MachineType, Product, ProductCategory } from "@/types";
import { uid } from "@/utils/id";

export const MAX_QTY: Record<MachineType, number> = { sweet: 9, toy: 12 };

export interface RestockItem {
  id: string;
  productId: string;
  qty: number;
  done?: boolean;
}

export interface RestockMachine {
  id: string;
  type: MachineType;
  items: RestockItem[];
}

export interface MachineCardProps {
  machine: RestockMachine;
  products: Product[];
  colors: (typeof Colors)["light"];
  accent: string;
  machineColor: AppColor;
  onChange: (updated: RestockMachine) => void;
  onRemove: () => void;
}

export const MachineCard = memo(function MachineCard({
  machine,
  products,
  colors,
  accent,
  machineColor,
  onChange,
  onRemove,
}: MachineCardProps) {
  const machineColorPrimary = primaryColor(machineColor);
  const [showPicker, setShowPicker] = useState(false);
  const max = MAX_QTY[machine.type];

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const setQty = useCallback(
    (itemId: string, delta: number) => {
      const existing = machine.items.find((i) => i.id === itemId);
      if (!existing) return;
      const newQty = Math.max(0, Math.min(max, existing.qty + delta));
      const newItems =
        newQty === 0
          ? machine.items.filter((i) => i.id !== itemId)
          : machine.items.map((i) =>
              i.id === itemId ? { ...i, qty: newQty } : i,
            );
      onChange({ ...machine, items: newItems });
    },
    [machine, max, onChange],
  );

  const handleAddProduct = useCallback(
    (productId: string) => {
      onChange({
        ...machine,
        items: [
          ...machine.items,
          { id: uid(), productId, qty: 0, done: false },
        ],
      });
    },
    [machine, onChange],
  );

  const toggleDone = useCallback(
    (itemId: string) => {
      onChange({
        ...machine,
        items: machine.items.map((i) =>
          i.id === itemId ? { ...i, done: !i.done } : i,
        ),
      });
    },
    [machine, onChange],
  );

  const totalQty = machine.items.reduce((s, i) => s + i.qty, 0);

  return (
    <View
      style={[
        styles.machineCard,
        {
          backgroundColor: colors.card,
          borderColor: machineColorPrimary + "55",
          borderLeftColor: machineColorPrimary,
          borderLeftWidth: 3,
        },
      ]}
    >
      <View style={[styles.machineHeader, { overflow: "hidden" }]}>
        <GradView
          colors={machineColor}
          style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
        />
        <View style={styles.machineTitleRow}>
          <Text style={[styles.machineTitle, { color: machineColorPrimary }]}>
            {MACHINE_LABELS[machine.type]}
          </Text>
          {totalQty > 0 && (
            <View
              style={[
                styles.totalBadge,
                { backgroundColor: machineColorPrimary + "22" },
              ]}
            >
              <Text
                style={[styles.totalBadgeText, { color: machineColorPrimary }]}
              >
                {totalQty} total
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Text style={{ color: "#ef4444", fontSize: 13 }}>Remove</Text>
        </TouchableOpacity>
      </View>

      {machine.items.length === 0 ? (
        <Text style={[styles.emptyMachine, { color: colors.subtext }]}>
          No products added yet.
        </Text>
      ) : (
        machine.items.map((item) => {
          const product = productMap.get(item.productId);
          const pct = item.qty / max;
          const barColor =
            pct < 0.4 ? "#ef4444" : pct < 0.75 ? "#f59e0b" : "#22c55e";
          return (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                {
                  borderTopColor: colors.border,
                  opacity: item.done ? 0.4 : 1,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => toggleDone(item.id)}
                hitSlop={8}
                style={[
                  styles.doneBtn,
                  {
                    borderColor: item.done ? accent : colors.border,
                    backgroundColor: item.done ? accent : "transparent",
                  },
                ]}
              >
                {item.done && <Text style={styles.doneTick}>✓</Text>}
              </TouchableOpacity>

              <ProductThumb product={product} size={50} />
              <View style={styles.itemInfo}>
                <Text
                  style={[
                    styles.itemName,
                    {
                      color: colors.text,
                      textDecorationLine: item.done ? "line-through" : "none",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {product?.name ?? item.productId}
                </Text>
                {!item.done && (
                  <View
                    style={[styles.barTrack, { backgroundColor: colors.border }]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct * 100}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                )}
              </View>
              {!item.done && (
                <View style={styles.counter}>
                  <TouchableOpacity
                    onPress={() => setQty(item.id, -1)}
                    disabled={item.qty === 0}
                    hitSlop={6}
                    style={[
                      styles.counterBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: item.qty === 0 ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>
                      −
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.counterVal, { color: colors.text }]}>
                    {item.qty}
                    <Text style={[styles.counterMax, { color: colors.subtext }]}>
                      /{max}
                    </Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQty(item.id, +1)}
                    disabled={item.qty >= max}
                    hitSlop={6}
                    style={[
                      styles.counterBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: item.qty >= max ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.counterBtnText, { color: colors.text }]}>
                      ＋
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      <TouchableOpacity
        style={[styles.addProductBtn, { borderColor: accent }]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.addProductText, { color: accent }]}>
          + Add product
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <ProductPickerModal
          category={machine.type as ProductCategory}
          products={products}
          onClose={() => setShowPicker(false)}
          renderRow={(product, _accent, rowColors) => (
            <TouchableOpacity
              style={[
                styles.pickerRow,
                { borderBottomColor: rowColors.border },
              ]}
              onPress={() => {
                handleAddProduct(product.id);
                setShowPicker(false);
              }}
            >
              <ProductThumb product={product} size={36} />
              <Text style={[styles.pickerRowName, { color: rowColors.text }]}>
                {product.name}
              </Text>
            </TouchableOpacity>
          )}
          emptyMessage="No products match this machine type."
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  machineCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  machineTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  machineTitle: { fontSize: 15, fontWeight: "700" },
  totalBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  totalBadgeText: { fontSize: 11, fontWeight: "700" },
  emptyMachine: { fontSize: 13, paddingHorizontal: 14, paddingBottom: 10 },
  doneBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  doneTick: {
    fontSize: 12,
    lineHeight: 12,
    includeFontPadding: false,
    color: "#fff",
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: { flex: 1, gap: 5 },
  itemName: { fontSize: 13, fontWeight: "500" },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  counter: { flexDirection: "row", alignItems: "center", gap: 6 },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: 16,
    lineHeight: 16,
    includeFontPadding: false,
    fontWeight: "500",
  },
  counterVal: { fontSize: 15, fontWeight: "700", minWidth: 32, textAlign: "center" },
  counterMax: { fontSize: 11, fontWeight: "400" },
  addProductBtn: {
    margin: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  addProductText: { fontSize: 13, fontWeight: "600" },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowName: { flex: 1, fontSize: 14, fontWeight: "500" },
});
