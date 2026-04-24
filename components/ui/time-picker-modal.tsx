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

interface TimePickerModalProps {
  visible: boolean;
  /** Current time as "HH:MM" */
  value: string;
  label?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  colors: (typeof Colors)["light"];
  accent: string;
}

const MINUTE_STEP = 5;

function parseHM(value: string): [number, number] {
  const [h, m] = value.split(":").map(Number);
  const hour = isNaN(h) ? 9 : Math.min(Math.max(h, 0), 23);
  const minute = isNaN(m) ? 0 : Math.round(m / MINUTE_STEP) * MINUTE_STEP;
  return [hour, Math.min(minute, 55)];
}

function NativeTimePicker({
  value,
  onChange,
  colors,
  accent,
}: {
  value: string;
  onChange: (t: string) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}) {
  const [h0, m0] = parseHM(value);
  const [hour, setHour] = useState(h0);
  const [minute, setMinute] = useState(m0);

  const emit = (h: number, m: number) => {
    onChange(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  };

  const incHour = () => {
    const next = (hour + 1) % 24;
    setHour(next);
    emit(next, minute);
  };
  const decHour = () => {
    const next = (hour - 1 + 24) % 24;
    setHour(next);
    emit(next, minute);
  };
  const incMinute = () => {
    const next = (minute + MINUTE_STEP) % 60;
    setMinute(next);
    emit(hour, next);
  };
  const decMinute = () => {
    const next = (minute - MINUTE_STEP + 60) % 60;
    setMinute(next);
    emit(hour, next);
  };

  const col = (
    label: string,
    display: string,
    onDec: () => void,
    onInc: () => void,
  ) => (
    <View style={styles.col}>
      <TouchableOpacity onPress={onInc} hitSlop={12} style={styles.arrow}>
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
        <Text style={[styles.colValue, { color: colors.text }]}>
          {display}
        </Text>
      </View>
      <TouchableOpacity onPress={onDec} hitSlop={12} style={styles.arrow}>
        <Text style={[styles.arrowText, { color: accent }]}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.picker}>
      {col("Hour", String(hour).padStart(2, "0"), decHour, incHour)}
      <Text style={[styles.colon, { color: colors.text }]}>:</Text>
      {col(
        "Min",
        String(minute).padStart(2, "0"),
        decMinute,
        incMinute,
      )}
    </View>
  );
}

function WebTimePicker({
  value,
  onChange,
  colors,
  accent,
}: {
  value: string;
  onChange: (t: string) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}) {
  const [focused, setFocused] = useState(false);
  return React.createElement("input", {
    type: "time",
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) onChange(e.target.value);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      fontSize: 24,
      padding: "16px",
      margin: "16px",
      borderRadius: 10,
      border: `1.5px solid ${focused ? accent : colors.border}`,
      backgroundColor: colors.background,
      color: colors.text,
      width: "calc(100% - 32px)",
      boxSizing: "border-box",
      display: "block",
      accentColor: accent,
      outline: focused ? `2px solid ${accent}` : "none",
      outlineOffset: 2,
    } as React.CSSProperties,
  });
}

export function TimePickerModal({
  visible,
  value,
  label,
  onConfirm,
  onCancel,
  colors,
  accent,
}: TimePickerModalProps) {
  const [draft, setDraft] = useState(value);

  const handleShow = () => setDraft(value);
  const handleConfirm = () => onConfirm(draft);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onShow={handleShow}
    >
      <Pressable style={styles.overlay} onPress={onCancel} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={[styles.cancel, { color: colors.danger }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {label ?? "Set Time"}
          </Text>
          <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
            <Text style={[styles.done, { color: accent }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === "web" ? (
          <WebTimePicker
            value={draft}
            onChange={setDraft}
            colors={colors}
            accent={accent}
          />
        ) : (
          <NativeTimePicker
            key={`${visible}-${value}`}
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
  picker: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  colon: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  col: { flex: 1, alignItems: "center", gap: 6 },
  arrow: { padding: 6 },
  arrowText: { fontSize: 18 },
  valueBox: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  colLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colValue: { fontSize: 26, fontWeight: "700" },
});
