import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
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
import { GradView } from "@/components/ui/grad-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Product, ProductCategory } from "@/types";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  sweet: "🍬 Sweets",
  toy: "🪀 Toys",
  other: "📦 Other",
};

const CATEGORY_ORDER: ProductCategory[] = ["sweet", "toy", "other"];

const CATEGORY_ICON: Record<string, string> = {
  sweet: "🍬",
  toy: "🪀",
  other: "📦",
};

function categoryIcon(product: Product): string {
  return CATEGORY_ICON[product.category ?? "other"] ?? "📦";
}

type FilterTab = "all" | ProductCategory;

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Sweets", value: "sweet" },
  { label: "Toys", value: "toy" },
  { label: "Other", value: "other" },
];

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)["light"];
  /** When set, the modal is in edit mode */
  editProduct?: Product | null;
}

function ProductFormModal({ visible, onClose, colors, editProduct }: ProductFormModalProps) {
  const { addProduct, updateProduct } = useApp();
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const isEdit = !!editProduct;

  const [name, setName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [category, setCategory] = useState<ProductCategory>("sweet");
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Populate fields when opening in edit mode – called by Modal's onShow
  const handleShow = () => {
    if (editProduct) {
      setName(editProduct.name);
      setCategory(editProduct.category ?? "sweet");
      setImageUri(editProduct.localImageUri ?? null);
    } else {
      setName("");
      setCategory("sweet");
      setImageUri(null);
    }
    setNameFocused(false);
  };

  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo access to upload a product image.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter a product name.");
      return;
    }
    if (isEdit && editProduct) {
      updateProduct({
        ...editProduct,
        name: trimmed,
        category,
        localImageUri: imageUri ?? undefined,
      });
    } else {
      addProduct(trimmed, undefined, category, imageUri ?? undefined);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sheetHandle} />

        {/* Header row */}
        <View style={styles.sheetHeaderRow}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEdit ? "Edit Product" : "New Product"}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.sheetDoneText, { color: accent }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Category selector */}
        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Category</Text>
        <View style={styles.categoryRow}>
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.categoryBtn,
                {
                  backgroundColor: category === cat ? accent : colors.card,
                  borderColor: category === cat ? accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.categoryBtnText, { color: category === cat ? "#fff" : colors.subtext }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Name *</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: nameFocused ? accent : colors.border,
              backgroundColor: colors.background,
            },
          ]}
          placeholder="e.g. Gummy Bears"
          placeholderTextColor={colors.subtext}
          value={name}
          onChangeText={setName}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          selectionColor={`${accent}44`}
          cursorColor={accent}
          autoFocus={!isEdit}
          returnKeyType="next"
        />

        {/* Image picker */}
        {(() => {
          // User-uploaded URI takes priority; fall back to the bundled asset for this product id
          const uploadedSrc = imageUri ? { uri: imageUri } : null;
          const bundledSrc = editProduct ? PRODUCT_IMAGES[editProduct.id] : null;
          const displaySrc = uploadedSrc ?? bundledSrc ?? null;
          // Show clear button only when there's a user-set URI (not a read-only bundled image)
          const canClear = !!imageUri;
          return (
            <>
              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>Image (optional)</Text>
              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={[
                    styles.imagePicker,
                    {
                      borderColor: displaySrc ? accent : colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  {displaySrc ? (
                    <Image source={displaySrc} style={styles.imagePreview} resizeMode="contain" />
                  ) : (
                    <Text style={[styles.imagePickerPlaceholder, { color: colors.subtext }]}>
                      {"📷  Tap to upload"}
                    </Text>
                  )}
                </TouchableOpacity>
                {canClear && (
                  <TouchableOpacity
                    onPress={() => setImageUri(null)}
                    hitSlop={8}
                    style={[styles.imageClear, { backgroundColor: colors.border }]}
                  >
                    <Text style={[styles.imageClearText, { color: colors.text }]}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          );
        })()}

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: accent }]}
          onPress={handleSave}
        >
          <Text style={styles.addBtnText}>{isEdit ? "Save Changes" : "Add Product"}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

interface ProductRowProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  colors: (typeof Colors)["light"];
}

function ProductRow({ product, onEdit, onDelete, colors }: ProductRowProps) {
  const [zoomed, setZoomed] = useState(false);
  const src = product.localImageUri
    ? { uri: product.localImageUri }
    : PRODUCT_IMAGES[product.id];

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${product.name}" from the catalog?`)) onDelete();
    } else {
      Alert.alert(
        "Delete Product",
        `Remove "${product.name}" from the catalog? This won't affect existing machine slots.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ],
      );
    }
  };

  const { width, height } = Dimensions.get("window");

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onEdit}
      activeOpacity={0.7}
    >
      {src ? (
        <TouchableOpacity onPress={() => setZoomed(true)} activeOpacity={0.8}>
          <Image source={src} style={styles.rowImage} resizeMode="cover" />
        </TouchableOpacity>
      ) : (
        <Text style={styles.rowEmoji}>{categoryIcon(product)}</Text>
      )}
      <Text style={[styles.rowName, { color: colors.text }]}>
        {product.name}
      </Text>
      <TouchableOpacity
        onPress={handleDelete}
        hitSlop={8}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>

      {/* Image zoom modal */}
      {src && (
        <Modal
          visible={zoomed}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomed(false)}
        >
          <Pressable style={styles.zoomOverlay} onPress={() => setZoomed(false)}>
            <View style={styles.zoomCard}>
              <Image
                source={src}
                style={{ width: width * 0.85, height: height * 0.7 }}
                resizeMode="contain"
              />
              <Text style={[styles.zoomName, { color: colors.text }]}>
                {product.name}
              </Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </TouchableOpacity>
  );
}

type ViewMode = 'grid' | 'list';

interface ProductGridCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  colors: (typeof Colors)['light'];
}

function ProductGridCard({ product, onEdit, onDelete, colors }: ProductGridCardProps) {
  const src = product.localImageUri
    ? { uri: product.localImageUri }
    : PRODUCT_IMAGES[product.id];

  return (
    <TouchableOpacity
      onPress={onEdit}
      onLongPress={onDelete}
      activeOpacity={0.8}
      style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {src ? (
        <Image source={src} style={styles.gridCardImage} resizeMode="cover" />
      ) : (
        <Text style={styles.gridCardEmoji}>{categoryIcon(product)}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const { state, deleteProduct } = useApp();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const sections = useMemo(() => {
    const filtered = state.products.filter((p) => {
      const matchCat =
        filter === "all" ||
        p.category === filter ||
        (!p.category && filter === "other");
      const matchSearch =
        !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => a.name.localeCompare(b.name));

    if (filter !== "all") {
      return [
        {
          title:
            CATEGORY_LABELS[
              filter === "other" ? "other" : (filter as ProductCategory)
            ],
          data: filtered,
        },
      ];
    }

    return CATEGORY_ORDER.map((cat) => ({
      title: CATEGORY_LABELS[cat],
      data: filtered.filter((p) => (p.category ?? "other") === cat),
    })).filter((s) => s.data.length > 0);
  }, [state.products, filter, search]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        <TouchableOpacity
          style={[styles.headerAddBtn, { borderColor: accent, backgroundColor: colors.card }]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={[styles.headerAddBtnText, { color: accent }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        {state.products.length} products in catalog
      </Text>

      {/* Search */}
      <View
        style={[
          styles.searchWrap,
          { borderColor: searchFocused ? accent : colors.border, backgroundColor: colors.card },
        ]}
      >
        <Text style={{ color: colors.subtext, fontSize: 16 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products…"
          placeholderTextColor={colors.subtext}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Text style={{ color: colors.subtext }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            onPress={() => setFilter(tab.value)}
            style={[
              styles.filterTab,
              {
                borderBottomColor:
                  filter === tab.value ? accent : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === tab.value ? accent : colors.subtext },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* View toggle */}
      <View style={[styles.toggleBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setViewMode('grid')}
          style={styles.toggleBtn}>
          {viewMode === 'grid' && <GradView colors={settings.accentColor} style={StyleSheet.absoluteFill} />}
          <Text style={[styles.toggleIcon, { color: viewMode === 'grid' ? '#fff' : colors.subtext }]}>⊞</Text>
          <Text style={[styles.toggleLabel, { color: viewMode === 'grid' ? '#fff' : colors.subtext }]}>Grid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={styles.toggleBtn}>
          {viewMode === 'list' && <GradView colors={settings.accentColor} style={StyleSheet.absoluteFill} />}
          <Text style={[styles.toggleIcon, { color: viewMode === 'list' ? '#fff' : colors.subtext }]}>≡</Text>
          <Text style={[styles.toggleLabel, { color: viewMode === 'list' ? '#fff' : colors.subtext }]}>List</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'grid' ? (
        <FlatList
          data={sections.flatMap((s) => s.data)}
          keyExtractor={(p) => p.id}
          numColumns={3}
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <ProductGridCard
              product={item}
              onEdit={() => setEditingProduct(item)}
              onDelete={() => {
                if (Platform.OS === 'web') {
                  if (window.confirm(`Remove "${item.name}" from the catalog?`)) deleteProduct(item.id);
                } else {
                  Alert.alert(
                    'Delete Product',
                    `Remove "${item.name}" from the catalog?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteProduct(item.id) },
                    ]
                  );
                }
              }}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No products found</Text>
              <Text style={[styles.emptyNote, { color: colors.subtext }]}>
                {state.products.length === 0 ? 'Tap + to add products to your catalog.' : 'Try a different search or filter.'}
              </Text>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.subtext, backgroundColor: colors.background },
              ]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              onEdit={() => setEditingProduct(item)}
              onDelete={() => deleteProduct(item.id)}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No products found
              </Text>
              <Text style={[styles.emptyNote, { color: colors.subtext }]}>
                {state.products.length === 0
                  ? "Tap + to add products to your catalog."
                  : "Try a different search or filter."}
              </Text>
            </View>
          }
        />
      )}

      <ProductFormModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        colors={colors}
      />
      <ProductFormModal
        visible={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        colors={colors}
        editProduct={editingProduct}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAddBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  headerAddBtnText: { fontSize: 13, fontWeight: "600" },
  fabIcon: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "400",
    lineHeight: 24,
  },
  subtitle: {
    paddingHorizontal: 20,
    fontSize: 13,
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
    marginBottom: 4,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    paddingVertical: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowEmoji: { fontSize: 32, width: 50, textAlign: "center" },
  rowImage: { width: 50, height: 50, borderRadius: 6 },
  imagePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  imagePicker: {
    flex: 1,
    height: 240,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePickerPlaceholder: { fontSize: 14 },
  imageClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  imageClearText: { fontSize: 12, fontWeight: "600" },
  toggleBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    paddingVertical: 6,
    gap: 5,
    overflow: 'hidden',
  },
  toggleIcon: { fontSize: 15, lineHeight: 15, includeFontPadding: false },
  toggleLabel: { fontSize: 12, fontWeight: '600' },
  gridList: { paddingHorizontal: 20, paddingBottom: 40 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 300 / 479,
  },
  gridCardImage: { width: '100%', height: '100%' },
  gridCardEmoji: { fontSize: 36 },
  rowName: { flex: 1, fontSize: 15, fontWeight: "500" },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 17, color: "#ef4444" },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyNote: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  // Image zoom
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomCard: {
    alignItems: "center",
    gap: 14,
  },
  zoomName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sheetDoneText: {
    fontSize: 15,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  categoryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 4,
  },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
