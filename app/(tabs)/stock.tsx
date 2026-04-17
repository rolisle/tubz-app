import AsyncStorage from "@react-native-async-storage/async-storage";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { primaryColor, useSettings } from "@/context/settings-context";
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
  { value: "full", label: "Full box", color: "#22c55e" },
  { value: "half", label: "½ box", color: "#f59e0b" },
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
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !p.category || p.category === category)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, category, search]);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
              {
                backgroundColor: colors.background,
                borderColor: searchFocused ? accent : colors.border,
              },
            ]}
          >
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
              selectionColor={`${accent}44`}
              cursorColor={accent}
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
      </KeyboardAvoidingView>
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
        <View
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
        <View
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

/* ─── Simple row ─────────────────────────────────────────────── */

interface SimpleRowProps {
  item: StockItem;
  product: Product | undefined;
  colors: (typeof Colors)["light"];
}

const SimpleRow = memo(function SimpleRow({
  item,
  product,
  colors,
}: SimpleRowProps) {
  const fullCount = item.fullCount ?? 0;
  const halfCount = item.halfCount ?? 0;
  const isEmpty = item.level === "empty" && fullCount === 0 && halfCount === 0;

  return (
    <View style={[styles.simpleRow, { borderBottomColor: colors.border }]}>
      <ProductThumb product={product} size={38} />
      <Text
        style={[styles.simpleRowName, { color: colors.text }]}
        numberOfLines={1}
      >
        {product?.name ?? item.productId}
      </Text>
      <View style={styles.simpleRowCounts}>
        {fullCount > 0 && (
          <View
            style={[
              styles.simpleChip,
              { backgroundColor: "#22c55e18", borderColor: "#22c55e55" },
            ]}
          >
            <Text style={[styles.simpleChipNum, { color: "#22c55e" }]}>
              {fullCount}
            </Text>
            <Text style={[styles.simpleChipLabel, { color: "#22c55e" }]}>
              Full
            </Text>
          </View>
        )}
        {halfCount > 0 && (
          <View
            style={[
              styles.simpleChip,
              { backgroundColor: "#f59e0b18", borderColor: "#f59e0b55" },
            ]}
          >
            <Text style={[styles.simpleChipNum, { color: "#f59e0b" }]}>
              {halfCount}
            </Text>
            <Text style={[styles.simpleChipLabel, { color: "#f59e0b" }]}>
              ½
            </Text>
          </View>
        )}
        {isEmpty && (
          <View
            style={[
              styles.simpleChip,
              { backgroundColor: "#ef444418", borderColor: "#ef444455" },
            ]}
          >
            <Text style={[styles.simpleChipLabel, { color: "#ef4444", opacity: 1 }]}>
              Empty
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

/* ─── Main screen ────────────────────────────────────────────── */

type StockViewMode = "simple" | "detail";
type SortOrder = "az" | "za" | "low" | "high";

const SORT_OPTIONS: { value: SortOrder; label: string; icon: string }[] = [
  { value: "az", label: "A → Z", icon: "🔤" },
  { value: "za", label: "Z → A", icon: "🔤" },
  { value: "low", label: "Lowest stock", icon: "📉" },
  { value: "high", label: "Highest stock", icon: "📈" },
];

/** Lower = emptier, higher = more stock */
function stockScore(item: StockItem) {
  return (item.fullCount ?? 0) * 2 + (item.halfCount ?? 0);
}

export default function StockScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);

  const [viewMode, setViewMode] = useState<StockViewMode>("simple");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [showSort, setShowSort] = useState(false);
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

  const totalItems = Object.values(stock).reduce((s, arr) => s + arr.length, 0);

  const sections = useMemo(() => {
    const sortItems = (items: StockItem[]) => {
      const sorted = [...items];
      switch (sortOrder) {
        case "az":
          return sorted.sort((a, b) => {
            const na =
              state.products.find((p) => p.id === a.productId)?.name ??
              a.productId;
            const nb =
              state.products.find((p) => p.id === b.productId)?.name ??
              b.productId;
            return na.localeCompare(nb);
          });
        case "za":
          return sorted.sort((a, b) => {
            const na =
              state.products.find((p) => p.id === a.productId)?.name ??
              a.productId;
            const nb =
              state.products.find((p) => p.id === b.productId)?.name ??
              b.productId;
            return nb.localeCompare(na);
          });
        case "low":
          return sorted.sort((a, b) => stockScore(a) - stockScore(b));
        case "high":
          return sorted.sort((a, b) => stockScore(b) - stockScore(a));
      }
    };
    return SECTIONS.map((sec) => ({ ...sec, data: sortItems(stock[sec.key]) }));
  }, [stock, sortOrder, state.products]);

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

  const simpleRenderItem = useCallback(
    ({
      item,
      section,
    }: {
      item: StockItem;
      section: (typeof sections)[number];
    }) => {
      void section;
      const product = state.products.find((p) => p.id === item.productId);
      return <SimpleRow item={item} product={product} colors={colors} />;
    },
    [state.products, colors],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Stock</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {totalItems === 0
              ? "No products tracked yet"
              : `${totalItems} product${totalItems !== 1 ? "s" : ""} tracked`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSort((v) => !v)}
          hitSlop={8}
          style={[
            styles.addBtn,
            { borderColor: accent, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.addBtnText, { color: accent }]}>
            ↕ Sort
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort popover */}
      {showSort && (
        <View
          style={[
            styles.sortPopover,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {SORT_OPTIONS.map((opt) => {
            const active = sortOrder === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setSortOrder(opt.value);
                  setShowSort(false);
                }}
                style={[
                  styles.sortOption,
                  { borderBottomColor: colors.border },
                  active && { backgroundColor: accent + "18" },
                ]}
              >
                <Text style={styles.sortOptionIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.sortOptionLabel,
                    { color: active ? accent : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <Text style={[styles.sortOptionCheck, { color: accent }]}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* View toggle */}
      <View
        style={[
          styles.toggleBar,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setViewMode("simple")}
          activeOpacity={0.8}
        >
          {viewMode === "simple" && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 8, backgroundColor: accent },
              ]}
            />
          )}
          <Text
            style={[
              styles.toggleLabel,
              { color: viewMode === "simple" ? "#fff" : colors.subtext },
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setViewMode("detail")}
          activeOpacity={0.8}
        >
          {viewMode === "detail" && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 8, backgroundColor: accent },
              ]}
            />
          )}
          <Text
            style={[
              styles.toggleLabel,
              { color: viewMode === "detail" ? "#fff" : colors.subtext },
            ]}
          >
            Edit Stock
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "simple" ? (
        /* ── Overview ── */
        <>
          <View
            style={[
              styles.legend,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            {LEVELS.map((lvl) => (
              <View key={lvl.value} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: lvl.color }]}
                />
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
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {section.emoji} {section.label}
                </Text>
              </View>
            )}
            renderItem={simpleRenderItem}
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
        </>
      ) : (
        /* ── Detail ── */
        <>
          <View
            style={[
              styles.legend,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            {LEVELS.map((lvl) => (
              <View key={lvl.value} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: lvl.color }]}
                />
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
                <TouchableOpacity
                  onPress={() => setPicker(section.key)}
                  style={[
                    styles.addBtn,
                    { borderColor: accent, backgroundColor: colors.card },
                  ]}
                >
                  <Text style={[styles.addBtnText, { color: accent }]}>
                    + Add
                  </Text>
                </TouchableOpacity>
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
        </>
      )}

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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  sortPopover: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortOptionIcon: { fontSize: 15 },
  sortOptionLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  sortOptionCheck: { fontSize: 14, fontWeight: "700" },
  // View toggle
  toggleBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    overflow: "hidden",
  },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  // Simple row
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
  levelBtnText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
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
    maxHeight: "80%",
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
