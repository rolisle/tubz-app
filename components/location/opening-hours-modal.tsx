import { memo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";
import type { WeekDay } from "@/types";
import { DAY_LABELS, WEEK_DAYS } from "@/utils/opening-hours";

type TimeInputs = Record<WeekDay, { open: string; close: string }>;

export interface OpeningHoursModalProps {
  visible: boolean;
  onClose: () => void;
  openingHours: Partial<Record<WeekDay, { open: string; close: string }>>;
  timeInputs: TimeInputs;
  onChangeTimeInput: (
    day: WeekDay,
    field: "open" | "close",
    value: string,
  ) => void;
  onToggleDay: (day: WeekDay, enabled: boolean) => void;
  onTimeBlur: (day: WeekDay, field: "open" | "close") => void;
  colors: (typeof Colors)["light"];
  accent: string;
}

export const OpeningHoursModal = memo(function OpeningHoursModal({
  visible,
  onClose,
  openingHours,
  timeInputs,
  onChangeTimeInput,
  onToggleDay,
  onTimeBlur,
  colors,
  accent,
}: OpeningHoursModalProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  return (
    <SlideModal animation="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.fsModalSafe, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FsModalNavbar
            title="Opening Hours"
            colors={colors}
            accent={accent}
            left={{ label: "‹ Back", tone: "accent", onPress: onClose }}
          />
          <ScrollView
            contentContainerStyle={styles.hoursModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {WEEK_DAYS.map((day) => {
              const isEnabled = !!openingHours?.[day];
              return (
                <View
                  key={day}
                  style={[
                    styles.hoursRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.hoursDay, { color: colors.text }]}>
                    {DAY_LABELS[day]}
                  </Text>
                  <Switch
                    value={isEnabled}
                    onValueChange={(v) => onToggleDay(day, v)}
                    trackColor={{ true: accent, false: colors.border }}
                    thumbColor="#fff"
                  />
                  {isEnabled ? (
                    <View style={styles.hoursTimes}>
                      <TextInput
                        style={[
                          styles.hoursTimeInput,
                          {
                            color: colors.text,
                            borderColor:
                              focusedField === `${day}_open`
                                ? accent
                                : colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                        value={timeInputs[day].open}
                        onChangeText={(v) => onChangeTimeInput(day, "open", v)}
                        onFocus={() => setFocusedField(`${day}_open`)}
                        onBlur={() => {
                          setFocusedField(null);
                          onTimeBlur(day, "open");
                        }}
                        placeholder="09:00"
                        placeholderTextColor={colors.subtext}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        returnKeyType="next"
                        selectionColor={`${accent}44`}
                        cursorColor={accent}
                        autoCorrect={false}
                      />
                      <Text
                        style={[styles.hoursDash, { color: colors.subtext }]}
                      >
                        –
                      </Text>
                      <TextInput
                        style={[
                          styles.hoursTimeInput,
                          {
                            color: colors.text,
                            borderColor:
                              focusedField === `${day}_close`
                                ? accent
                                : colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                        value={timeInputs[day].close}
                        onChangeText={(v) =>
                          onChangeTimeInput(day, "close", v)
                        }
                        onFocus={() => setFocusedField(`${day}_close`)}
                        onBlur={() => {
                          setFocusedField(null);
                          onTimeBlur(day, "close");
                        }}
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
                    <Text
                      style={[styles.hoursClosed, { color: colors.subtext }]}
                    >
                      Closed
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SlideModal>
  );
});

const styles = StyleSheet.create({
  fsModalSafe: { flex: 1 },
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
});
