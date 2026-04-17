import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Product, ProductCategory } from "@/types";

export interface ProductPickerModalProps {
  /** Only show products matching this category (or products with no category). */
  category: ProductCategory | null;
  products: Product[];
  onClose: () => void;
  /** Custom row renderer — receives a product and the accent colour. */
  renderRow: (product: Product, accent: string, colors: Colors[keyof Colors]) => React.ReactNode;
  /** Title shown in the modal header. Defaults to "Add product". */
  title?: string;
  /** Empty-list message when there are no results for the current search. */
  emptyMessage?: string;
}

// Re-export type so callers can refer to it without importing from here
export type { ProductCategory };

type Colors = typeof Colors;

/**
 * Reusable product-picker modal: search box + filtered FlatList.
 * Callers supply `renderRow` to customise each row.
 */
export function ProductPickerModal({
  category,
  products,
  onClose,
  renderRow,
  title = "Add product",
  emptyMessage,
}: ProductPickerModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = useMemo(() => primaryColor(settings.accentColor), [settings.accentColor]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !category || !p.category || p.category === category)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, category, search]);

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => <>{renderRow(item, accent, colors)}</>,
    [renderRow, accent, colors]
  );

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
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[styles.headerClose, { color: colors.subtext }]}>
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
              autoCorrect={false}
              autoCapitalize="none"
              autoComplete="off"
              selectionColor={`${accent}44`}
              cursorColor={accent}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.subtext }]}>
                {emptyMessage ??
                  (search
                    ? `No results for "${search}"`
                    : "No products available.")}
              </Text>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  headerClose: { fontSize: 15 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15 },
  empty: { padding: 20, textAlign: "center", fontSize: 13 },
});
