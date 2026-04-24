import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

/** Arrow-based date selector — no native dependencies */
function NativeDatePicker({
  value,
  onChange,
  colors,
  accent,
}: {
  value: Date;
  onChange: (d: Date) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}) {
  const [day, setDay] = useState(value.getDate());
  const [month, setMonth] = useState(value.getMonth());
  const [year, setYear] = useState(value.getFullYear());

  const maxDay = daysInMonth(month, year);
  const maxYear = new Date().getFullYear();

  const update = (d: number, m: number, y: number) => {
    const safeDay = clamp(d, 1, daysInMonth(m, y));
    setDay(safeDay);
    setMonth(m);
    setYear(y);
    onChange(new Date(y, m, safeDay));
  };

  const col = (
    label: string,
    value: string,
    onDec: () => void,
    onInc: () => void,
  ) => (
    <View style={styles.col}>
      <TouchableOpacity onPress={onInc} hitSlop={8} style={styles.arrow}>
        <Text style={[styles.arrowText, { color: accent }]}>▲</Text>
      </TouchableOpacity>
      <View
        style={[
          styles.valueBox,
          { borderColor: accent, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.colLabel, { color: colors.subtext }]}>
          {label}
        </Text>
        <Text style={[styles.colValue, { color: colors.text }]}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onDec} hitSlop={8} style={styles.arrow}>
        <Text style={[styles.arrowText, { color: accent }]}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.nativePicker}>
      {col(
        "Month",
        MONTHS[month].slice(0, 3),
        () => update(day, (month - 1 + 12) % 12, year),
        () => update(day, (month + 1) % 12, year),
      )}
      {col(
        "Day",
        String(day).padStart(2, "0"),
        () => update(day - 1 < 1 ? maxDay : day - 1, month, year),
        () => update(day + 1 > maxDay ? 1 : day + 1, month, year),
      )}
      {col(
        "Year",
        String(year),
        () => update(day, month, clamp(year - 1, 2000, maxYear)),
        () => update(day, month, clamp(year + 1, 2000, maxYear)),
      )}
    </View>
  );
}

/** Web-only: native <input type="date"> via createElement */
function WebDatePicker({
  value,
  onChange,
  colors,
  accent,
}: {
  value: Date;
  onChange: (d: Date) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}) {
  const [focused, setFocused] = useState(false);
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const maxIso = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  return React.createElement("input", {
    type: "date",
    value: iso,
    max: maxIso,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const d = new Date(e.target.value);
      if (!isNaN(d.getTime())) onChange(d);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      fontSize: 18,
      padding: 16,
      margin: "16px 16px 8px",
      borderRadius: 10,
      border: `1.5px solid ${focused ? accent : colors.border}`,
      backgroundColor: colors.background,
      color: colors.text,
      width: "calc(100% - 32px)",
      boxSizing: "border-box",
      display: "block",
      accentColor: accent,
      caretColor: accent,
      outline: focused ? `2px solid ${accent}` : "none",
      outlineOffset: 2,
    } as React.CSSProperties,
  });
}

export function DatePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: DatePickerModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const [draft, setDraft] = useState<Date>(value);

  // Reset draft when modal opens with a new value
  const handleOpen = () => setDraft(value);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onShow={handleOpen}
    >
      <Pressable style={styles.overlay} onPress={onCancel} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={[styles.cancel, { color: colors.danger }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Set Restock Date
          </Text>
          <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={8}>
            <Text style={[styles.done, { color: accent }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Picker body — keyed on the incoming value so the native wheel
            state re-initialises each time the modal is reopened with a
            different date. */}
        {Platform.OS === "web" ? (
          <WebDatePicker
            value={draft}
            onChange={setDraft}
            colors={colors}
            accent={accent}
          />
        ) : (
          <NativeDatePicker
            key={value.getTime()}
            value={draft}
            onChange={setDraft}
            colors={colors}
            accent={accent}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontSize: 16, fontWeight: "600" },
  cancel: { fontSize: 15 },
  done: { fontSize: 15, fontWeight: "700" },
  // Native picker
  nativePicker: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  arrow: {
    padding: 6,
  },
  arrowText: {
    fontSize: 16,
  },
  valueBox: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  colLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colValue: {
    fontSize: 20,
    fontWeight: "700",
  },
});
