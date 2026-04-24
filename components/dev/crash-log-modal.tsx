import { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";
import type { CrashEntry } from "@/utils/crash-log";

export interface CrashLogModalProps {
  visible: boolean;
  onClose: () => void;
  onClear: () => void;
  logs: CrashEntry[];
  colors: (typeof Colors)["light"];
  accent: string;
}

export const CrashLogModal = memo(function CrashLogModal({
  visible,
  onClose,
  onClear,
  logs,
  colors,
  accent,
}: CrashLogModalProps) {
  return (
    <SlideModal animation="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <FsModalNavbar
          title="🪲 Crash Log"
          colors={colors}
          accent={accent}
          left={{ label: "‹ Back", tone: "accent", onPress: onClose }}
          right={{ label: "Clear", tone: "danger", onPress: onClear }}
        />
        <ScrollView contentContainerStyle={styles.logList}>
          {logs.length === 0 ? (
            <Text style={[styles.logEmpty, { color: colors.subtext }]}>
              No entries yet.
            </Text>
          ) : (
            logs.map((entry) => {
              const levelColor =
                entry.level === "fatal"
                  ? "#ef4444"
                  : entry.level === "error"
                    ? "#f97316"
                    : "#f59e0b";
              const ts = new Date(entry.timestamp).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.logEntry,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderLeftColor: levelColor,
                    },
                  ]}
                >
                  <View style={styles.logEntryHeader}>
                    <Text style={[styles.logLevel, { color: levelColor }]}>
                      {entry.level.toUpperCase()}
                    </Text>
                    <Text style={[styles.logTs, { color: colors.subtext }]}>
                      {ts}
                    </Text>
                  </View>
                  <Text
                    style={[styles.logMessage, { color: colors.text }]}
                    selectable
                  >
                    {entry.message}
                  </Text>
                  {entry.stack ? (
                    <Text
                      style={[styles.logStack, { color: colors.subtext }]}
                      selectable
                      numberOfLines={6}
                    >
                      {entry.stack}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </SlideModal>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  logList: { padding: 16, gap: 10 },
  logEmpty: { textAlign: "center", paddingTop: 40, fontSize: 14 },
  logEntry: {
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    gap: 6,
  },
  logEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logLevel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  logTs: { fontSize: 10 },
  logMessage: { fontSize: 13, lineHeight: 18 },
  logStack: { fontSize: 10, lineHeight: 14, fontFamily: "monospace" },
});
