import AsyncStorage from "@react-native-async-storage/async-storage";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PRODUCT_IMAGES } from "@/constants/product-images";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Product, ProductCategory } from "@/types";

/* ─── Constants ─────────────────────────────────────────────── */

const STORAGE_KEY = "@tubz_stock_v2";

const SECTIONS: { key: ProductCategory; label: string; emoji: string }[] = [
  { key: "sweet", label: "Sweets", emoji: "🍬" },
  { key: "toy", label: "Toys", emoji: "🪀" },
];

/* ─── Stock level ────────────────────────────────────────────── */

type StockLevel = "full" | "half" | "empty";

const LEVELS: { value: StockLevel; label: string; color: string }[] = [
  { value: "full", label: "Full", color: "#22c55e" },
  { value: "half", label: "½ Box", color: "#f59e0b" },
  { value: "empty", label: "Empty", color: "#ef4444" },
];

interface StockItem {
  productId: string;
  level: StockLevel;
  fullCount: number;
  halfCount: number;
}

type StockState = Record<ProductCategory, StockItem[]>;

const EMPTY_STATE: StockState = { sweet: [], toy: [], other: [] };

/* ─── Helpers ────────────────────────────────────────────────── */

function ProductThumb({
  product,
  size,
}: {
  product: Product | undefined;
  size: number;
}) {
  const src = product?.localImageUri
    ? { uri: product.localImageUri }
    : product
      ? PRODUCT_IMAGES[product.id]
      : undefined;
  if (src) {
    return (
      <Image
        source={src}
        style={{ width: size, height: size, borderRadius: 6 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <Text
      style={{
        fontSize: size * 0.65,
        width: size,
        textAlign: "center",
        lineHeight: size,
        includeFontPadding: false,
      }}
    >
      {product?.emoji ?? "📦"}
    </Text>
  );
}

/* ─── Product picker modal ───────────────────────────────────── */

interface ProductPickerProps {
  category: ProductCategory;
  products: Product[];
  alreadyAdded: string[];
  onSelect: (productId: string) => void;
  onClose: () => void;
}

function ProductPicker({
  category,
  products,
  alreadyAdded,
  onSelect,
  onClose,
}: ProductPickerProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !p.category || p.category === category)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, category, search]);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Add product
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.sheetClose, { color: colors.subtext }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.searchIcon, { color: colors.subtext }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
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
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const added = alreadyAdded.includes(item.id);
            return (
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  {
                    borderBottomColor: colors.border,
                    opacity: added ? 0.4 : 1,
                  },
                ]}
                disabled={added}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <ProductThumb product={item} size={40} />
                <Text style={[styles.pickerName, { color: colors.text }]}>
                  {item.name}
                </Text>
                {added && (
                  <Text style={[styles.pickerAdded, { color: colors.subtext }]}>
                    Added
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.pickerEmpty, { color: colors.subtext }]}>
              {search
                ? `No results for "${search}"`
                : "No products in this category."}
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

/* ─── Stock item row ─────────────────────────────────────────── */

interface StockRowProps {
  item: StockItem;
  product: Product | undefined;
  category: ProductCategory;
  colors: (typeof Colors)["light"];
  onLevelChange: (
    category: ProductCategory,
    productId: string,
    level: StockLevel,
  ) => void;
  onFullCountChange: (
    category: ProductCategory,
    productId: string,
    delta: number,
  ) => void;
  onHalfCountChange: (
    category: ProductCategory,
    productId: string,
    delta: number,
  ) => void;
  onRemove: (category: ProductCategory, productId: string) => void;
}

