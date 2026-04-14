import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationCard } from "@/components/location-card";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)["light"];
}

function AddLocationModal({ visible, onClose, colors }: AddLocationModalProps) {
  const { addLocation } = useApp();
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isValid =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    postcode.trim().length > 0;

  const [submitted, setSubmitted] = useState(false);

  const handleAdd = () => {
    setSubmitted(true);
    if (!isValid) return;
    addLocation({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
      lastRestockedAt: null,
      machines: [],
      notes: undefined,
    });
    setName("");
    setAddress("");
    setCity("");
    setPostcode("");
    setSubmitted(false);
    onClose();
  };

  const inputStyle = (value: string, field: string) => [
    styles.input,
    {
      color: colors.text,
      backgroundColor: colors.background,
      borderColor:
        submitted && !value.trim()
          ? "#ef4444"
          : focusedField === field
          ? accent
          : colors.border,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>
          New Location
        </Text>

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
          Name <Text style={{ color: "#ef4444" }}>*</Text>
        </Text>
        <TextInput
          style={inputStyle(name, 'name')}
          placeholder="e.g. Westfield Food Court"
          placeholderTextColor={colors.subtext}
          value={name}
          onChangeText={setName}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          selectionColor={`${accent}44`}
          cursorColor={accent}
          autoFocus
          returnKeyType="next"
        />
        {submitted && !name.trim() && (
          <Text style={styles.errorText}>Name is required</Text>
        )}

        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
          Address <Text style={{ color: "#ef4444" }}>*</Text>
        </Text>
        <TextInput
          style={inputStyle(address, 'address')}
          placeholder="1st line of address"
          placeholderTextColor={colors.subtext}
          value={address}
          onChangeText={setAddress}
          onFocus={() => setFocusedField('address')}
          onBlur={() => setFocusedField(null)}
          selectionColor={`${accent}44`}
          cursorColor={accent}
          returnKeyType="next"
        />
        {submitted && !address.trim() && (
          <Text style={styles.errorText}>Address is required</Text>
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputFlex}>
            <TextInput
              style={inputStyle(city, 'city')}
              placeholder="City"
              placeholderTextColor={colors.subtext}
              value={city}
              onChangeText={setCity}
              onFocus={() => setFocusedField('city')}
              onBlur={() => setFocusedField(null)}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="next"
            />
            {submitted && !city.trim() && (
              <Text style={styles.errorText}>Required</Text>
            )}
          </View>
          <View style={styles.inputPostcode}>
            <TextInput
              style={inputStyle(postcode, 'postcode')}
              placeholder="Postcode"
              placeholderTextColor={colors.subtext}
              value={postcode}
              onChangeText={setPostcode}
              onFocus={() => setFocusedField('postcode')}
              onBlur={() => setFocusedField(null)}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              autoCapitalize="characters"
            />
            {submitted && !postcode.trim() && (
              <Text style={styles.errorText}>Required</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: isValid ? "#a2e62e" : colors.border },
          ]}
          onPress={handleAdd}
          activeOpacity={isValid ? 0.75 : 1}
        >
          <Text
            style={[styles.addBtnText, !isValid && { color: colors.subtext }]}
          >
            Add Location
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function LocationsScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = state.locations.filter((loc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.address?.toLowerCase().includes(q) ||
      loc.city?.toLowerCase().includes(q) ||
      loc.postcode?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Locations</Text>
        <TouchableOpacity
          style={[
            styles.headerAddBtn,
            { borderColor: accent, backgroundColor: colors.card },
          ]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={[styles.headerAddBtnText, { color: accent }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

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
          placeholder="Search locations…"
          placeholderTextColor={colors.subtext}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          selectionColor={`${accent}44`}
          cursorColor={accent}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Text style={{ color: colors.subtext, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            onPress={() =>
              router.push({
                pathname: "/location/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {state.locations.length === 0 ? "No locations yet" : "No results"}
            </Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              {state.locations.length === 0
                ? "Tap + to add your first location."
                : "Try a different search or filter."}
            </Text>
          </View>
        }
      />

      <AddLocationModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        colors={colors}
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
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
  filters: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 6,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyNote: { fontSize: 14, textAlign: "center" },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
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
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputFlex: { flex: 1 },
  inputPostcode: { width: 120 },
  errorText: { fontSize: 11, color: "#ef4444", marginTop: 2, marginBottom: 4 },
  headerAddBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  headerAddBtnText: { fontSize: 13, fontWeight: "600" },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
