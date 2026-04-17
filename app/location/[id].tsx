import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { DatePickerModal } from "@/components/ui/date-picker-modal";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradView } from "@/components/ui/grad-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MachineGrid } from "@/components/ui/machine-grid";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Machine, MachineType } from "@/types";

const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: "Sweet Machine 🍬",
  toy: "Toy Machine 🪀",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    state,
    updateLocation,
    deleteLocation,
    restockLocation,
    addMachine,
    updateMachine,
    deleteMachine,
  } = useApp();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const MACHINE_COLORS: Record<MachineType, string> = {
    sweet: primaryColor(settings.sweetColor),
    toy: primaryColor(settings.toyColor),
  };
  const router = useRouter();

  const location = useMemo(
    () => state.locations.find((l) => l.id === id),
    [state.locations, id],
  );

  const [name, setName] = useState(location?.name ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [postcode, setPostcode] = useState(location?.postcode ?? "");
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const accent = primaryColor(settings.accentColor);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(
    location?.lastRestockedAt ? new Date(location.lastRestockedAt) : new Date(),
  );
  const [showHistory, setShowHistory] = useState(false);

  const handleMachineUpdate = useCallback(
    (machine: Machine) => updateMachine(location?.id ?? "", machine),
    [location?.id, updateMachine],
  );

  if (!location) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.subtext }]}>
            Location not found.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 8,
            }}
          >
            <IconSymbol
              name="arrow.left"
              size={16}
              color={primaryColor(settings.accentColor)}
            />
            <Text style={{ color: primaryColor(settings.accentColor) }}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const saveField = (
    field: "name" | "address" | "city" | "postcode" | "notes",
    value: string,
  ) => {
    const trimmed = value.trim();
    if (field === "name" && !trimmed) return;
    updateLocation({ ...location, [field]: trimmed || undefined });
  };

  const handleRestock = () => {
    restockLocation(location.id);
    setPickerDate(new Date());
  };

  const handleConfirmDate = (date: Date) => {
    updateLocation({ ...location, lastRestockedAt: date.toISOString() });
    setShowDatePicker(false);
  };

  const handleDeleteLocation = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${location.name}"? This cannot be undone.`)) {
        deleteLocation(location.id);
        router.back();
      }
    } else {
      Alert.alert(
        "Delete Location",
        `Are you sure you want to delete "${location.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteLocation(location.id);
              router.back();
            },
          },
        ],
      );
    }
  };

  const handleAddMachine = (type: MachineType) => {
    addMachine(location.id, type);
  };

  const handleDeleteMachine = (machineId: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Remove this machine from the location?")) {
        deleteMachine(location.id, machineId);
      }
    } else {
      Alert.alert("Remove Machine", "Remove this machine from the location?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteMachine(location.id, machineId),
        },
      ]);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Nav bar */}
        <View style={styles.navbar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backBtn}
          >
            <IconSymbol
              name="arrow.left"
              size={18}
              color={primaryColor(settings.accentColor)}
            />
            <Text
              style={[
                styles.backText,
                { color: primaryColor(settings.accentColor) },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteLocation} hitSlop={8}>
            <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "500" }}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <TextInput
            style={[
              styles.nameInput,
              {
                color: colors.text,
                borderBottomColor:
                  focusedField === "name" ? accent : "transparent",
              },
            ]}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocusedField("name")}
            onBlur={() => {
              setFocusedField(null);
              saveField("name", name);
            }}
            placeholder="Location name"
            placeholderTextColor={colors.subtext}
            selectionColor={`${accent}44`}
            cursorColor={accent}
            returnKeyType="done"
          />

          {/* Address */}
          <TextInput
            style={[
              styles.addressInput,
              {
                color: colors.text,
                borderBottomColor:
                  focusedField === "address" ? accent : "transparent",
              },
            ]}
            value={address}
            onChangeText={setAddress}
            onFocus={() => setFocusedField("address")}
            onBlur={() => {
              setFocusedField(null);
              saveField("address", address);
            }}
            placeholder="1st line of address"
            placeholderTextColor={colors.subtext}
            selectionColor={`${accent}44`}
            cursorColor={accent}
            returnKeyType="next"
          />
          <View style={styles.addressRow}>
            <TextInput
              style={[
                styles.addressInputHalf,
                {
                  color: colors.text,
                  borderBottomColor:
                    focusedField === "city" ? accent : "transparent",
                },
              ]}
              value={city}
              onChangeText={setCity}
              onFocus={() => setFocusedField("city")}
              onBlur={() => {
                setFocusedField(null);
                saveField("city", city);
              }}
              placeholder="City"
              placeholderTextColor={colors.subtext}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="next"
            />
            <TextInput
              style={[
                styles.addressInputHalf,
                {
                  color: colors.text,
                  borderBottomColor:
                    focusedField === "postcode" ? accent : "transparent",
                },
              ]}
              value={postcode}
              onChangeText={setPostcode}
              onFocus={() => setFocusedField("postcode")}
              onBlur={() => {
                setFocusedField(null);
                saveField("postcode", postcode);
              }}
              placeholder="Postcode"
              placeholderTextColor={colors.subtext}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="done"
              autoCapitalize="characters"
            />
          </View>

          {/* Last restock row */}
          <View style={styles.restockRow}>
            {(location.restockHistory?.length ?? 0) > 0 && (
              <TouchableOpacity
                onPress={() => setShowHistory(true)}
                style={[
                  styles.historyBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.historyBtnText, { color: colors.subtext }]}
                >
                  🕓
                </Text>
              </TouchableOpacity>
            )}
            {/* Restock history modal */}
            <Modal
              visible={showHistory}
              transparent
              animationType="slide"
              onRequestClose={() => setShowHistory(false)}
            >
              <Pressable
                style={styles.historyOverlay}
                onPress={() => setShowHistory(false)}
              />
              <View
                style={[
                  styles.historySheet,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyTitle, { color: colors.text }]}>
                    Restock History
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowHistory(false)}
                    hitSlop={8}
                  >
                    <Text
                      style={[styles.historyClose, { color: accent }]}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={[...(location.restockHistory ?? [])].reverse()}
                  keyExtractor={(item, i) => `${item}-${i}`}
                  contentContainerStyle={styles.historyList}
                  renderItem={({ item, index }) => (
                    <View
                      style={[
                        styles.historyRow,
                        { borderBottomColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[styles.historyIndex, { color: colors.subtext }]}
                      >
                        #{(location.restockHistory?.length ?? 0) - index}
                      </Text>
                      <Text
                        style={[styles.historyDate, { color: colors.text }]}
                      >
                        {new Date(item).toLocaleDateString("en-AU", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text
                      style={[styles.historyEmpty, { color: colors.subtext }]}
                    >
                      No history yet.
                    </Text>
                  }
                />
              </View>
            </Modal>
            <View style={styles.restockInfo}>
              <Text style={[styles.restockMeta, { color: colors.subtext }]}>
                Last restocked
              </Text>
              <Text style={[styles.restockDate, { color: colors.text }]}>
                {location.lastRestockedAt
                  ? formatDate(location.lastRestockedAt)
                  : "Never"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPickerDate(
                  location.lastRestockedAt
                    ? new Date(location.lastRestockedAt)
                    : new Date(),
                );
                setShowDatePicker(true);
              }}
              style={[
                styles.editDateBtn,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.editDateBtnText, { color: colors.subtext }]}>
                Edit date
              </Text>
            </TouchableOpacity>
          </View>

          {/* Restock period */}
          <View style={styles.periodSection}>
            <View style={styles.periodLabelRow}>
              <Text style={[styles.periodLabel, { color: colors.subtext }]}>
                Restock every
              </Text>
              {location.restockPeriodWeeks && (
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() =>
                    updateLocation({
                      ...location,
                      restockPeriodWeeks: undefined,
                    })
                  }
                >
                  <Text style={[styles.periodClear, { color: colors.subtext }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.periodPills}
              keyboardShouldPersistTaps="handled"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                const active = location.restockPeriodWeeks === w;
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() =>
                      updateLocation({ ...location, restockPeriodWeeks: w })
                    }
                    style={[
                      styles.periodPill,
                      {
                        borderColor: active ? accent : colors.border,
                        overflow: "hidden",
                      },
                    ]}
                  >
                    {active && (
                      <GradView
                        colors={settings.accentColor}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text
                      style={[
                        styles.periodPillNum,
                        { color: active ? "#fff" : colors.text },
                      ]}
                    >
                      {w}
                    </Text>
                    <Text
                      style={[
                        styles.periodPillUnit,
                        { color: active ? "#ffffffbb" : colors.subtext },
                      ]}
                    >
                      {w === 1 ? "wk" : "wks"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Restock button row */}
          <View style={styles.restockBtnRow}>
            <TouchableOpacity
              style={[
                styles.restockBtn,
                {
                  flex: 1,
                  backgroundColor: colors.card,
                  borderColor: primaryColor(settings.accentColor),
                },
              ]}
              onPress={handleRestock}
            >
              <Text
                style={[
                  styles.restockBtnText,
                  { color: primaryColor(settings.accentColor) },
                ]}
              >
                ✓ Mark Restocked Now
              </Text>
            </TouchableOpacity>
          </View>

          <DatePickerModal
            visible={showDatePicker}
            value={pickerDate}
            onConfirm={handleConfirmDate}
            onCancel={() => setShowDatePicker(false)}
          />

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Machines — grouped by type */}
          {(["sweet", "toy"] as const).map((type) => {
            const typeColor = MACHINE_COLORS[type];
            const typeMachines = location.machines.filter(
              (m) => m.type === type,
            );
            const emoji = type === "sweet" ? "🍬" : "🪀";
            const machineColors =
              type === "sweet" ? settings.sweetColor : settings.toyColor;
            const label = type === "sweet" ? "Sweet Machines" : "Toy Machines";
            return (
              <View key={type} style={styles.machineSection}>
                {/* Section header */}
                <View style={styles.machineSectionHeader}>
                  <Text
                    style={[styles.machineSectionTitle, { color: typeColor }]}
                  >
                    {emoji} {label}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addMachineInlineBtn,
                      { borderColor: typeColor },
                    ]}
                    onPress={() => handleAddMachine(type)}
                  >
                    <GradView
                      colors={machineColors}
                      style={[StyleSheet.absoluteFill, { opacity: 0.12 }]}
                    />
                    <Text
                      style={[
                        styles.addMachineInlineBtnText,
                        { color: typeColor },
                      ]}
                    >
                      + Add
                    </Text>
                  </TouchableOpacity>
                </View>

                {typeMachines.length === 0 && (
                  <Text style={[styles.sectionNote, { color: colors.subtext }]}>
                    No {type} machines yet.
                  </Text>
                )}

                {typeMachines.map((machine) => (
                  <View
                    key={machine.id}
                    style={[
                      styles.machineCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: typeColor + "55",
                        borderLeftColor: typeColor,
                        borderLeftWidth: 3,
                      },
                    ]}
                  >
                    <View style={styles.machineHeader}>
                      <View style={styles.machineTitleRow}>
                        <Text
                          style={[styles.machineTitle, { color: typeColor }]}
                        >
                          {MACHINE_LABELS[machine.type]}
                        </Text>
                        <Text
                          style={[
                            styles.machineCount,
                            {
                              color:
                                machine.slots.filter(Boolean).length === 9
                                  ? "#ef4444"
                                  : colors.subtext,
                            },
                          ]}
                        >
                          {machine.slots.filter(Boolean).length}/9
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteMachine(machine.id)}
                        hitSlop={8}
                      >
                        <Text style={{ color: "#ef4444", fontSize: 13 }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <MachineGrid
                      machine={machine}
                      products={state.products}
                      onUpdate={handleMachineUpdate}
                    />
                  </View>
                ))}
              </View>
            );
          })}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Notes */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Notes
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: colors.text,
                borderColor: focusedField === "notes" ? accent : colors.border,
                backgroundColor: colors.card,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            onFocus={() => setFocusedField("notes")}
            onBlur={() => {
              setFocusedField(null);
              saveField("notes", notes);
            }}
            placeholder="Add notes about this location…"
            placeholderTextColor={colors.subtext}
            selectionColor={`${accent}44`}
            cursorColor={accent}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 16, fontWeight: "500" },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  nameInput: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
    padding: 0,
    borderBottomWidth: 2,
  },
  addressInput: {
    fontSize: 14,
    marginBottom: 6,
    padding: 0,
    borderBottomWidth: 1.5,
  },
  addressRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  addressInputHalf: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    borderBottomWidth: 1.5,
  },
  restockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  restockInfo: { flex: 1, gap: 1 },
  restockMeta: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  restockDate: { fontSize: 14, fontWeight: "600" },
  editDateBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editDateBtnText: { fontSize: 12, fontWeight: "500" },
  periodSection: { marginBottom: 14 },
  periodLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  periodClear: { fontSize: 12, fontWeight: "500" },
  periodPills: { gap: 6, paddingRight: 4 },
  periodPill: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 46,
  },
  periodPillNum: { fontSize: 15, fontWeight: "700", lineHeight: 18 },
  periodPillUnit: { fontSize: 10, fontWeight: "500", letterSpacing: 0.2 },
  restockBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  restockBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 11,
    alignItems: "center",
  },
  restockBtnText: { fontSize: 15, fontWeight: "700" },
  historyBtn: {
    borderRadius: 10,
    borderWidth: 1,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBtnText: { fontSize: 18 },
  // History modal
  historyOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  historySheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "65%",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  historyTitle: { fontSize: 17, fontWeight: "700" },
  historyClose: { fontSize: 15, fontWeight: "500" },
  historyList: { paddingBottom: 40 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyIndex: { fontSize: 12, fontWeight: "600", minWidth: 28 },
  historyDate: { fontSize: 15 },
  historyEmpty: { textAlign: "center", paddingTop: 32, fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  sectionLabel: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  sectionNote: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  machineCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  machineTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  machineTitle: { fontSize: 16, fontWeight: "700" },
  machineCount: { fontSize: 13, fontWeight: "500" },
  // Machine sections
  machineSection: { marginBottom: 8 },
  machineSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  machineSectionTitle: { fontSize: 15, fontWeight: "700" },
  addMachineInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 8,
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  addMachineInlineBtnText: { fontSize: 13, fontWeight: "600" },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
    marginTop: 8,
  },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16 },
});
