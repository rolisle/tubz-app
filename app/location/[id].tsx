import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import type { Machine, MachineType, WeekDay } from "@/types";
import {
  DAY_LABELS,
  getOpenStatus,
  parseTimeInput,
  WEEK_DAYS,
} from "@/utils/opening-hours";

const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: "Sweet Machine 🍬",
  toy: "Toy Machine 🪀",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showOpeningHours, setShowOpeningHours] = useState(false);

  // Opening hours — local time-input state so users can type freely
  const [timeInputs, setTimeInputs] = useState<
    Record<string, { open: string; close: string }>
  >(() => {
    const result: Record<string, { open: string; close: string }> = {};
    WEEK_DAYS.forEach((day) => {
      result[day] = {
        open: location?.openingHours?.[day]?.open ?? "09:00",
        close: location?.openingHours?.[day]?.close ?? "17:00",
      };
    });
    return result;
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // UK postcode: AN NAA / ANN NAA / AAN NAA / AANN NAA / ANA NAA / AANA NAA
  const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

  const openEdit = () => {
    setName(location?.name ?? "");
    setAddress(location?.address ?? "");
    setCity(location?.city ?? "");
    setPostcode(location?.postcode ?? "");
    setNotes(location?.notes ?? "");
    setEditErrors({});
    setShowEditModal(true);
  };

  const saveEdit = () => {
    if (!location) return;
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!address.trim()) errs.address = "Address is required.";
    if (!city.trim()) errs.city = "City is required.";
    if (!postcode.trim()) {
      errs.postcode = "Postcode is required.";
    } else if (!UK_POSTCODE.test(postcode.trim())) {
      errs.postcode = "Enter a valid UK postcode.";
    }
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    updateLocation({
      ...location,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      postcode: postcode.trim().toUpperCase(),
    });
    setShowEditModal(false);
  };

  const cancelEdit = () => {
    setEditErrors({});
    setShowEditModal(false);
  };

  const toggleDay = (day: WeekDay, enabled: boolean) => {
    if (!location) return;
    const newHours = { ...(location.openingHours ?? {}) };
    if (enabled) {
      newHours[day] = {
        open: timeInputs[day].open,
        close: timeInputs[day].close,
      };
    } else {
      delete newHours[day];
    }
    updateLocation({ ...location, openingHours: newHours });
  };

  const handleTimeBlur = (day: WeekDay, field: "open" | "close") => {
    if (!location?.openingHours?.[day]) return;
    const raw = timeInputs[day][field];
    const parsed = parseTimeInput(raw);
    const normalised = parsed ?? (field === "open" ? "09:00" : "17:00");
    setTimeInputs((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: normalised },
    }));
    if (parsed) {
      const newHours = {
        ...(location.openingHours ?? {}),
        [day]: { ...location.openingHours[day]!, [field]: parsed },
      };
      updateLocation({ ...location, openingHours: newHours });
    }
  };

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
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            hitSlop={8}
            style={[
              styles.menuBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.menuBtnIcon,
                { color: primaryColor(settings.accentColor) },
              ]}
            >
              ⚙️
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name + address header */}
          {(() => {
            const status = getOpenStatus(location.openingHours);
            return (
              <View style={styles.locationHeader}>
                <Text
                  style={[styles.locationName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {location.name}
                </Text>
                {location.address || location.city || location.postcode ? (
                  <TouchableOpacity
                    onPress={() => {
                      const q = [location.address, location.postcode]
                        .filter(Boolean)
                        .join(", ");
                      if (q)
                        Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
                        );
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[styles.addressLine, { color: colors.subtext }]}
                      numberOfLines={1}
                    >
                      {[location.address, location.city, location.postcode]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[styles.addressEmpty, { color: colors.subtext }]}
                  >
                    No address set
                  </Text>
                )}
                {status && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: status.color + "18",
                        borderColor: status.color + "44",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: status.color },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.isOpen ? "Open" : "Closed"}
                      <Text
                        style={[
                          styles.statusSub,
                          { color: status.color + "cc" },
                        ]}
                      >
                        {" "}
                        · {status.label}
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Last restock row */}
          <View style={styles.restockRow}>
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
                    <Text style={[styles.historyClose, { color: accent }]}>
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
                        {new Date(item).toLocaleDateString("en-GB", {
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
            <TouchableOpacity
              style={styles.restockInfo}
              onPress={() => {
                setShowMenu(false);
                setShowHistory(true);
              }}
            >
              <Text style={[styles.restockMeta, { color: colors.text }]}>
                Last restocked
              </Text>
              <Text
                style={[
                  styles.restockDate,
                  { color: primaryColor(settings.accentColor) },
                ]}
              >
                {location.lastRestockedAt
                  ? formatDate(location.lastRestockedAt)
                  : "Never"}
              </Text>
            </TouchableOpacity>
            {/* Restock button */}
            <TouchableOpacity
              style={[
                styles.restockBtn,
                {
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

            {/* Edit date button */}
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
              <Text style={[styles.periodLabel, { color: colors.text }]}>
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
                  <Text style={[styles.periodClear, { color: colors.danger }]}>
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

          <DatePickerModal
            visible={showDatePicker}
            value={pickerDate}
            onConfirm={handleConfirmDate}
            onCancel={() => setShowDatePicker(false)}
          />

          {/* Edit location modal */}
          <Modal
            visible={showEditModal}
            transparent
            animationType="slide"
            onRequestClose={cancelEdit}
          >
            <Pressable style={styles.editOverlay} onPress={cancelEdit} />
            <KeyboardAvoidingView
              style={styles.editSheetWrap}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View
                style={[
                  styles.editSheet,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Header */}
                <View
                  style={[
                    styles.editSheetHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <TouchableOpacity onPress={cancelEdit} hitSlop={8}>
                    <Text
                      style={[styles.editSheetCancel, { color: colors.danger }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.editSheetTitle, { color: colors.text }]}>
                    Edit Location
                  </Text>
                  <TouchableOpacity onPress={saveEdit} hitSlop={8}>
                    <Text style={[styles.editSheetSave, { color: accent }]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.editSheetContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Name */}
                  <Text
                    style={[styles.editFieldLabel, { color: colors.subtext }]}
                  >
                    Name <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.editField,
                      {
                        color: colors.text,
                        borderColor: editErrors.name
                          ? "#ef4444"
                          : focusedField === "eName"
                            ? accent
                            : colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setEditErrors((e) => ({ ...e, name: "" }));
                    }}
                    onFocus={() => setFocusedField("eName")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Location name"
                    placeholderTextColor={colors.subtext}
                    selectionColor={`${accent}44`}
                    cursorColor={accent}
                    returnKeyType="next"
                  />
                  {editErrors.name ? (
                    <Text style={styles.editFieldError}>{editErrors.name}</Text>
                  ) : null}

                  {/* Address */}
                  <Text
                    style={[styles.editFieldLabel, { color: colors.subtext }]}
                  >
                    Address <Text style={{ color: "#ef4444" }}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.editField,
                      {
                        color: colors.text,
                        borderColor: editErrors.address
                          ? "#ef4444"
                          : focusedField === "eAddress"
                            ? accent
                            : colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={address}
                    onChangeText={(v) => {
                      setAddress(v);
                      setEditErrors((e) => ({ ...e, address: "" }));
                    }}
                    onFocus={() => setFocusedField("eAddress")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="1st line of address"
                    placeholderTextColor={colors.subtext}
                    selectionColor={`${accent}44`}
                    cursorColor={accent}
                    returnKeyType="next"
                  />
                  {editErrors.address ? (
                    <Text style={styles.editFieldError}>
                      {editErrors.address}
                    </Text>
                  ) : null}

                  {/* City + Postcode */}
                  <View style={styles.editFieldRow}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[
                          styles.editFieldHalf,
                          {
                            color: colors.text,
                            borderColor: editErrors.city
                              ? "#ef4444"
                              : focusedField === "eCity"
                                ? accent
                                : colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                        value={city}
                        onChangeText={(v) => {
                          setCity(v);
                          setEditErrors((e) => ({ ...e, city: "" }));
                        }}
                        onFocus={() => setFocusedField("eCity")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="City *"
                        placeholderTextColor={colors.subtext}
                        selectionColor={`${accent}44`}
                        cursorColor={accent}
                        returnKeyType="next"
                      />
                      {editErrors.city ? (
                        <Text style={styles.editFieldError}>
                          {editErrors.city}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[
                          styles.editFieldHalf,
                          {
                            color: colors.text,
                            borderColor: editErrors.postcode
                              ? "#ef4444"
                              : focusedField === "ePostcode"
                                ? accent
                                : colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                        value={postcode}
                        onChangeText={(v) => {
                          setPostcode(v);
                          setEditErrors((e) => ({ ...e, postcode: "" }));
                        }}
                        onFocus={() => setFocusedField("ePostcode")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Postcode *"
                        placeholderTextColor={colors.subtext}
                        selectionColor={`${accent}44`}
                        cursorColor={accent}
                        returnKeyType="done"
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      {editErrors.postcode ? (
                        <Text style={styles.editFieldError}>
                          {editErrors.postcode}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Location menu (⋯) */}
          <Modal
            visible={showMenu}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMenu(false)}
          >
            <Pressable
              style={styles.menuOverlay}
              onPress={() => setShowMenu(false)}
            />
            <View
              style={[
                styles.menuSheet,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[styles.menuHandle, { backgroundColor: colors.border }]}
              />
              {/* Edit address */}
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowMenu(false);
                  openEdit();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuItemIcon, { color: colors.subtext }]}>
                  ✏️
                </Text>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                  Edit address
                </Text>
              </TouchableOpacity>
              {/* Edit opening hours */}
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowMenu(false);
                  setShowOpeningHours(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuItemIcon, { color: colors.subtext }]}>
                  ⏰
                </Text>
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                  Edit opening hours
                </Text>
              </TouchableOpacity>
              {/* Restock history */}
              {(location.restockHistory?.length ?? 0) > 0 && (
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    setShowMenu(false);
                    setShowHistory(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.menuItemIcon, { color: colors.subtext }]}
                  >
                    🕓
                  </Text>
                  <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                    Restock history
                  </Text>
                  <Text
                    style={[styles.menuItemMeta, { color: colors.subtext }]}
                  >
                    {location.restockHistory?.length} entries
                  </Text>
                </TouchableOpacity>
              )}
              {/* Delete location */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleDeleteLocation();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuItemIcon, { color: "#ef4444" }]}>
                  🗑️
                </Text>
                <Text style={[styles.menuItemLabel, { color: "#ef4444" }]}>
                  Delete location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.menuCancel,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowMenu(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.menuCancelText, { color: colors.subtext }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Modal>

          {/* Opening hours modal */}
          <Modal
            visible={showOpeningHours}
            transparent
            animationType="slide"
            onRequestClose={() => setShowOpeningHours(false)}
          >
            <Pressable style={styles.menuOverlay} onPress={() => setShowOpeningHours(false)} />
            <KeyboardAvoidingView
              style={styles.editSheetWrap}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.editSheetHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.editSheetTitle, { color: colors.text }]}>Opening Hours</Text>
                  <TouchableOpacity onPress={() => setShowOpeningHours(false)} hitSlop={8}>
                    <Text style={[styles.editSheetSave, { color: accent }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  contentContainerStyle={styles.hoursModalContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {WEEK_DAYS.map((day) => {
                    const isEnabled = !!location.openingHours?.[day];
                    return (
                      <View key={day} style={[styles.hoursRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.hoursDay, { color: colors.text }]}>{DAY_LABELS[day]}</Text>
                        <Switch
                          value={isEnabled}
                          onValueChange={(v) => toggleDay(day, v)}
                          trackColor={{ true: accent, false: colors.border }}
                          thumbColor="#fff"
                        />
                        {isEnabled ? (
                          <View style={styles.hoursTimes}>
                            <TextInput
                              style={[styles.hoursTimeInput, {
                                color: colors.text,
                                borderColor: focusedField === `${day}_open` ? accent : colors.border,
                                backgroundColor: colors.background,
                              }]}
                              value={timeInputs[day].open}
                              onChangeText={(v) => setTimeInputs((p) => ({ ...p, [day]: { ...p[day], open: v } }))}
                              onFocus={() => setFocusedField(`${day}_open`)}
                              onBlur={() => { setFocusedField(null); handleTimeBlur(day, 'open'); }}
                              placeholder="09:00"
                              placeholderTextColor={colors.subtext}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                              returnKeyType="next"
                              selectionColor={`${accent}44`}
                              cursorColor={accent}
                              autoCorrect={false}
                            />
                            <Text style={[styles.hoursDash, { color: colors.subtext }]}>–</Text>
                            <TextInput
                              style={[styles.hoursTimeInput, {
                                color: colors.text,
                                borderColor: focusedField === `${day}_close` ? accent : colors.border,
                                backgroundColor: colors.background,
                              }]}
                              value={timeInputs[day].close}
                              onChangeText={(v) => setTimeInputs((p) => ({ ...p, [day]: { ...p[day], close: v } }))}
                              onFocus={() => setFocusedField(`${day}_close`)}
                              onBlur={() => { setFocusedField(null); handleTimeBlur(day, 'close'); }}
                              placeholder="17:00"
                              placeholderTextColor={colors.subtext}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                              returnKeyType="done"
                              selectionColor={`${accent}44`}
                              cursorColor={accent}
                              autoCorrect={false}
                            />
                          </View>
                        ) : (
                          <Text style={[styles.hoursClosed, { color: colors.subtext }]}>Closed</Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>

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
                                  ? colors.danger
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

          {/* Notes */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.notesLabel, { color: colors.subtext }]}>
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
              updateLocation({ ...location, notes: notes.trim() || undefined });
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
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnIcon: { fontSize: 18, lineHeight: 22 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  // Location header (read-only)
  locationHeader: {
    marginBottom: 2,
    gap: 4,
  },
  locationName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  addressLine: { fontSize: 14 },
  addressEmpty: { fontSize: 13, fontStyle: "italic" },
  // Location menu sheet
  menuOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 36,
    paddingTop: 10,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIcon: { fontSize: 20, width: 26, textAlign: "center" },
  menuItemLabel: { flex: 1, fontSize: 16 },
  menuItemMeta: { fontSize: 13 },
  menuCancel: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuCancelText: { fontSize: 16, fontWeight: "600" },
  // Notes (inline at bottom)
  notesLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
  },
  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  statusSub: { fontWeight: "400" },
  // Opening hours editor
  hoursModalContent: { paddingHorizontal: 20, paddingBottom: 40 },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hoursDay: { fontSize: 14, fontWeight: "600", width: 36 },
  hoursTimes: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  hoursTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center",
  },
  hoursDash: { fontSize: 14 },
  hoursClosed: { flex: 1, fontSize: 13, fontStyle: "italic" },
  // Edit location modal
  editOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  editSheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  editSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "85%",
  },
  editSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editSheetTitle: { fontSize: 17, fontWeight: "700" },
  editSheetCancel: { fontSize: 15 },
  editSheetSave: { fontSize: 15, fontWeight: "700" },
  editSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 6,
  },
  editFieldError: { fontSize: 12, color: "#ef4444", marginTop: 3 },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 8,
  },
  editField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editFieldRow: { flexDirection: "row", gap: 10 },
  editFieldHalf: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  restockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  restockInfo: { flex: 1, gap: 1 },
  restockMeta: {
    fontSize: 11,
    fontWeight: "600",
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
  restockBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  restockBtnText: { fontSize: 12, fontWeight: "500" },
  periodSection: { marginBottom: 4 },
  periodLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: "600",
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
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16 },
});
