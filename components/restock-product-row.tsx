import { useRef } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { PRODUCT_IMAGES } from "@/constants/product-images";
import type { MachineType, Product } from "@/types";

const DOUBLE_TAP_MS = 300;

export interface RestockProductRowProps {
  productId: string;
  product: Pick<Product, "name" | "emoji" | "localImageUri" | "id"> | undefined;
  qty: number;
  max: number;
  machineType: MachineType;
  colors: { text: string; subtext: string; border: string; background: string };
  onDecrement: () => void;
  onIncrement: () => void;
  /** When set, shows a completion checkbox like the main Restock tab */
  done?: boolean;
  onToggleDone?: () => void;
  accent?: string;
  /** When not done: double-tap product (image + name) snaps qty to max, or back to 0 if already at max */
  onDoubleTapSnap?: () => void;
  /** Swap this line for another catalog product (updates machine slots) */
  onChangeProduct?: () => void;
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
  done = false,
  onToggleDone,
  accent,
  onDoubleTapSnap,
  onChangeProduct,
}: RestockProductRowProps) {
  const lastTapRef = useRef(0);

  const pct = max > 0 ? qty / max : 0;
  const barColor =
    pct === 0
      ? colors.border
      : pct < 0.4
        ? "#ef4444"
        : pct < 0.75
          ? "#f59e0b"
          : "#22c55e";
  const imgSrc = product?.localImageUri
    ? { uri: product.localImageUri }
    : product
      ? PRODUCT_IMAGES[product.id ?? productId]
      : undefined;

  const showDone = Boolean(onToggleDone && accent);
  const canSnap = Boolean(onDoubleTapSnap && !done);

  const handleProductAreaPress = () => {
    if (!canSnap || !onDoubleTapSnap) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      onDoubleTapSnap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <View
      style={[
        styles.row,
        {
          borderTopColor: colors.border,
          opacity: done ? 0.4 : 1,
        },
      ]}
    >
      {showDone ? (
        <TouchableOpacity
          onPress={onToggleDone}
          hitSlop={8}
          style={[
            styles.doneBtn,
            {
              borderColor: done ? accent! : colors.border,
              backgroundColor: done ? accent! : "transparent",
            },
          ]}
        >
          {done && <Text style={styles.doneTick}>✓</Text>}
        </TouchableOpacity>
      ) : null}

      <Pressable
        style={styles.tapZone}
        onPress={handleProductAreaPress}
        disabled={!canSnap}
      >
        {imgSrc ? (
          <Image source={imgSrc} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Text style={styles.thumbEmoji}>
            {product?.emoji ?? (machineType === "sweet" ? "🍬" : "🪀")}
          </Text>
        )}
        <View style={styles.info}>
          <Text
            style={[
              styles.name,
              {
                color: colors.text,
                textDecorationLine: done ? "line-through" : "none",
              },
            ]}
            numberOfLines={1}
          >
            {product?.name ?? productId}
          </Text>
          {!done && (
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct * 100}%`, backgroundColor: barColor },
                ]}
              />
            </View>
          )}
          {!done && onChangeProduct ? (
            <TouchableOpacity onPress={onChangeProduct} hitSlop={6}>
              <Text style={[styles.changeProductLink, { color: accent ?? "#0ea5e9" }]}>
                Change product
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Pressable>

      {!done && (
        <View style={styles.counter}>
          <TouchableOpacity
            onPress={onDecrement}
            hitSlop={6}
            disabled={qty === 0}
            style={[
              styles.counterBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: qty === 0 ? 0.3 : 1,
              },
            ]}
          >
            <Text style={[styles.counterBtnText, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.counterVal, { color: colors.text }]}>
            {qty}
            <Text style={[styles.counterMax, { color: colors.subtext }]}>
              /{max}
            </Text>
          </Text>
          <TouchableOpacity
            onPress={onIncrement}
            hitSlop={6}
            disabled={qty >= max}
            style={[
              styles.counterBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: qty >= max ? 0.3 : 1,
              },
            ]}
          >
            <Text style={[styles.counterBtnText, { color: colors.text }]}>＋</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
  tapZone: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  thumbEmoji: {
    fontSize: 30,
    width: 44,
    textAlign: "center",
    lineHeight: 44,
    includeFontPadding: false,
  },
  info: { flex: 1, gap: 4, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "500" },
  changeProductLink: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textDecorationLine: "underline",
  },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2 },
  counter: { flexDirection: "row", alignItems: "center", gap: 6 },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
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
});
