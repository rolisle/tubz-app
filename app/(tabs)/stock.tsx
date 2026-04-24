import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SimpleRow } from "@/components/simple-row";
import { StockRow, StockPickerRow } from "@/components/stock-row";
import { ProductPickerModal } from "@/components/ui/product-picker-modal";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  EMPTY_STATE,
  LEVELS,
  SECTIONS,
  STORAGE_KEY,
  type StockCategory,
  type StockItem,
  type StockLevel,
  type StockState,
} from "@/types/stock";

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
  const [picker, setPicker] = useState<StockCategory | null>(null);

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
    (category: StockCategory, productId: string) => {
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

  const changeFullCount = useCallback(
    (category: StockCategory, productId: string, delta: number) => {
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
    (category: StockCategory, productId: string, delta: number) => {
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
    (category: StockCategory, productId: string) => {
      setStock((prev) => ({
        ...prev,
        [category]: prev[category].filter((i) => i.productId !== productId),
      }));
    },
    [],
  );

  const totalItems = Object.values(stock).reduce((s, arr) => s + arr.length, 0);

  const productMap = useMemo(() => {
    const map = new Map<string, (typeof state.products)[number]>();
    state.products.forEach((p) => map.set(p.id, p));
    return map;
  }, [state.products]);

  const sections = useMemo(() => {
    const nameFor = (id: string) => productMap.get(id)?.name ?? id;
    const sortItems = (items: StockItem[]) => {
      const sorted = [...items];
      switch (sortOrder) {
        case "az":
          return sorted.sort((a, b) =>
            nameFor(a.productId).localeCompare(nameFor(b.productId)),
          );
        case "za":
          return sorted.sort((a, b) =>
            nameFor(b.productId).localeCompare(nameFor(a.productId)),
          );
        case "low":
          return sorted.sort((a, b) => stockScore(a) - stockScore(b));
        case "high":
          return sorted.sort((a, b) => stockScore(b) - stockScore(a));
      }
    };
    return SECTIONS.map((sec) => ({ ...sec, data: sortItems(stock[sec.key]) }));
  }, [stock, sortOrder, productMap]);

  const renderItem = useCallback(
    ({
      item,
      section,
    }: {
      item: StockItem;
      section: (typeof sections)[number];
    }) => {
      const product = productMap.get(item.productId);
      return (
        <StockRow
          item={item}
          product={product}
          category={section.key}
          colors={colors}
          onFullCountChange={changeFullCount}
          onHalfCountChange={changeHalfCount}
          onRemove={removeItem}
        />
      );
    },
    [productMap, colors, changeFullCount, changeHalfCount, removeItem],
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
      const product = productMap.get(item.productId);
      return <SimpleRow item={item} product={product} colors={colors} />;
    },
    [productMap, colors],
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
        <ProductPickerModal
          category={picker}
          products={state.products}
          onClose={() => setPicker(null)}
          renderRow={(product, _accent, rowColors) => {
            const added = stock[picker].some((i) => i.productId === product.id);
            return (
              <StockPickerRow
                key={product.id}
                product={product}
                added={added}
                onPress={() => { addItem(picker, product.id); setPicker(null); }}
                colors={rowColors}
              />
            );
          }}
          emptyMessage="No products in this category."
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
  addBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: { fontSize: 13, fontWeight: "600" },
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
});
