import { memo, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ProductThumb } from "@/components/ui/product-thumb";
import { Colors } from "@/constants/theme";
import type { Product, ProductCategory } from "@/types";
import type { StockItem, StockLevel } from "@/types/stock";

/* ─── StockPickerRow ─────────────────────────────────────────── */

export const StockPickerRow = memo(function StockPickerRow({
  product,
  added,
  onPress,
  colors,
}: {
  product: Product;
  added: boolean;
  onPress: () => void;
  colors: (typeof Colors)["light"];
}) {
  return (
    <TouchableOpacity
      style={[styles.pickerRow, { borderBottomColor: colors.border, opacity: added ? 0.4 : 1 }]}
      disabled={added}
      onPress={onPress}
    >
      <ProductThumb product={product} size={40} />
      <Text style={[styles.pickerName, { color: colors.text }]}>{product.name}</Text>
      {added && (
        <Text style={[{ fontSize: 12 }, { color: colors.subtext }]}>Added</Text>
      )}
    </TouchableOpacity>
  );
});

/* ─── StockRow ───────────────────────────────────────────────── */

export interface StockRowProps {
  item: StockItem;
  product: Product | undefined;
  category: ProductCategory;
  colors: (typeof Colors)["light"];
  onLevelChange: (category: ProductCategory, productId: string, level: StockLevel) => void;
  onFullCountChange: (category: ProductCategory, productId: string, delta: number) => void;
  onHalfCountChange: (category: ProductCategory, productId: string, delta: number) => void;
  onRemove: (category: ProductCategory, productId: string) => void;
}

export const StockRow = memo(function StockRow({
  item,
  product,
  category,
  colors,
  onLevelChange: _onLevelChange,
  onFullCountChange,
  onHalfCountChange,
  onRemove,
}: StockRowProps) {
  const fullCount = item.fullCount ?? 0;
  const halfCount = item.halfCount ?? 0;

  const handleFullMinus = useCallback(
    () => onFullCountChange(category, item.productId, -1),
    [category, item.productId, onFullCountChange],
  );
  const handleFullPlus = useCallback(
    () => onFullCountChange(category, item.productId, +1),
    [category, item.productId, onFullCountChange],
  );
  const handleHalfMinus = useCallback(
    () => onHalfCountChange(category, item.productId, -1),
    [category, item.productId, onHalfCountChange],
  );
  const handleHalfPlus = useCallback(
    () => onHalfCountChange(category, item.productId, +1),
    [category, item.productId, onHalfCountChange],
  );
  const handleRemove = useCallback(
    () => onRemove(category, item.productId),
    [category, item.productId, onRemove],
  );

  return (
    <View style={[styles.itemRow, { borderBottomColor: colors.border }]}>
      {/* Top line: thumbnail + name + remove */}
      <View style={styles.itemTop}>
        <ProductThumb product={product} size={50} />
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
          {product?.name ?? item.productId}
        </Text>
        <TouchableOpacity onPress={handleRemove} hitSlop={8}>
          <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "500" }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom line: status bar full-width */}
      <View
        style={[
          styles.levelBar,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        {/* Full — coloured whenever fullCount > 0 */}
        <View style={[styles.levelBtn, fullCount > 0 && { backgroundColor: "#22c55e" }]}>
          <Text style={[styles.levelBtnText, { color: fullCount > 0 ? "#fff" : colors.subtext }]}>
            Full
          </Text>
        </View>
        <View style={[styles.inlineCounter, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleFullMinus}
            disabled={fullCount <= 0}
            hitSlop={6}
            style={{ opacity: fullCount <= 0 ? 0.3 : 1 }}
          >
            <Text style={[styles.counterBtn, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.counterVal, { color: fullCount > 0 ? "#22c55e" : colors.text }]}>
            {fullCount}
          </Text>
          <TouchableOpacity onPress={handleFullPlus} hitSlop={6}>
            <Text style={[styles.counterBtn, { color: colors.text }]}>＋</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.levelDivider, { backgroundColor: colors.border }]} />

        {/* Half — coloured whenever halfCount > 0 */}
        <View style={[styles.levelBtn, halfCount > 0 && { backgroundColor: "#f59e0b" }]}>
          <Text style={[styles.levelBtnText, { color: halfCount > 0 ? "#fff" : colors.subtext }]}>
            ½
          </Text>
        </View>
        <View style={[styles.inlineCounter, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleHalfMinus}
            disabled={halfCount <= 0}
            hitSlop={6}
            style={{ opacity: halfCount <= 0 ? 0.3 : 1 }}
          >
            <Text style={[styles.counterBtn, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.counterVal, { color: halfCount > 0 ? "#f59e0b" : colors.text }]}>
            {halfCount}
          </Text>
          <TouchableOpacity onPress={handleHalfPlus} hitSlop={6}>
            <Text style={[styles.counterBtn, { color: colors.text }]}>＋</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.levelDivider, { backgroundColor: colors.border }]} />

        {/* Empty — coloured when both counts are 0 */}
        {(() => {
          const hasStock = fullCount > 0 || halfCount > 0;
          return (
            <View
              style={[
                styles.levelBtn,
                item.level === "empty" && { backgroundColor: "#ef4444" },
                hasStock && { opacity: 0.25 },
              ]}
            >
              <Text
                style={[
                  styles.levelBtnText,
                  { color: item.level === "empty" ? "#fff" : colors.subtext },
                ]}
              >
                Empty
              </Text>
            </View>
          );
        })()}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerName: { flex: 1, fontSize: 14, fontWeight: "500" },
  itemRow: {
    flexDirection: "column",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemName: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
  levelBar: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  levelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBtnText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  levelDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  inlineCounter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  counterBtn: {
    fontSize: 16,
    lineHeight: 16,
    includeFontPadding: false,
    fontWeight: "600",
  },
  counterVal: {
    fontSize: 16,
    fontWeight: "800",
    minWidth: 16,
    textAlign: "center",
  },
});
