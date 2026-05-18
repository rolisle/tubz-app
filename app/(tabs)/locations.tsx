import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationCard } from "@/components/location-card";
import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { GradView } from "@/components/ui/grad-view";
import { SlideModal } from "@/components/ui/slide-modal";
import { SS } from "@/constants/shared-styles";
import { Colors } from "@/constants/theme";
import { useApp, useAppActions } from "@/context/app-context";
import {
  AppColor,
  primaryColor,
  useSettings,
} from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Location } from "@/types";
import {
  mapsUrlFieldError,
} from "@/utils/maps";

/* ─── Tab bar ───────────────────────────────────────────────────── */

type TabId = "all" | "city";

interface TabBarProps {
  active: TabId;
  onChange: (t: TabId) => void;
  accent: AppColor;
  colors: (typeof Colors)["light"];
}

function TabBar({ active, onChange, accent, colors }: TabBarProps) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "city", label: "By City" },
  ];
  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={styles.tab}
          onPress={() => onChange(t.id)}
          activeOpacity={0.8}
        >
          {active === t.id && (
            <GradView
              colors={accent}
              style={[StyleSheet.absoluteFill, { borderRadius: 9 }]}
            />
          )}
          <Text
            style={[
              styles.tabLabel,
              { color: active === t.id ? "#fff" : colors.subtext },
            ]}
          >
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)["light"];
}

