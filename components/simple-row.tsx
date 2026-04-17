import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProductThumb } from "@/components/ui/product-thumb";
import { Colors } from "@/constants/theme";
import type { Product } from "@/types";
import type { StockItem } from "@/types/stock";

export interface SimpleRowProps {
  item: StockItem;
  product: Product | undefined;
  colors: (typeof Colors)["light"];
}

export const SimpleRow = memo(function SimpleRow({ item, product, colors }: SimpleRowProps) {
  const fullCount = item.fullCount ?? 0;
  const halfCount = item.halfCount ?? 0;
  const isEmpty = item.level === "empty" && fullCount === 0 && halfCount === 0;

  return (
    <View style={[styles.simpleRow, { borderBottomColor: colors.border }]}>
      <ProductThumb product={product} size={38} />
      <Text style={[styles.simpleRowName, { color: colors.text }]} numberOfLines={1}>
        {product?.name ?? item.productId}
      </Text>
      <View style={styles.simpleRowCounts}>
        {fullCount > 0 && (
          <View style={[styles.simpleChip, { backgroundColor: "#22c55e18", borderColor: "#22c55e55" }]}>
            <Text style={[styles.simpleChipNum, { color: "#22c55e" }]}>{fullCount}</Text>
            <Text style={[styles.simpleChipLabel, { color: "#22c55e" }]}>Full</Text>
          </View>
        )}
        {halfCount > 0 && (
          <View style={[styles.simpleChip, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b55" }]}>
            <Text style={[styles.simpleChipNum, { color: "#f59e0b" }]}>{halfCount}</Text>
            <Text style={[styles.simpleChipLabel, { color: "#f59e0b" }]}>½</Text>
          </View>
        )}
        {isEmpty && (
          <View style={[styles.simpleChip, { backgroundColor: "#ef444418", borderColor: "#ef444455" }]}>
            <Text style={[styles.simpleChipLabel, { color: "#ef4444", opacity: 1 }]}>Empty</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  simpleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  simpleRowName: { flex: 1, fontSize: 13, fontWeight: "500" },
  simpleRowCounts: { flexDirection: "row", gap: 6, alignItems: "center" },
  simpleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  simpleChipNum: { fontSize: 15, fontWeight: "800", lineHeight: 18 },
  simpleChipLabel: { fontSize: 10, fontWeight: "600", opacity: 0.8 },
});
