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
  RestockSessionReplacementLine,
  WeekDay,
} from "@/types";
import { confirm, confirmDelete } from "@/utils/confirm";
import { uid } from "@/utils/id";
import {
  getOpenStatus,
  parseTimeInput,
  WEEK_DAYS,
} from "@/utils/opening-hours";
import { applyReplacementNewStockProductEdits } from "@/utils/history-planogram-sync";

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

function cloneMachinesForRestockSession(machines: Machine[]): Machine[] {
  return machines.map((m) => ({
    ...m,
    slots: [...m.slots],
    stockCounts: { ...m.stockCounts },
  }));
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
  const [showHistory, setShowHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  const [showRestockSession, setShowRestockSession] = useState(false);
  // restockQtys: machineId → productId → quantity being restocked
  /** Draft machines while restock modal is open — cancel discards; Done persists to location. */
  const [restockSessionMachines, setRestockSessionMachines] = useState<
    Machine[] | null
  >(null);
  const [primarySlotCounts, setPrimarySlotCounts] = useState<
    Record<string, Record<string, number>>
  >({});
  const [replacementLines, setReplacementLines] = useState<
    Record<string, RestockSessionReplacementLine[]>
  >({});
  // restockQtys: machineId → productId → quantity (primary rows only)
  const [restockQtys, setRestockQtys] = useState<
    Record<string, Record<string, number>>
  >({});
  const [restockDone, setRestockDone] = useState<
    Record<string, Record<string, boolean>>
  >({});

  // Restock history editor
  const [editingEntry, setEditingEntry] = useState<{
    index: number;
    entry: RestockEntry;
  } | null>(null);
  const [editEntryDate, setEditEntryDate] = useState<Date>(new Date());
  const [editDraftMachines, setEditDraftMachines] = useState<
    RestockMachineEntry[]
  >([]);
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

  const handleTimeSave = (
    day: WeekDay,
    field: "open" | "close",
    value: string,
  ) => {
    if (!location?.openingHours?.[day]) return;
    const parsed = parseTimeInput(value);
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

  const replaceProductInRestockSession = useCallback(
    (machineId: string, oldProductId: string, newProductId: string) => {
      if (oldProductId === newProductId) return;
      setRestockSessionMachines((session) => {
        if (!session) return session;
        const machine = session.find((m) => m.id === machineId);
        if (!machine) return session;
        const slotIndex = machine.slots.findIndex((s) => s === oldProductId);
        if (slotIndex < 0) return session;

        const newSlots = [...machine.slots];
        newSlots[slotIndex] = newProductId;
        const newStockCounts = { ...machine.stockCounts };
        if (!newSlots.some((s) => s === oldProductId)) {
          delete newStockCounts[oldProductId];
        }
        const updatedMachine = {
          ...machine,
          slots: newSlots,
          stockCounts: newStockCounts,
        };
        const nextSession = session.map((m) =>
          m.id === machineId ? updatedMachine : m,
        );

        const capacityPerSlot = machine.type === "toy" ? 12 : 9;
        const oldSlotsAfter = newSlots.filter((s) => s === oldProductId).length;
        const maxOldAfter = oldSlotsAfter * capacityPerSlot;

        queueMicrotask(() => {
          setPrimarySlotCounts((prev) => {
            const pm = { ...(prev[machineId] ?? {}) };
            const c = pm[oldProductId] ?? 0;
            if (c <= 1) delete pm[oldProductId];
            else pm[oldProductId] = c - 1;
            return { ...prev, [machineId]: pm };
          });
          setReplacementLines((prev) => ({
            ...prev,
            [machineId]: [
              ...(prev[machineId] ?? []),
              {
                id: uid(),
                productId: newProductId,
                replacesProductId: oldProductId,
                qty: capacityPerSlot,
                done: false,
              },
            ],
          }));
          setRestockQtys((prev) => {
            const mq = { ...(prev[machineId] ?? {}) };
            const oldQ = mq[oldProductId] ?? 0;
            if (oldSlotsAfter === 0) {
              delete mq[oldProductId];
            } else {
              mq[oldProductId] = Math.min(maxOldAfter, oldQ);
            }
            return { ...prev, [machineId]: mq };
          });
          setRestockDone((prev) => {
            const md = { ...(prev[machineId] ?? {}) };
            if (oldSlotsAfter === 0) {
              delete md[oldProductId];
            } else {
              md[oldProductId] = false;
            }
            return { ...prev, [machineId]: md };
          });
        });

        return nextSession;
      });
    },
    [],
  );

  const closeRestockSession = useCallback(() => {
    setShowRestockSession(false);
    setRestockSessionMachines(null);
    setPrimarySlotCounts({});
    setReplacementLines({});
  }, []);

  const historyListData = useMemo(
    () =>
      [...(location?.restockHistory ?? [])]
        .map((e, i) => ({ entry: e, originalIndex: i }))
        .reverse(),
    [location?.restockHistory],
  );

  const changePrimaryLineProductInHistoryEdit = useCallback(
    (machineId: string, lineIndex: number, newProductId: string) => {
      setEditDraftMachines((prev) =>
        prev.map((me) => {
          if (me.machineId !== machineId) return me;
          const edited = me.products[lineIndex];
          if (!edited || edited.replacesProductId) return me;
          const oldPid = edited.productId;
          if (oldPid === newProductId) return me;
          const products = me.products.map((p, i) => {
            if (i === lineIndex) {
              return { ...p, productId: newProductId };
            }
            if (p.replacesProductId === oldPid) {
              return { ...p, replacesProductId: newProductId };
            }
            return p;
          });
          return { ...me, products };
        }),
      );
    },
    [],
  );

  const changeReplacementLineProductInHistoryEdit = useCallback(
    (machineId: string, lineIndex: number, newProductId: string) => {
      setEditDraftMachines((prev) =>
        prev.map((me) => {
          if (me.machineId !== machineId) return me;
          const products = me.products.map((p, i) => {
            if (i !== lineIndex) return p;
            if (!p.replacesProductId || p.productId === newProductId) return p;
            return { ...p, productId: newProductId };
          });
          return { ...me, products };
        }),
      );
    },
    [],
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
    const done: Record<string, Record<string, boolean>> = {};
    const primary: Record<string, Record<string, number>> = {};
    location.machines.forEach((m) => {
      qtys[m.id] = {};
      done[m.id] = {};
      primary[m.id] = {};
      for (const id of m.slots) {
        if (!id) continue;
        primary[m.id][id] = (primary[m.id][id] ?? 0) + 1;
      }
      Object.keys(primary[m.id]).forEach((pid) => {
        qtys[m.id][pid] = 0;
        done[m.id][pid] = false;
      });
    });
    setPrimarySlotCounts(primary);
    setReplacementLines({});
    setRestockSessionMachines(cloneMachinesForRestockSession(location.machines));
    setRestockQtys(qtys);
    setRestockDone(done);
    setShowRestockSession(true);
  };

  const completeRestockSession = () => {
    if (!restockSessionMachines) return;
    const machineEntries: RestockMachineEntry[] = restockSessionMachines
      .map((m) => {
        const products: RestockMachineEntry["products"] = [];
        const pmap = primarySlotCounts[m.id] ?? {};
        for (const [productId, slots] of Object.entries(pmap)) {
          if ((slots ?? 0) <= 0) continue;
          const qty = restockQtys[m.id]?.[productId] ?? 0;
          if (qty > 0) products.push({ productId, qty });
        }
        for (const line of replacementLines[m.id] ?? []) {
          if (line.qty > 0) {
            products.push({
              productId: line.productId,
              qty: line.qty,
              replacesProductId: line.replacesProductId,
            });
          }
        }
        return {
          machineId: m.id,
          machineType: m.type,
          products,
        };
      })
      .filter((me) => me.products.length > 0);
    updateLocation({ ...location, machines: restockSessionMachines });
    if (machineEntries.length > 0) {
      restockLocation(location.id, machineEntries, undefined);
    }
    setRestockSessionMachines(null);
    setPrimarySlotCounts({});
    setReplacementLines({});
    setShowRestockSession(false);
  };

  const openEditEntry = (originalIndex: number) => {
    const entry = location.restockHistory![originalIndex];
    setEditingEntry({ index: originalIndex, entry });
    setEditEntryDate(new Date(entry.timestamp));
    setEditDraftMachines(
      entry.machines.map((me) => ({
        ...me,
        products: me.products.map((p) => ({ ...p })),
      })),
    );
  };

  const saveEditEntry = () => {
    if (!editingEntry) return;
    const hasLineReplacements = editDraftMachines.some((me) =>
      me.products.some((p) => p.replacesProductId),
    );
    const updated: RestockEntry = {
      timestamp: editEntryDate.toISOString(),
      machines: editDraftMachines
        .map((me) => ({
          ...me,
          products: me.products.filter((p) => p.qty > 0),
        }))
        .filter((me) => me.products.length > 0),
      ...(!hasLineReplacements &&
      (editingEntry.entry.productReplacements?.length ?? 0) > 0
        ? { productReplacements: editingEntry.entry.productReplacements }
        : {}),
    };
    const historyLen = location.restockHistory?.length ?? 0;
    const isLatestEntry =
      historyLen > 0 && editingEntry.index === historyLen - 1;

    let machinesPatch: Machine[] | undefined;
    if (isLatestEntry) {
      const { machines: nextMachines, changed } =
        applyReplacementNewStockProductEdits(
          location.machines,
          editingEntry.entry,
          updated.machines,
        );
      if (changed) machinesPatch = nextMachines;
    }

    editRestockEntry(
      location.id,
      editingEntry.index,
      updated,
      machinesPatch,
    );
    setEditingEntry(null);
    setEditDraftMachines([]);
    setShowHistory(true);
  };

  const handleDeleteEntry = async (originalIndex: number) => {
    const ok = await confirmDelete("entry", "This cannot be undone.");
    if (!ok) return;
    deleteRestockEntry(location.id, originalIndex);
    if (editingEntry?.index === originalIndex) {
      setEditingEntry(null);
      setEditDraftMachines([]);
    }
    setShowHistory(true);
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
                      restockPeriodAnchorAt: undefined,
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
                      updateLocation({
                        ...location,
                        restockPeriodWeeks: w,
                        ...(w === 1
                          ? {
                              restockPeriodAnchorAt: new Date().toISOString(),
                            }
                          : { restockPeriodAnchorAt: undefined }),
                      })
                    }
                    style={[
                      styles.periodPill,
                      w === 1 && styles.periodPillReminder,
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
                    {w === 1 ? (
                      active ? (
                        <>
                          <Text
                            style={[
                              styles.periodPillReminderLine,
                              { color: active ? "#fff" : colors.text },
                            ]}
                          >
                            1 week
                          </Text>
                          <Text
                            style={[
                              styles.periodPillReminderSub,
                              {
                                color: active ? "#ffffffbb" : colors.subtext,
                              },
                            ]}
                          >
                            due
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.periodPillReminderLine,
                              { color: colors.text },
                            ]}
                          >
                            Remind me
                          </Text>
                          <Text
                            style={[
                              styles.periodPillReminderSub,
                              { color: colors.subtext },
                            ]}
                          >
                            in 1 week
                          </Text>
                        </>
                      )
                    ) : (
                      <>
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
                          wks
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

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
          onTimeSave={handleTimeSave}
          colors={colors}
          accent={accent}
        />

        <HistoryEntryEditorModal
          editingEntry={editingEntry}
          onClose={() => {
            setEditingEntry(null);
            setEditDraftMachines([]);
            setShowHistory(true);
          }}
          onSave={saveEditEntry}
          onDelete={handleDeleteEntry}
          editEntryDate={editEntryDate}
          onDateChange={setEditEntryDate}
          draftMachines={editDraftMachines}
          onChangeLineQty={(machineId: string, lineIndex: number, delta: number) => {
            setEditDraftMachines((prev) =>
              prev.map((me) => {
                if (me.machineId !== machineId) return me;
                const layout = location.machines.find(
                  (m) => m.id === machineId,
                );
                const cap = me.machineType === "toy" ? 12 : 9;
                const slotCounts = new Map<string, number>();
                if (layout) {
                  for (const id of layout.slots) {
                    if (id) slotCounts.set(id, (slotCounts.get(id) ?? 0) + 1);
                  }
                }
                const products = me.products.map((p, i) => {
                  if (i !== lineIndex) return p;
                  let maxQty: number;
                  if (p.replacesProductId) {
                    maxQty = cap;
                  } else {
                    const onLayout = slotCounts.get(p.productId) ?? 0;
                    const virtualSlots =
                      onLayout > 0
                        ? onLayout
                        : Math.max(1, Math.ceil(p.qty / cap) || 1);
                    maxQty = virtualSlots * cap;
                  }
                  return {
                    ...p,
                    qty: Math.min(maxQty, Math.max(0, p.qty + delta)),
                  };
                });
                return { ...me, products };
              }),
            );
          }}
          layoutMachines={location.machines}
          legacyProductReplacements={editingEntry?.entry.productReplacements}
          onChangePrimaryLineProduct={changePrimaryLineProductInHistoryEdit}
          onChangeReplacementLineProduct={changeReplacementLineProductInHistoryEdit}
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
          onClose={closeRestockSession}
          onComplete={completeRestockSession}
          locationName={location.name}
          machines={restockSessionMachines ?? location.machines}
          products={state.products}
          machineColors={MACHINE_COLORS}
          machineColorSettings={{
            sweet: settings.sweetColor,
            toy: settings.toyColor,
          }}
          primarySlotCounts={primarySlotCounts}
          replacementLines={replacementLines}
          restockQtys={restockQtys}
          restockDone={restockDone}
          onChangeQty={(machineId, productId, delta) => {
            setRestockQtys((prev) => {
              const machine = (restockSessionMachines ?? location.machines).find(
                (m) => m.id === machineId,
              );
              const capacityPerSlot = machine?.type === "toy" ? 12 : 9;
              const slotCount = primarySlotCounts[machineId]?.[productId] ?? 0;
              const max = Math.max(1, slotCount) * capacityPerSlot;
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
          onToggleDone={(machineId, productId) => {
            setRestockDone((prev) => ({
              ...prev,
              [machineId]: {
                ...prev[machineId],
                [productId]: !prev[machineId]?.[productId],
              },
            }));
          }}
          onSnapQty={(machineId, productId) => {
            setRestockQtys((prev) => {
              const machine = (restockSessionMachines ?? location.machines).find(
                (m) => m.id === machineId,
              );
              const capacityPerSlot = machine?.type === "toy" ? 12 : 9;
              const slotCount = primarySlotCounts[machineId]?.[productId] ?? 0;
              const max = Math.max(1, slotCount) * capacityPerSlot;
              const current = prev[machineId]?.[productId] ?? 0;
              const next = current < max ? max : 0;
              return {
                ...prev,
                [machineId]: {
                  ...prev[machineId],
                  [productId]: next,
                },
              };
            });
          }}
          onChangeReplacementQty={(machineId, lineId, delta) => {
            setReplacementLines((prev) => {
              const lines = [...(prev[machineId] ?? [])];
              const idx = lines.findIndex((l) => l.id === lineId);
              if (idx < 0) return prev;
              const machine = (restockSessionMachines ?? location.machines).find(
                (m) => m.id === machineId,
              );
              const cap = machine?.type === "toy" ? 12 : 9;
              const current = lines[idx].qty;
              lines[idx] = {
                ...lines[idx],
                qty: Math.min(cap, Math.max(0, current + delta)),
              };
              return { ...prev, [machineId]: lines };
            });
          }}
          onToggleReplacementDone={(machineId, lineId) => {
            setReplacementLines((prev) => ({
              ...prev,
              [machineId]: (prev[machineId] ?? []).map((l) =>
                l.id === lineId ? { ...l, done: !l.done } : l,
              ),
            }));
          }}
          onSnapReplacementQty={(machineId, lineId) => {
            setReplacementLines((prev) => {
              const lines = [...(prev[machineId] ?? [])];
              const idx = lines.findIndex((l) => l.id === lineId);
              if (idx < 0) return prev;
              const machine = (restockSessionMachines ?? location.machines).find(
                (m) => m.id === machineId,
              );
              const cap = machine?.type === "toy" ? 12 : 9;
              const current = lines[idx].qty;
              lines[idx] = {
                ...lines[idx],
                qty: current < cap ? cap : 0,
              };
              return { ...prev, [machineId]: lines };
            });
          }}
          onReplaceProduct={replaceProductInRestockSession}
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
  periodPillReminder: {
    minWidth: 102,
    paddingHorizontal: 12,
  },
  periodPillReminderLine: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
    textAlign: "center",
  },
  periodPillReminderSub: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    lineHeight: 12,
    textAlign: "center",
  },
  periodPillNum: { fontSize: 15, fontWeight: "700", lineHeight: 18 },
  periodPillUnit: { fontSize: 10, fontWeight: "500", letterSpacing: 0.2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16 },
});
