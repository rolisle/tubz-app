import { memo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { TimePickerModal } from "@/components/ui/time-picker-modal";
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
  onTimeSave: (day: WeekDay, field: "open" | "close", value: string) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}

type PickerTarget = { day: WeekDay; field: "open" | "close" } | null;

export const OpeningHoursModal = memo(function OpeningHoursModal({
  visible,
  onClose,
  openingHours,
  timeInputs,
  onChangeTimeInput,
  onToggleDay,
  onTimeBlur,
  onTimeSave,
  colors,
  accent,
}: OpeningHoursModalProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const handlePickerConfirm = (time: string) => {
    if (!pickerTarget) return;
    const { day, field } = pickerTarget;
    onTimeSave(day, field, time);
    setPickerTarget(null);
  };

  return (
    <SlideModal animation="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.fsModalSafe, { backgroundColor: colors.background }]}
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
                style={[styles.hoursRow, { borderBottomColor: colors.border }]}
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
                    {(["open", "close"] as const).map((field, idx) => (
                      <View key={field} style={styles.timeFieldWrap}>
                        {idx === 1 && (
                          <Text
                            style={[
                              styles.hoursDash,
                              { color: colors.subtext },
                            ]}
                          >
                            –
                          </Text>
                        )}
                        {Platform.OS === "web" ? (
                          <TextInput
                            style={[
                              styles.hoursTimeInput,
                              {
                                color: colors.text,
                                borderColor:
                                  focusedField === `${day}_${field}`
                                    ? accent
                                    : colors.border,
                                backgroundColor: colors.background,
                              },
                            ]}
                            value={timeInputs[day][field]}
                            onChangeText={(v) =>
                              onChangeTimeInput(day, field, v)
                            }
                            onFocus={() => setFocusedField(`${day}_${field}`)}
                            onBlur={() => {
                              setFocusedField(null);
                              onTimeBlur(day, field);
                            }}
                            placeholder={field === "open" ? "09:00" : "17:00"}
                            placeholderTextColor={colors.subtext}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                            returnKeyType={field === "open" ? "next" : "done"}
                            selectionColor={`${accent}44`}
                            cursorColor={accent}
                            autoCorrect={false}
                          />
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.hoursTimeBtn,
                              {
                                borderColor: colors.border,
                                backgroundColor: colors.card,
                              },
                            ]}
                            onPress={() => setPickerTarget({ day, field })}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.hoursTimeBtnText,
                                { color: colors.text },
                              ]}
                            >
                              {timeInputs[day][field]}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.hoursClosed, { color: colors.subtext }]}>
                    Closed
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {pickerTarget && (
        <TimePickerModal
          visible
          value={timeInputs[pickerTarget.day][pickerTarget.field]}
          label={
            pickerTarget.field === "open" ? "Opening Time" : "Closing Time"
          }
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerTarget(null)}
          colors={colors}
          accent={accent}
        />
      )}
    </SlideModal>
  );
});

const styles = StyleSheet.create({
  fsModalSafe: { flex: 1 },
  hoursModalContent: { paddingHorizontal: 20, paddingBottom: 40 },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hoursDay: { fontSize: 14, fontWeight: "600", width: 36 },
  hoursTimes: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeFieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Native: tappable pill button
  hoursTimeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 62,
    alignItems: "center",
  },
  hoursTimeBtnText: { fontSize: 15, fontWeight: "600", letterSpacing: 0.5 },
  // Web: plain text input
  hoursTimeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center",
    minWidth: 62,
  },
  hoursDash: { fontSize: 14 },
  hoursClosed: { flex: 1, fontSize: 13, fontStyle: "italic" },
});
