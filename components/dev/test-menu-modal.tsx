import { memo, useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CrashLogModal } from "@/components/dev/crash-log-modal";
import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";
import { type CrashEntry, clearLogs, getLogs } from "@/utils/crash-log";
import { scheduleLocationNotification } from "@/utils/notifications";

export interface TestMenuModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)["light"];
  accent: string;
  onAlert: (title: string, message?: string) => void;
}

export const TestMenuModal = memo(function TestMenuModal({
  visible,
  onClose,
  colors,
  accent,
  onAlert,
}: TestMenuModalProps) {
  const [crashLogs, setCrashLogs] = useState<CrashEntry[]>([]);
  const [showCrashLog, setShowCrashLog] = useState(false);

  useEffect(() => {
    if (visible) getLogs().then(setCrashLogs);
  }, [visible]);

  const testNotificationNow = useCallback(async () => {
    if (Platform.OS === "web") {
      onAlert("Not supported", "Push notifications are not available on web.");
      return;
    }
    const testDue = new Date(Date.now() + 10_000);
    const testLastRestocked = new Date(
      testDue.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    await scheduleLocationNotification({
      id: "test-now",
      name: "Test Location",
      address: "1 Test Street",
      city: "Testville",
      postcode: "TE1 1ST",
      createdAt: new Date().toISOString(),
      lastRestockedAt: testLastRestocked.toISOString(),
      restockPeriodWeeks: 1,
      machines: [],
    });
    onClose();
    onAlert(
      "Test notification scheduled",
      "A 'Restock Due' notification will fire in ~10 seconds. Background or lock the screen now to see it.",
    );
  }, [onAlert, onClose]);

  const testNotificationDueToday = useCallback(async () => {
    if (Platform.OS === "web") {
      onAlert("Not supported", "Push notifications are not available on web.");
      return;
    }
    const now = new Date();
    const dueToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      0,
    );
    const lastRestocked = new Date(dueToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    await scheduleLocationNotification({
      id: "test-today",
      name: "Test Location (Due Today)",
      address: "",
      city: "",
      postcode: "",
      createdAt: new Date().toISOString(),
      lastRestockedAt: lastRestocked.toISOString(),
      restockPeriodWeeks: 1,
      machines: [],
    });
    onClose();
    onAlert(
      "Scheduled: due today",
      "Notification fires at end of today. Background the app tonight to see it.",
    );
  }, [onAlert, onClose]);

  const handleClearLogs = useCallback(async () => {
    await clearLogs();
    setCrashLogs([]);
  }, []);

  return (
    <>
      <SlideModal animation="fade" visible={visible} onRequestClose={onClose}>
        <SafeAreaView
          style={[styles.safe, { backgroundColor: colors.background }]}
        >
          <FsModalNavbar
            title="🧪 Test Menu"
            colors={colors}
            accent={accent}
            left={{ label: "‹ Back", tone: "accent", onPress: onClose }}
          />
          <ScrollView contentContainerStyle={styles.list}>
            <Text style={[styles.section, { color: colors.subtext }]}>
              NOTIFICATIONS
            </Text>
            <TouchableOpacity
              style={[
                styles.item,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={testNotificationNow}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>📦</Text>
              <View style={styles.text}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Fire restock notification (~3s)
                </Text>
                <Text style={[styles.sub, { color: colors.subtext }]}>
                  Fires a &ldquo;Restock Due&rdquo; notification in ~10 seconds.
                  Background or lock the screen, then wait.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.item,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={testNotificationDueToday}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>📅</Text>
              <View style={styles.text}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Schedule &ldquo;Due today&rdquo; notification
                </Text>
                <Text style={[styles.sub, { color: colors.subtext }]}>
                  Schedules a notification for end of today (23:59). Good for
                  testing the due-date trigger.
                </Text>
              </View>
            </TouchableOpacity>

            <Text
              style={[
                styles.section,
                { color: colors.subtext, marginTop: 24 },
              ]}
            >
              CRASH LOG
            </Text>

            <View
              style={[
                styles.item,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.icon}>🪲</Text>
              <View style={styles.text}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {crashLogs.length === 0
                    ? "No entries"
                    : `${crashLogs.length} entr${crashLogs.length === 1 ? "y" : "ies"}`}
                </Text>
                <Text style={[styles.sub, { color: colors.subtext }]}>
                  Errors and console.error calls captured since install.
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {crashLogs.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowCrashLog(true)}
                    style={[
                      styles.logBtn,
                      {
                        borderColor: accent,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text style={[styles.logBtnText, { color: accent }]}>
                      View
                    </Text>
                  </TouchableOpacity>
                )}
                {crashLogs.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearLogs}
                    style={[
                      styles.logBtn,
                      {
                        borderColor: colors.danger,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.logBtnText, { color: colors.danger }]}
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text
              style={[
                styles.section,
                { color: colors.subtext, marginTop: 24 },
              ]}
            >
              INFO
            </Text>
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoText, { color: colors.subtext }]}>
                This menu is temporary and for development/testing only. Remove
                the 🧪 button from the dashboard header once testing is
                complete.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SlideModal>

      <CrashLogModal
        visible={showCrashLog}
        onClose={() => setShowCrashLog(false)}
        onClear={handleClearLogs}
        logs={crashLogs}
        colors={colors}
        accent={accent}
      />
    </>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 20, gap: 10 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  icon: { fontSize: 22, lineHeight: 28 },
  text: { flex: 1, gap: 4 },
  label: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, lineHeight: 17 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 18 },
  logBtn: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
  },
  logBtnText: { fontSize: 12, fontWeight: "600" },
});
