import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SimpleRow } from "@/components/simple-row";
import { StockPickerRow, StockRow } from "@/components/stock-row";
import { ProductPickerModal } from "@/components/ui/product-picker-modal";
import { PRODUCT_IMAGES } from "@/constants/product-images";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Product } from "@/types";
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

/* ─── Top Sellers (by machine type from restock history)────────── */

const TOP_SELLERS_COLLAPSED = 5;

const MEDAL_GOLD = "#ca8a04";
const MEDAL_SILVER = "#64748b";
const MEDAL_BRONZE = "#b45309";

function medalColor(index: number): string {
  if (index === 0) return MEDAL_GOLD;
  if (index === 1) return MEDAL_SILVER;
  return MEDAL_BRONZE;
}

interface TopEntry {
  productId: string;
  total: number;
  sessionCount: number;
}

function renderTopSellerRow(
  entry: TopEntry,
  index: number,
  peak: number,
  productMap: Map<string, Product>,
  colors: (typeof Colors)["light"],
) {
  const product = productMap.get(entry.productId);
  const name = product?.name ?? "Unknown product";
  const pct = peak > 0 ? entry.total / peak : 0;
  const src = product?.localImageUri
    ? { uri: product.localImageUri }
    : product
      ? PRODUCT_IMAGES[product.id]
      : undefined;

  const isPodium = index < 3;
  const medal = isPodium ? medalColor(index) : null;
  const rowTint = isPodium ? medal + "18" : "transparent";
  const barFillColor = isPodium ? medal! : colors.subtext;
  const totalColor = isPodium ? medal! : colors.subtext;
  const nameColor = isPodium ? colors.text : colors.subtext;

  return (
    <View
      key={entry.productId}
      style={[
        topStyles.row,
        {
          borderBottomColor: colors.border,
          backgroundColor: rowTint,
          borderLeftWidth: isPodium ? 3 : 0,
          borderLeftColor: isPodium ? medal! : "transparent",
        },
      ]}
    >
      <Text
        style={[topStyles.rank, { color: isPodium ? medal! : colors.subtext }]}
      >
        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
      </Text>
      <View style={topStyles.thumb}>
        {src ? (
          <Image source={src} style={topStyles.thumbImg} resizeMode="contain" />
        ) : (
          <Text style={topStyles.thumbEmoji}>{product?.emoji ?? "📦"}</Text>
        )}
      </View>
      <View style={topStyles.info}>
        <Text style={[topStyles.name, { color: nameColor }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={[topStyles.barTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              topStyles.barFill,
              {
                width: `${pct * 100}%` as `${number}%`,
                backgroundColor: barFillColor,
                opacity: isPodium ? 1 : 0.65,
              },
            ]}
          />
        </View>
        <Text style={[topStyles.sessions, { color: colors.subtext }]}>
          {entry.sessionCount} session
          {entry.sessionCount !== 1 ? "s" : ""}
        </Text>
      </View>
      <Text style={[topStyles.total, { color: totalColor }]}>{entry.total}</Text>
    </View>
  );
}

function TopSellersByCategory({
  buckets,
  products,
  colors,
}: {
  buckets: Record<StockCategory, TopEntry[]>;
  products: Product[];
  colors: (typeof Colors)["light"];
}) {
  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const [expanded, setExpanded] = useState<Record<StockCategory, boolean>>({
    sweet: false,
    toy: false,
  });

  const anyData =
    buckets.sweet.length > 0 || buckets.toy.length > 0;

  if (!anyData) {
    return (
      <View
        style={[
          topStyles.emptyCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[topStyles.emptyText, { color: colors.subtext }]}>
          No restock history yet. Complete a restock session to see top
          products.
        </Text>
      </View>
    );
  }

  return (
    <>
      {SECTIONS.map((sec) => {
        const entries = buckets[sec.key];
        const isExpanded = expanded[sec.key];
        const visible = isExpanded
          ? entries
          : entries.slice(0, TOP_SELLERS_COLLAPSED);
        const canExpand = entries.length > TOP_SELLERS_COLLAPSED;
        const peak = entries[0]?.total ?? 1;

        return (
          <View key={sec.key}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {sec.emoji} {sec.label}
              </Text>
            </View>
            {entries.length === 0 ? (
              <View
                style={[
                  topStyles.emptyCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[topStyles.emptyText, { color: colors.subtext }]}
                >
                  No {sec.label.toLowerCase()} restocks recorded yet.
                </Text>
              </View>
            ) : (
              <View
                style={[
                  topStyles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {visible.map((entry, i) =>
                  renderTopSellerRow(entry, i, peak, productMap, colors),
                )}
                {canExpand ? (
                  <TouchableOpacity
                    style={[
                      topStyles.expandBtn,
                      { borderTopColor: colors.border },
                    ]}
                    onPress={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [sec.key]: !prev[sec.key],
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[topStyles.expandBtnText, { color: colors.subtext }]}>
                      {isExpanded
                        ? "Show top 5 only"
                        : `Show all ${entries.length} (${entries.length - TOP_SELLERS_COLLAPSED} more)`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const topStyles = StyleSheet.create({
  emptyCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: { fontSize: 15, width: 28, textAlign: "center" },
  thumb: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImg: { width: 36, height: 36 },
  thumbEmoji: { fontSize: 24 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 13, fontWeight: "600" },
  barTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 3, borderRadius: 2 },
  sessions: { fontSize: 10 },
  total: { fontSize: 16, fontWeight: "800", minWidth: 32, textAlign: "right" },
  expandBtn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  expandBtnText: { fontSize: 13, fontWeight: "600" },
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

  const addItem = useCallback((category: StockCategory, productId: string) => {
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
  }, []);

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

  const topSellersBuckets = useMemo(() => {
    type Agg = { total: number; sessionCount: number };
    const sweet = new Map<string, Agg>();
    const toy = new Map<string, Agg>();

    const toSorted = (m: Map<string, Agg>): TopEntry[] =>
      Array.from(m.entries())
        .map(([productId, { total, sessionCount }]) => ({
          productId,
          total,
          sessionCount,
        }))
        .sort((a, b) => b.total - a.total);

    for (const loc of state.locations) {
      for (const entry of loc.restockHistory ?? []) {
        const seenSweet = new Set<string>();
        const seenToy = new Set<string>();
        for (const machine of entry.machines) {
          const map = machine.machineType === "sweet" ? sweet : toy;
          const seen =
            machine.machineType === "sweet" ? seenSweet : seenToy;
          for (const p of machine.products) {
            if (p.qty <= 0) continue;
            const cur = map.get(p.productId) ?? { total: 0, sessionCount: 0 };
            cur.total += p.qty;
            if (!seen.has(p.productId)) {
              cur.sessionCount += 1;
              seen.add(p.productId);
            }
            map.set(p.productId, cur);
          }
        }
      }
    }

    return {
      sweet: toSorted(sweet),
      toy: toSorted(toy),
    } as Record<StockCategory, TopEntry[]>;
  }, [state.locations]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
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
          <Text style={[styles.addBtnText, { color: accent }]}>↕ Sort</Text>
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
          {/* Top sellers by machine type (sweet / toy) */}
          <View style={styles.overviewTopBlock}>
            <TopSellersByCategory
              buckets={topSellersBuckets}
              products={state.products}
              colors={colors}
            />
          </View>

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
                onPress={() => {
                  addItem(picker, product.id);
                  setPicker(null);
                }}
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
  /** Matches SectionList `content` horizontal padding so headers align with 🍬 Sweet / 🪀 Toy */
  overviewTopBlock: { paddingHorizontal: 20 },
  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 12,
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
