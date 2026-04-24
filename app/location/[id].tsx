import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HistoryEntryEditorModal } from "@/components/history-entry-editor-modal";
import { EditLocationModal } from "@/components/location/edit-location-modal";
import { HistoryModal } from "@/components/location/history-modal";
import { LocationHeader } from "@/components/location/location-header";
import { MachinesSection } from "@/components/location/machines-section";
import { OpeningHoursModal } from "@/components/location/opening-hours-modal";
import { SettingsMenuModal } from "@/components/location/settings-menu-modal";
import { RestockSessionModal } from "@/components/restock-session-modal";
import { DatePickerModal } from "@/components/ui/date-picker-modal";
import { GradView } from "@/components/ui/grad-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type {
  Machine,
  MachineType,
  RestockEntry,
  RestockMachineEntry,
  WeekDay,
} from "@/types";
import { confirm, confirmDelete } from "@/utils/confirm";
import {
  getOpenStatus,
  parseTimeInput,
  WEEK_DAYS,
} from "@/utils/opening-hours";

// UK postcode: AN NAA / ANN NAA / AAN NAA / AANN NAA / ANA NAA / AANA NAA
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LocationDetailScreen() {
  // Expo Router can yield string or string[] for a dynamic param — normalise
  // to a single string so downstream lookups never choke on an array.
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const {
    state,
    updateLocation,
    deleteLocation,
    restockLocation,
    editRestockEntry,
    deleteRestockEntry,
    addMachine,
    updateMachine,
    deleteMachine,
  } = useApp();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const MACHINE_COLORS = useMemo<Record<MachineType, string>>(
    () => ({
      sweet: primaryColor(settings.sweetColor),
      toy: primaryColor(settings.toyColor),
    }),
    [settings.sweetColor, settings.toyColor],
  );
  const router = useRouter();

  const location = useMemo(
    () => state.locations.find((l) => l.id === id),
    [state.locations, id],
  );

  // Edit location form state
  const [editForm, setEditForm] = useState({
    name: location?.name ?? "",
    address: location?.address ?? "",
    city: location?.city ?? "",
    postcode: location?.postcode ?? "",
  });
  const [notes, setNotes] = useState(location?.notes ?? "");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const accent = useMemo(
    () => primaryColor(settings.accentColor),
    [settings.accentColor],
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(
    location?.lastRestockedAt ? new Date(location.lastRestockedAt) : new Date(),
  );
  const [showHistory, setShowHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  const [showRestockSession, setShowRestockSession] = useState(false);
  // restockQtys: machineId → productId → quantity being restocked
  const [restockQtys, setRestockQtys] = useState<
    Record<string, Record<string, number>>
  >({});

  // Restock history editor
  const [editingEntry, setEditingEntry] = useState<{
    index: number;
    entry: RestockEntry;
  } | null>(null);
  const [editEntryDate, setEditEntryDate] = useState<Date>(new Date());
  const [editEntryQtys, setEditEntryQtys] = useState<
    Record<string, Record<string, number>>
  >({});
  const [showEditEntryDatePicker, setShowEditEntryDatePicker] = useState(false);

  // Opening hours — local time-input state so users can type freely
  const [timeInputs, setTimeInputs] = useState<
    Record<WeekDay, { open: string; close: string }>
  >(() => {
    const result = {} as Record<WeekDay, { open: string; close: string }>;
    WEEK_DAYS.forEach((day) => {
      result[day] = {
        open: location?.openingHours?.[day]?.open ?? "09:00",
        close: location?.openingHours?.[day]?.close ?? "17:00",
      };
    });
    return result;
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Reset local form fields whenever the location being viewed changes (e.g. after import)
  useEffect(() => {
    if (!location) return;
    setEditForm({
      name: location.name ?? "",
      address: location.address ?? "",
      city: location.city ?? "",
      postcode: location.postcode ?? "",
    });
    setNotes(location.notes ?? "");
    const inputs = {} as Record<WeekDay, { open: string; close: string }>;
    WEEK_DAYS.forEach((day) => {
      inputs[day] = {
        open: location.openingHours?.[day]?.open ?? "09:00",
        close: location.openingHours?.[day]?.close ?? "17:00",
      };
    });
    setTimeInputs(inputs);
  }, [location?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = () => {
    if (!location) return;
    setEditForm({
      name: location.name ?? "",
      address: location.address ?? "",
      city: location.city ?? "",
      postcode: location.postcode ?? "",
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const saveEdit = () => {
    if (!location) return;
    const errs: Record<string, string> = {};
    if (!editForm.name.trim()) errs.name = "Name is required.";
    if (!editForm.address.trim()) errs.address = "Address is required.";
    if (!editForm.city.trim()) errs.city = "City is required.";
    if (!editForm.postcode.trim()) {
      errs.postcode = "Postcode is required.";
    } else if (!UK_POSTCODE.test(editForm.postcode.trim())) {
      errs.postcode = "Enter a valid UK postcode.";
    }
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    updateLocation({
      ...location,
      name: editForm.name.trim(),
      address: editForm.address.trim(),
      city: editForm.city.trim(),
      postcode: editForm.postcode.trim().toUpperCase(),
    });
    setShowEditModal(false);
  };

  const cancelEdit = () => {
    setEditErrors({});
    setShowEditModal(false);
    setShowMenu(true);
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

  const openStatus = useMemo(
    () => getOpenStatus(location?.openingHours),
    [location?.openingHours],
  );

  const historyListData = useMemo(
    () =>
      [...(location?.restockHistory ?? [])]
        .map((e, i) => ({ entry: e, originalIndex: i }))
        .reverse(),
    [location?.restockHistory],
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
            <IconSymbol name="arrow.left" size={16} color={accent} />
            <Text style={{ color: accent }}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openRestockSession = () => {
    const qtys: Record<string, Record<string, number>> = {};
    location.machines.forEach((m) => {
      qtys[m.id] = {};
      const productIds = Array.from(
        new Set(m.slots.filter(Boolean) as string[]),
      );
      productIds.forEach((pid) => {
        qtys[m.id][pid] = 0;
      });
    });
    setRestockQtys(qtys);
    setShowRestockSession(true);
  };

  const completeRestockSession = () => {
    const machineEntries: RestockMachineEntry[] = location.machines
      .map((m) => ({
        machineId: m.id,
        machineType: m.type,
        products: Object.entries(restockQtys[m.id] ?? {})
          .filter(([, qty]) => qty > 0)
          .map(([productId, qty]) => ({ productId, qty })),
      }))
      .filter((me) => me.products.length > 0);
    restockLocation(location.id, machineEntries);
    setPickerDate(new Date());
    setShowRestockSession(false);
  };

  const openEditEntry = (originalIndex: number) => {
    const entry = location.restockHistory![originalIndex];
    const qtys: Record<string, Record<string, number>> = {};
    entry.machines.forEach((me) => {
      qtys[me.machineId] = {};
      me.products.forEach((p) => {
        qtys[me.machineId][p.productId] = p.qty;
      });
    });
    setEditingEntry({ index: originalIndex, entry });
    setEditEntryDate(new Date(entry.timestamp));
    setEditEntryQtys(qtys);
  };

  const saveEditEntry = () => {
    if (!editingEntry) return;
    const updated: RestockEntry = {
      timestamp: editEntryDate.toISOString(),
      machines: editingEntry.entry.machines
        .map((me) => ({
          ...me,
          products: me.products
            .map((p) => ({
              ...p,
              qty: editEntryQtys[me.machineId]?.[p.productId] ?? p.qty,
            }))
            .filter((p) => p.qty > 0),
        }))
        .filter((me) => me.products.length > 0),
    };
    editRestockEntry(location.id, editingEntry.index, updated);
    setEditingEntry(null);
    setShowHistory(true);
  };

  const handleDeleteEntry = async (originalIndex: number) => {
    const ok = await confirmDelete("entry", "This cannot be undone.");
    if (!ok) return;
    deleteRestockEntry(location.id, originalIndex);
    if (editingEntry?.index === originalIndex) setEditingEntry(null);
    setShowHistory(true);
  };

  const handleConfirmDate = (date: Date) => {
    updateLocation({ ...location, lastRestockedAt: date.toISOString() });
    setShowDatePicker(false);
  };

  const handleDeleteLocation = async () => {
    const ok = await confirmDelete(
      `"${location.name}"`,
      "This cannot be undone.",
    );
    if (!ok) {
      setShowMenu(true);
      return;
    }
    deleteLocation(location.id);
    router.back();
  };

  const handleAddMachine = (type: MachineType) => {
    addMachine(location.id, type);
  };

  const handleDeleteMachine = async (machineId: string) => {
    const ok = await confirm(
      "Remove Machine",
      "Remove this machine from the location?",
      { confirmLabel: "Remove", destructive: true },
    );
    if (ok) deleteMachine(location.id, machineId);
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
            <IconSymbol name="arrow.left" size={18} color={accent} />
            <Text style={[styles.backText, { color: accent }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            hitSlop={8}
            style={[
              styles.menuBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.menuBtnIcon, { color: accent }]}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LocationHeader
            location={location}
            openStatus={openStatus}
            colors={colors}
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Last restock row */}
          <View style={styles.restockRow}>
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
              <Text style={[styles.restockDate, { color: accent }]}>
                {location.lastRestockedAt
                  ? formatDate(location.lastRestockedAt)
                  : "Never"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.restockBtn,
                { backgroundColor: colors.card, borderColor: accent },
              ]}
              onPress={openRestockSession}
            >
              <Text style={[styles.restockBtnText, { color: accent }]}>
                ✓ Restock Now
              </Text>
            </TouchableOpacity>
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

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {(["sweet", "toy"] as const).map((type) => (
            <MachinesSection
              key={type}
              type={type}
              machines={location.machines.filter((m) => m.type === type)}
              products={state.products}
              typeColor={MACHINE_COLORS[type]}
              gradientColors={
                type === "sweet" ? settings.sweetColor : settings.toyColor
              }
              colors={colors}
              onAddMachine={handleAddMachine}
              onDeleteMachine={handleDeleteMachine}
              onUpdateMachine={handleMachineUpdate}
            />
          ))}

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

        <HistoryModal
          visible={showHistory}
          onClose={() => {
            setShowHistory(false);
            setShowMenu(true);
          }}
          rows={historyListData}
          totalEntries={location.restockHistory?.length ?? 0}
          products={state.products}
          onEditEntry={(originalIndex) => {
            setShowHistory(false);
            openEditEntry(originalIndex);
          }}
          colors={colors}
          accent={accent}
        />

        <EditLocationModal
          visible={showEditModal}
          onCancel={cancelEdit}
          onSave={saveEdit}
          form={editForm}
          onChangeForm={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
          errors={editErrors}
          onClearError={(field) =>
            setEditErrors((e) => ({ ...e, [field]: "" }))
          }
          colors={colors}
          accent={accent}
        />

        <SettingsMenuModal
          visible={showMenu}
          onClose={() => setShowMenu(false)}
          onEditAddress={() => {
            setShowMenu(false);
            openEdit();
          }}
          onEditOpeningHours={() => {
            setShowMenu(false);
            setShowOpeningHours(true);
          }}
          onViewHistory={() => {
            setShowMenu(false);
            setShowHistory(true);
          }}
          onDelete={() => {
            setShowMenu(false);
            handleDeleteLocation();
          }}
          historyCount={location.restockHistory?.length ?? 0}
          colors={colors}
          accent={accent}
        />

        <OpeningHoursModal
          visible={showOpeningHours}
          onClose={() => {
            setShowOpeningHours(false);
            setShowMenu(true);
          }}
          openingHours={location.openingHours ?? {}}
          timeInputs={timeInputs}
          onChangeTimeInput={(day, field, value) =>
            setTimeInputs((p) => ({
              ...p,
              [day]: { ...p[day], [field]: value },
            }))
          }
          onToggleDay={toggleDay}
          onTimeBlur={handleTimeBlur}
          colors={colors}
          accent={accent}
        />

        <HistoryEntryEditorModal
          editingEntry={editingEntry}
          onClose={() => {
            setEditingEntry(null);
            setShowHistory(true);
          }}
          onSave={saveEditEntry}
          onDelete={handleDeleteEntry}
          editEntryDate={editEntryDate}
          onDateChange={setEditEntryDate}
          editEntryQtys={editEntryQtys}
          onChangeQty={(machineId, productId, delta) => {
            setEditEntryQtys((prev) => {
              const current =
                prev[machineId]?.[productId] ??
                editingEntry?.entry.machines
                  .find((m) => m.machineId === machineId)
                  ?.products.find((p) => p.productId === productId)?.qty ??
                0;
              const max =
                editingEntry?.entry.machines.find(
                  (m) => m.machineId === machineId,
                )?.machineType === "toy"
                  ? 12
                  : 9;
              return {
                ...prev,
                [machineId]: {
                  ...prev[machineId],
                  [productId]: Math.min(max, Math.max(0, current + delta)),
                },
              };
            });
          }}
          showDatePicker={showEditEntryDatePicker}
          onShowDatePicker={setShowEditEntryDatePicker}
          machineColors={MACHINE_COLORS}
          machineColorSettings={{
            sweet: settings.sweetColor,
            toy: settings.toyColor,
          }}
          products={state.products}
          accent={accent}
          colors={colors}
        />

        <RestockSessionModal
          visible={showRestockSession}
          onClose={() => setShowRestockSession(false)}
          onComplete={completeRestockSession}
          locationName={location.name}
          machines={location.machines}
          products={state.products}
          machineColors={MACHINE_COLORS}
          machineColorSettings={{
            sweet: settings.sweetColor,
            toy: settings.toyColor,
          }}
          restockQtys={restockQtys}
          onChangeQty={(machineId, productId, delta) => {
            setRestockQtys((prev) => {
              const max =
                location.machines.find((m) => m.id === machineId)?.type ===
                "toy"
                  ? 12
                  : 9;
              const current = prev[machineId]?.[productId] ?? 0;
              return {
                ...prev,
                [machineId]: {
                  ...prev[machineId],
                  [productId]: Math.min(max, Math.max(0, current + delta)),
                },
              };
            });
          }}
          accent={accent}
          colors={colors}
        />
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
  restockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  restockInfo: { flex: 1, gap: 1, paddingHorizontal: 10 },
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
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16 },
});