function AddLocationModal({ visible, onClose, colors }: AddLocationModalProps) {
  const { addLocation } = useAppActions();
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
  const postcodeValid = UK_POSTCODE.test(postcode.trim());

  const isValid =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    postcodeValid;

  const [submitted, setSubmitted] = useState(false);

  const handleClose = () => {
    setName("");
    setAddress("");
    setCity("");
    setPostcode("");
    setMapsUrl("");
    setSubmitted(false);
    onClose();
  };

  const handleAdd = () => {
    setSubmitted(true);
    if (!isValid) return;
    if (mapsUrlFieldError(mapsUrl)) return;
    addLocation({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      postcode: postcode.trim().toUpperCase(),
      mapsUrl,
      lastRestockedAt: null,
      machines: [],
    });
    handleClose();
  };

  const inputStyle = (value: string, field: string, invalid = false) => [
    SS.formInput,
    {
      color: colors.text,
      backgroundColor: colors.background,
      borderColor:
        submitted && invalid
          ? colors.danger
          : focusedField === field
            ? accent
            : colors.border,
    },
  ];

  return (
    <SlideModal animation="fade" visible={visible} onRequestClose={handleClose}>
      <SafeAreaView style={[SS.fsModalSafe, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FsModalNavbar
            title="New Location"
            colors={colors}
            accent={accent}
            left={{ label: "Cancel", onPress: handleClose, tone: "danger" }}
            right={{
              label: "Add",
              onPress: handleAdd,
              tone: isValid ? "accent" : "muted",
            }}
          />

          <ScrollView
            contentContainerStyle={SS.fsModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[SS.formFieldLabel, { color: colors.subtext }]}>
              Name <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={inputStyle(name, "name", !name.trim())}
              placeholder="e.g. Westfield Food Court"
              placeholderTextColor={colors.subtext}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              autoFocus
              returnKeyType="next"
            />
            {submitted && !name.trim() && (
              <Text style={styles.errorText}>Name is required</Text>
            )}

            <Text style={[SS.formFieldLabel, { color: colors.subtext }]}>
              Address <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={inputStyle(address, "address", !address.trim())}
              placeholder="1st line of address"
              placeholderTextColor={colors.subtext}
              value={address}
              onChangeText={setAddress}
              onFocus={() => setFocusedField("address")}
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
                  style={inputStyle(city, "city", !city.trim())}
                  placeholder="City *"
                  placeholderTextColor={colors.subtext}
                  value={city}
                  onChangeText={setCity}
                  onFocus={() => setFocusedField("city")}
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
                  style={inputStyle(postcode, "postcode", !postcodeValid)}
                  placeholder="Postcode *"
                  placeholderTextColor={colors.subtext}
                  value={postcode}
                  onChangeText={setPostcode}
                  onFocus={() => setFocusedField("postcode")}
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
                {submitted && postcode.trim() && !postcodeValid && (
                  <Text style={styles.errorText}>Invalid UK postcode</Text>
                )}
              </View>
            </View>

            <Text style={[SS.formFieldLabel, { color: colors.subtext }]}>
              Google Maps link
            </Text>
            <Text style={[styles.fieldHint, { color: colors.subtext }]}>
              Optional. Paste a share link (e.g. maps.app.goo.gl) to open in Maps
              instead of searching the address.
            </Text>
            <TextInput
              style={inputStyle(
                mapsUrl,
                "mapsUrl",
                !!(submitted && mapsUrlFieldError(mapsUrl)),
              )}
              placeholder="https://maps.app.goo.gl/…"
              placeholderTextColor={colors.subtext}
              value={mapsUrl}
              onChangeText={setMapsUrl}
              onFocus={() => setFocusedField("mapsUrl")}
              onBlur={() => setFocusedField(null)}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {submitted && mapsUrlFieldError(mapsUrl) ? (
              <Text style={styles.errorText}>{mapsUrlFieldError(mapsUrl)}</Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SlideModal>
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
  const [tab, setTab] = useState<TabId>("all");

  const navigate = useCallback((loc: Location) =>
    router.push({ pathname: "/location/[id]", params: { id: loc.id } }), [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.locations
      .filter(
        (loc) =>
          !q ||
          loc.name.toLowerCase().includes(q) ||
          loc.address?.toLowerCase().includes(q) ||
          loc.city?.toLowerCase().includes(q) ||
          loc.postcode?.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.locations, search]);

  const cityGroups = useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const loc of filtered) {
      const key = loc.city?.trim() || "No City";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(loc);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === "No City") return 1;
        if (b === "No City") return -1;
        return a.localeCompare(b);
      })
      .map(([city, data]) => ({ title: city, data }));
  }, [filtered]);

  const emptyComponent = (
    <View style={SS.emptyWrap}>
      <Text style={SS.emptyIcon}>📍</Text>
      <Text style={[SS.emptyTitle, { color: colors.text }]}>
        {state.locations.length === 0 ? "No locations yet" : "No results"}
      </Text>
      <Text style={[SS.emptyNote, { color: colors.subtext }]}>
        {state.locations.length === 0
          ? "Tap + to add your first location."
          : "Try a different search or filter."}
      </Text>
    </View>
  );

  const searchBar = (
    <View
      style={[
        SS.searchWrap,
        {
          marginBottom: 10,
          borderColor: searchFocused ? accent : colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      <Text style={{ color: colors.subtext, fontSize: 16 }}>🔍</Text>
      <TextInput
        style={[SS.searchInput, { color: colors.text }]}
        placeholder="Search locations…"
        placeholderTextColor={colors.subtext}
        value={search}
        onChangeText={setSearch}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        autoCorrect={false}
        autoCapitalize="none"
        autoComplete="off"
        selectionColor={`${accent}44`}
        cursorColor={accent}
      />
      {search.length > 0 && (
        <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
          <Text style={{ color: colors.subtext, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[SS.flex1, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={SS.screenHeader}>
        <View>
          <Text style={[SS.screenTitle, { color: colors.text }]}>Locations</Text>
          <Text style={[SS.screenSubtitle, { color: colors.subtext }]}>
            {state.locations.length === 0
              ? "No locations yet"
              : `${state.locations.length} location${state.locations.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[SS.headerBtn, { borderColor: accent, backgroundColor: colors.card }]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={[SS.headerBtnText, { color: accent }]}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {tab === "city" ? (
        <SectionList
          sections={cityGroups}
          keyExtractor={(l) => l.id}
          contentContainerStyle={SS.listContent}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <>
              {searchBar}
              <TabBar
                active={tab}
                onChange={setTab}
                accent={settings.accentColor}
                colors={colors}
              />
            </>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.cityHeader}>
              <Text style={[styles.cityTitle, { color: colors.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.cityCount, { color: colors.subtext }]}>
                {section.data.length} location
                {section.data.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <LocationCard location={item} onPress={() => navigate(item)} />
          )}
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={emptyComponent}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => l.id}
          contentContainerStyle={SS.listContent}
          ListHeaderComponent={
            <>
              {searchBar}
              <TabBar
                active={tab}
                onChange={setTab}
                accent={settings.accentColor}
                colors={colors}
              />
            </>
          }
          renderItem={({ item }) => (
            <LocationCard location={item} onPress={() => navigate(item)} />
          )}
          ListEmptyComponent={emptyComponent}
        />
      )}

      <AddLocationModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 7,
    alignItems: "center",
    overflow: "hidden",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  cityHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  cityTitle: { fontSize: 16, fontWeight: "700" },
  cityCount: { fontSize: 13 },
  fieldHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -2,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  inputFlex: { flex: 1 },
  inputPostcode: { width: 120 },
  errorText: { fontSize: 11, color: "#ef4444", marginTop: 2, marginBottom: 4 },
});
