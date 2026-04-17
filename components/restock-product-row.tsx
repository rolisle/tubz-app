import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { PRODUCT_IMAGES } from "@/constants/product-images";
import type { MachineType, Product } from "@/types";

export interface RestockProductRowProps {
  productId: string;
  product: Pick<Product, "name" | "emoji" | "localImageUri" | "id"> | undefined;
  qty: number;
  max: number;
  machineType: MachineType;
  colors: { text: string; subtext: string; border: string; background: string };
  onDecrement: () => void;
  onIncrement: () => void;
}

export function RestockProductRow({
  productId,
  product,
  qty,
  max,
  machineType,
  colors,
  onDecrement,
  onIncrement,
}: RestockProductRowProps) {
  const pct = qty / max;
  const barColor =
    pct === 0 ? colors.border :
    pct < 0.4 ? "#ef4444" :
    pct < 0.75 ? "#f59e0b" : "#22c55e";
  const imgSrc = product?.localImageUri
    ? { uri: product.localImageUri }
    : product ? PRODUCT_IMAGES[product.id ?? productId] : undefined;

  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      {imgSrc ? (
        <Image source={imgSrc} style={styles.thumb} resizeMode="cover" />
      ) : (
        <Text style={styles.thumbEmoji}>
          {product?.emoji ?? (machineType === "sweet" ? "🍬" : "🪀")}
        </Text>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {product?.name ?? productId}
        </Text>
        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
        </View>
      </View>
      <View style={styles.counter}>
        <TouchableOpacity
          onPress={onDecrement}
          hitSlop={6}
          disabled={qty === 0}
          style={[styles.counterBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: qty === 0 ? 0.3 : 1 }]}
        >
          <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.counterVal, { color: colors.text }]}>
          {qty}<Text style={[styles.counterMax, { color: colors.subtext }]}>/{max}</Text>
        </Text>
        <TouchableOpacity
          onPress={onIncrement}
          hitSlop={6}
          disabled={qty >= max}
          style={[styles.counterBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: qty >= max ? 0.3 : 1 }]}
        >
          <Text style={[styles.counterBtnText, { color: colors.text }]}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  thumbEmoji: { fontSize: 30, width: 44, textAlign: "center", lineHeight: 44, includeFontPadding: false },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: "500" },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  counter: { flexDirection: "row", alignItems: "center", gap: 6 },
  counterBtn: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  counterBtnText: { fontSize: 16, lineHeight: 16, includeFontPadding: false, fontWeight: "500" },
  counterVal: { fontSize: 15, fontWeight: "700", minWidth: 32, textAlign: "center" },
  counterMax: { fontSize: 11, fontWeight: "400" },
});