const StockRow = memo(function StockRow({
  item,
  product,
  category,
  colors,
  onLevelChange,
  onFullCountChange,
  onHalfCountChange,
  onRemove,
}: StockRowProps) {
  const fullCount = item.fullCount ?? 0;
  const halfCount = item.halfCount ?? 0;

  const handleLevelFull = useCallback(
    () => onLevelChange(category, item.productId, "full"),
    [category, item.productId, onLevelChange],
  );
  const handleLevelHalf = useCallback(
    () => onLevelChange(category, item.productId, "half"),
    [category, item.productId, onLevelChange],
  );
  const handleLevelEmpty = useCallback(
    () => onLevelChange(category, item.productId, "empty"),
    [category, item.productId, onLevelChange],
  );
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
        <Text
          style={[styles.itemName, { color: colors.text }]}
          numberOfLines={2}
        >
          {product?.name ?? item.productId}
        </Text>
        <TouchableOpacity onPress={handleRemove} hitSlop={8}>
          <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "500" }}>
            ✕
          </Text>
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
        <TouchableOpacity
          onPress={handleLevelFull}
          style={[
            styles.levelBtn,
            fullCount > 0 && { backgroundColor: "#22c55e" },
          ]}
        >
          <Text
            style={[
              styles.levelBtnText,
              { color: fullCount > 0 ? "#fff" : colors.subtext },
            ]}
          >
            Full
          </Text>
        </TouchableOpacity>
        <View style={[styles.inlineCounter, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleFullMinus}
            disabled={fullCount <= 0}
            hitSlop={6}
            style={{ opacity: fullCount <= 0 ? 0.3 : 1 }}
          >
            <Text style={[styles.counterBtn, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text
            style={[
              styles.counterVal,
              { color: fullCount > 0 ? "#22c55e" : colors.text },
            ]}
          >
            {fullCount}
          </Text>
          <TouchableOpacity onPress={handleFullPlus} hitSlop={6}>
            <Text style={[styles.counterBtn, { color: colors.text }]}>＋</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.levelDivider, { backgroundColor: colors.border }]}
        />

        {/* Half — coloured whenever halfCount > 0 */}
        <TouchableOpacity
          onPress={handleLevelHalf}
          style={[
            styles.levelBtn,
            halfCount > 0 && { backgroundColor: "#f59e0b" },
          ]}
        >
          <Text
            style={[
              styles.levelBtnText,
              { color: halfCount > 0 ? "#fff" : colors.subtext },
            ]}
          >
            ½
          </Text>
        </TouchableOpacity>
        <View style={[styles.inlineCounter, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleHalfMinus}
            disabled={halfCount <= 0}
            hitSlop={6}
            style={{ opacity: halfCount <= 0 ? 0.3 : 1 }}
          >
            <Text style={[styles.counterBtn, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text
            style={[
              styles.counterVal,
              { color: halfCount > 0 ? "#f59e0b" : colors.text },
            ]}
          >
            {halfCount}
          </Text>
          <TouchableOpacity onPress={handleHalfPlus} hitSlop={6}>
            <Text style={[styles.counterBtn, { color: colors.text }]}>＋</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.levelDivider, { backgroundColor: colors.border }]}
        />

        {/* Empty — only tappable when both counts are 0 */}
        {(() => {
          const hasStock = fullCount > 0 || halfCount > 0;
          return (
            <TouchableOpacity
              onPress={handleLevelEmpty}
              disabled={hasStock}
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
            </TouchableOpacity>
          );
        })()}
      </View>
    </View>
  );
});

/* ─── Main screen ────────────────────────────────────────────── */

export default function StockScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [stock, setStock] = useState<StockState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const [picker, setPicker] = useState<ProductCategory | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<StockState>;
          setStock({ ...EMPTY_STATE, ...parsed });
        } catch {
          /* ignore */
        }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
  }, [stock, loaded]);

  const addItem = useCallback(
    (category: ProductCategory, productId: string) => {
      setStock((prev) => ({
        ...prev,
        [category]: [
          ...prev[category],
          {
            productId,
            level: "full" as StockLevel,
            fullCount: 1,
            halfCount: 0,
          },
        ],
      }));
    },
    [],
  );

  const setLevel = useCallback(
    (category: ProductCategory, productId: string, level: StockLevel) => {
      setStock((prev) => ({
        ...prev,
        [category]: prev[category].map((i) =>
          i.productId === productId ? { ...i, level } : i,
        ),
      }));
    },
    [],
  );

  const changeFullCount = useCallback(
    (category: ProductCategory, productId: string, delta: number) => {
      setStock((prev) => ({
        ...prev,
        [category]: prev[category].map((i) => {
          if (i.productId !== productId) return i;
          const newFull = Math.max(0, (i.fullCount ?? 0) + delta);
          const half = i.halfCount ?? 0;
          const level: StockLevel =
            newFull === 0 && half === 0
              ? "empty"
              : newFull > 0
                ? "full"
                : "half";
          return { ...i, fullCount: newFull, level };
        }),
      }));
    },
    [],
  );

  const changeHalfCount = useCallback(
    (category: ProductCategory, productId: string, delta: number) => {
      setStock((prev) => ({
        ...prev,
        [category]: prev[category].map((i) => {
          if (i.productId !== productId) return i;
          const newHalf = Math.max(0, (i.halfCount ?? 0) + delta);
          const full = i.fullCount ?? 0;
          const level: StockLevel =
            full === 0 && newHalf === 0 ? "empty" : full > 0 ? "full" : "half";
          return { ...i, halfCount: newHalf, level };
        }),
      }));
    },
    [],
  );

  const removeItem = useCallback(
    (category: ProductCategory, productId: string) => {
      setStock((prev) => ({
        ...prev,
        [category]: prev[category].filter((i) => i.productId !== productId),
      }));
    },
    [],
  );

  const clearSection = (category: ProductCategory, label: string) => {
    Alert.alert(
      `Clear ${label}`,
      `Remove all ${label.toLowerCase()} from stock?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => setStock((prev) => ({ ...prev, [category]: [] })),
        },
      ],
    );
  };

  const totalItems = Object.values(stock).reduce((s, arr) => s + arr.length, 0);

  const sections = useMemo(
    () => SECTIONS.map((sec) => ({ ...sec, data: stock[sec.key] })),
    [stock],
  );

  const renderItem = useCallback(
    ({
      item,
      section,
    }: {
      item: StockItem;
      section: (typeof sections)[number];
    }) => {
      const product = state.products.find((p) => p.id === item.productId);
      return (
        <StockRow
          item={item}
          product={product}
          category={section.key}
          colors={colors}
          onLevelChange={setLevel}
          onFullCountChange={changeFullCount}
          onHalfCountChange={changeHalfCount}
          onRemove={removeItem}
        />
      );
    },
    [
      state.products,
      colors,
      setLevel,
      changeFullCount,
      changeHalfCount,
      removeItem,
    ],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Stock</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {totalItems === 0
              ? "No products tracked yet"
              : `${totalItems} product${totalItems !== 1 ? "s" : ""} tracked`}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View
        style={[
          styles.legend,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        {LEVELS.map((lvl) => (
          <View key={lvl.value} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: lvl.color }]} />
            <Text style={[styles.legendLabel, { color: colors.subtext }]}>
              {lvl.label}
            </Text>
          </View>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.productId}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.emoji} {section.label}
            </Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity
                onPress={() => setPicker(section.key)}
                style={[
                  styles.addBtn,
                  { borderColor: colors.tint, backgroundColor: colors.card },
                ]}
              >
                <Text style={[styles.addBtnText, { color: colors.tint }]}>
                  + Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        renderItem={renderItem}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <TouchableOpacity
              onPress={() => setPicker(section.key)}
              style={[styles.emptySection, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.emptySectionText, { color: colors.subtext }]}
              >
                Tap + Add to track {section.label.toLowerCase()} stock
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {picker && (
        <ProductPicker
          category={picker}
          products={state.products}
          alreadyAdded={stock[picker].map((i) => i.productId)}
          onSelect={(productId) => addItem(picker, productId)}
          onClose={() => setPicker(null)}
        />
      )}
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginHorizontal: 20,
    marginBottom: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: "500" },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  addBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: { fontSize: 13, fontWeight: "600" },
  // Item row
  itemRow: {
    flexDirection: "column",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemName: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
  // Level selector (single inline bar)
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
  levelBtnText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  levelDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  // Inline box counter
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
  // Empty section
  emptySection: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 4,
  },
  emptySectionText: { fontSize: 13 },
  // Picker modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "75%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetClose: { fontSize: 15 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerName: { flex: 1, fontSize: 14, fontWeight: "500" },
  pickerAdded: { fontSize: 12 },
  pickerEmpty: { padding: 24, textAlign: "center", fontSize: 13 },
});
