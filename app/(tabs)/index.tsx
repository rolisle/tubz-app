import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingsModal } from "@/components/settings-modal";
import { SlideModal } from "@/components/ui/slide-modal";
import { GradView } from "@/components/ui/grad-view";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import { primaryColor, useSettings } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { type CrashEntry, clearLogs, getLogs } from "@/utils/crash-log";
import { scheduleLocationNotification } from "@/utils/notifications";

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Returns { dueDate, daysUntil } for a location that has a restock period set */
function restockDue(loc: {
  lastRestockedAt: string | null;
  restockPeriodWeeks?: number;
}) {
  if (!loc.restockPeriodWeeks) return null;
  if (!loc.lastRestockedAt) return { dueDate: null, daysUntil: null };
  const due = new Date(loc.lastRestockedAt);
  due.setDate(due.getDate() + loc.restockPeriodWeeks * 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const daysUntil = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return { dueDate: due, daysUntil };
}

function dueLabel(daysUntil: number | null): string {
  if (daysUntil === null) return "Never restocked";
  if (daysUntil < 0) return `Overdue by ${Math.abs(daysUntil)}d`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  if (daysUntil <= 7) return `Due in ${daysUntil}d`;
  const weeks = Math.floor(daysUntil / 7);
  const days = daysUntil % 7;
  return days > 0 ? `Due in ${weeks}w ${days}d` : `Due in ${weeks}w`;
}

function dueColor(daysUntil: number | null): string {
  if (daysUntil === null) return "#94a3b8";
  if (daysUntil < 0) return "#ef4444";
  if (daysUntil <= 3) return "#f59e0b";
  return "#22c55e";
}

/* ─── Stat card ──────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: number | string;
  colors: (typeof Colors)["light"];
}

function StatCard({ label, value, colors }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.subtext }]}>{label}</Text>
    </View>
  );
}

/* ─── Main screen ────────────────────────────────────────────── */

export default function DashboardScreen() {
  const { state } = useApp();
  const { settings } = useSettings();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showTestMenu, setShowTestMenu] = useState(false);
  const [crashLogs, setCrashLogs] = useState<CrashEntry[]>([]);
  const [showCrashLog, setShowCrashLog] = useState(false);
  const accent = primaryColor(settings.accentColor);

  // Reload crash logs every time the test menu opens
  useEffect(() => {
    if (showTestMenu) {
      getLogs().then(setCrashLogs);
    }
  }, [showTestMenu]);

  const stats = useMemo(
    () => ({
      totalLocations: state.locations.length,
      totalMachines: state.locations.reduce((s, l) => s + l.machines.length, 0),
      totalProducts: state.products.length,
    }),
    [state.locations, state.products],
  );

  const upcomingRestocks = useMemo(() => {
    // Only show locations that have a restock period set
    const scheduled = state.locations.filter((l) => l.restockPeriodWeeks);
    // Split into: has been restocked (sort by due date asc) and never restocked (append at end)
    const withDue = scheduled
      .filter((l) => l.lastRestockedAt)
      .map((l) => ({ loc: l, info: restockDue(l)! }))
      .sort((a, b) => a.info.daysUntil! - b.info.daysUntil!);
    const neverRestocked = scheduled
      .filter((l) => !l.lastRestockedAt)
      .map((l) => ({ loc: l, info: { dueDate: null, daysUntil: null } }));
    return [...withDue, ...neverRestocked];
  }, [state.locations]);

  const recentRestocks = useMemo(
    () =>
      state.locations
        .filter((l) => l.lastRestockedAt)
        .sort(
          (a, b) =>
            new Date(b.lastRestockedAt!).getTime() -
            new Date(a.lastRestockedAt!).getTime(),
        )
        .slice(0, 8),
    [state.locations],
  );

  const navigateTo = useCallback(
    (id: string) => router.push({ pathname: "/location/[id]", params: { id } }),
    [router],
  );

  const today = useMemo(() => todayLabel(), []);

  // ── Test helpers ─────────────────────────────────────────────
  const testNotificationNow = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Push notifications are not available on web.");
      return;
    }
    const fakeLocation = {
      id: "__test__",
      name: "Test Location",
      address: "1 Test Street",
      city: "Testville",
      postcode: "TE1 1ST",
      createdAt: new Date().toISOString(),
      lastRestockedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      restockPeriodWeeks: 1,
      machines: [],
    };
    // Due = now + 10s. The "7 days before" trigger is in the past, so
    // scheduleLocationNotification will set triggerAt = due = now + 10s.
    const testDue = new Date(Date.now() + 10_000);
    const testLastRestocked = new Date(testDue.getTime() - 7 * 24 * 60 * 60 * 1000);
    await scheduleLocationNotification({
      ...fakeLocation,
      lastRestockedAt: testLastRestocked.toISOString(),
      restockPeriodWeeks: 1,
    });
    setShowTestMenu(false);
    Alert.alert(
      "Test notification scheduled",
      "A 'Restock Due' notification will fire in ~10 seconds. Background or lock the screen now to see it.",
    );
  }, []);

  const testNotificationDueToday = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Push notifications are not available on web.");
      return;
    }
    // Due date = today (daysUntil = 0), so it should fire immediately as a "due today" alert
    const now = new Date();
    const dueToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
    const lastRestocked = new Date(dueToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    await scheduleLocationNotification({
      id: "__test_today__",
      name: "Test Location (Due Today)",
      address: "",
      city: "",
      postcode: "",
      createdAt: new Date().toISOString(),
      lastRestockedAt: lastRestocked.toISOString(),
      restockPeriodWeeks: 1,
      machines: [],
    });
    setShowTestMenu(false);
    Alert.alert(
      "Scheduled: due today",
      "Notification fires at end of today. Background the app tonight to see it.",
    );
  }, []);

  const handleClearLogs = useCallback(async () => {
    await clearLogs();
    setCrashLogs([]);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.wordmark, { color: colors.text }]}>
              Dashboard
            </Text>
            <Text style={[styles.date, { color: colors.subtext }]}>
              {today}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowTestMenu(true)}
              hitSlop={8}
              style={[
                styles.settingsBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.settingsIcon}>🧪</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              hitSlop={8}
              style={[
                styles.settingsBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Locations"
            value={stats.totalLocations}
            colors={colors}
          />
          <StatCard
            label="Machines"
            value={stats.totalMachines}
            colors={colors}
          />
          <StatCard
            label="Products"
            value={stats.totalProducts}
            colors={colors}
          />
        </View>

        {/* Upcoming restocks */}
        {upcomingRestocks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Upcoming Restocks
            </Text>
            {upcomingRestocks.map(({ loc, info }) => {
              const color = dueColor(info.daysUntil);
              const label = dueLabel(info.daysUntil);
              return (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => navigateTo(loc.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.upcomingCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.upcomingStripe,
                        { backgroundColor: color },
                      ]}
                    />
                    <View style={styles.upcomingBody}>
                      <Text
                        style={[styles.upcomingName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {loc.name}
                      </Text>
                      <Text
                        style={[styles.upcomingAddr, { color: colors.subtext }]}
                        numberOfLines={1}
                      >
                        {[loc.city, loc.postcode].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <View style={styles.upcomingRight}>
                      <Text style={[styles.upcomingDue, { color }]}>
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.upcomingPeriod,
                          { color: colors.subtext },
                        ]}
                      >
                        Every {loc.restockPeriodWeeks}w
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent restocks */}
        {recentRestocks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Restocks
            </Text>
            {recentRestocks.map((loc) => {
              const date = new Date(loc.lastRestockedAt!);
              const dateStr = date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <TouchableOpacity
                  key={loc.id}
                  onPress={() => navigateTo(loc.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.recentCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.upcomingBody}>
                      <Text
                        style={[styles.upcomingName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {loc.name}
                      </Text>
                      <Text
                        style={[styles.upcomingAddr, { color: colors.subtext }]}
                        numberOfLines={1}
                      >
                        {[loc.city, loc.postcode].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <Text
                      style={[styles.recentDate, { color: colors.subtext }]}
                    >
                      {dateStr}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {state.locations.length === 0 && (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No locations yet
            </Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              Add your first location in the Locations tab to start tracking
              stock.
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/locations")}>
              <GradView colors={settings.accentColor} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Go to Locations</Text>
              </GradView>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {showSettings && (
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          colors={colors}
        />
      )}

      {/* ── Crash Log detail modal ────────────────────────────── */}
      <SlideModal
        animation="fade"
        visible={showCrashLog}
        onRequestClose={() => setShowCrashLog(false)}
      >
        <SafeAreaView
          style={[styles.testModalSafe, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.testModalNavbar,
              { borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowCrashLog(false)}
              hitSlop={8}
              style={styles.testModalSide}
            >
              <Text style={[styles.testModalBack, { color: accent }]}>
                ‹ Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.testModalTitle, { color: colors.text }]}>
              🪲 Crash Log
            </Text>
            <TouchableOpacity
              onPress={handleClearLogs}
              hitSlop={8}
              style={[styles.testModalSide, { alignItems: "flex-end" }]}
            >
              <Text style={[styles.testModalBack, { color: colors.danger }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.logList}>
            {crashLogs.length === 0 ? (
              <Text style={[styles.logEmpty, { color: colors.subtext }]}>
                No entries yet.
              </Text>
            ) : (
              crashLogs.map((entry) => {
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
                      <Text
                        style={[styles.logLevel, { color: levelColor }]}
                      >
                        {entry.level.toUpperCase()}
                      </Text>
                      <Text
                        style={[styles.logTs, { color: colors.subtext }]}
                      >
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

      {/* ── Test Menu (temp) ─────────────────────────────────── */}
      <SlideModal
        animation="fade"
        visible={showTestMenu}
        onRequestClose={() => setShowTestMenu(false)}
      >
        <SafeAreaView
          style={[styles.testModalSafe, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.testModalNavbar,
              { borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowTestMenu(false)}
              hitSlop={8}
              style={styles.testModalSide}
            >
              <Text style={[styles.testModalBack, { color: accent }]}>
                ‹ Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.testModalTitle, { color: colors.text }]}>
              🧪 Test Menu
            </Text>
            <View style={styles.testModalSide} />
          </View>

          <ScrollView contentContainerStyle={styles.testMenuList}>
            <Text style={[styles.testMenuSection, { color: colors.subtext }]}>
              NOTIFICATIONS
            </Text>

            <TouchableOpacity
              style={[
                styles.testMenuItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={testNotificationNow}
              activeOpacity={0.7}
            >
              <Text style={[styles.testMenuIcon]}>📦</Text>
              <View style={styles.testMenuText}>
                <Text style={[styles.testMenuLabel, { color: colors.text }]}>
                  Fire restock notification (~3s)
                </Text>
                <Text
                  style={[styles.testMenuSub, { color: colors.subtext }]}
                >
                  Fires a &ldquo;Restock Due&rdquo; notification in ~10 seconds. Background
                  or lock the screen, then wait.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.testMenuItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={testNotificationDueToday}
              activeOpacity={0.7}
            >
              <Text style={[styles.testMenuIcon]}>📅</Text>
              <View style={styles.testMenuText}>
                <Text style={[styles.testMenuLabel, { color: colors.text }]}>
                  Schedule &ldquo;Due today&rdquo; notification
                </Text>
                <Text
                  style={[styles.testMenuSub, { color: colors.subtext }]}
                >
                  Schedules a notification for end of today (23:59). Good for
                  testing the due-date trigger.
                </Text>
              </View>
            </TouchableOpacity>

            <Text
              style={[
                styles.testMenuSection,
                { color: colors.subtext, marginTop: 24 },
              ]}
            >
              CRASH LOG
            </Text>

            {/* Log summary row */}
            <View
              style={[
                styles.testMenuItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={styles.testMenuIcon}>🪲</Text>
              <View style={styles.testMenuText}>
                <Text style={[styles.testMenuLabel, { color: colors.text }]}>
                  {crashLogs.length === 0
                    ? "No entries"
                    : `${crashLogs.length} entr${crashLogs.length === 1 ? "y" : "ies"}`}
                </Text>
                <Text style={[styles.testMenuSub, { color: colors.subtext }]}>
                  Errors and console.error calls captured since install.
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {crashLogs.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowCrashLog(true)}
                    style={[
                      styles.logBtn,
                      { borderColor: accent, backgroundColor: colors.background },
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
                      { borderColor: colors.danger, backgroundColor: colors.background },
                    ]}
                  >
                    <Text style={[styles.logBtnText, { color: colors.danger }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text
              style={[
                styles.testMenuSection,
                { color: colors.subtext, marginTop: 24 },
              ]}
            >
              INFO
            </Text>
            <View
              style={[
                styles.testInfoCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.testInfoText, { color: colors.subtext }]}>
                This menu is temporary and for development/testing only. Remove
                the 🧪 button from the dashboard header once testing is
                complete.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SlideModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  wordmark: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  date: { fontSize: 14, marginTop: 2 },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  settingsIcon: { fontSize: 18 },
  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  statValue: { fontSize: 26, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  // Upcoming restock cards
  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  upcomingStripe: { width: 4, alignSelf: "stretch" },
  upcomingBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  upcomingName: { fontSize: 14, fontWeight: "700" },
  upcomingAddr: { fontSize: 12 },
  upcomingRight: { paddingHorizontal: 12, alignItems: "flex-end", gap: 2 },
  upcomingDue: { fontSize: 13, fontWeight: "700" },
  upcomingPeriod: { fontSize: 11 },
  // Recent restock cards
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  recentDate: { fontSize: 12, paddingHorizontal: 12 },
  // Empty state
  empty: {
    marginTop: 40,
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyNote: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  // Header action buttons row
  headerActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  // Test menu modal
  testModalSafe: { flex: 1 },
  testModalNavbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  testModalSide: { minWidth: 64 },
  testModalBack: { fontSize: 15, fontWeight: "600" },
  testModalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  testMenuList: { padding: 20, gap: 10 },
  testMenuSection: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  testMenuItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  testMenuIcon: { fontSize: 22, lineHeight: 28 },
  testMenuText: { flex: 1, gap: 4 },
  testMenuLabel: { fontSize: 15, fontWeight: "600" },
  testMenuSub: { fontSize: 12, lineHeight: 17 },
  testInfoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  testInfoText: { fontSize: 13, lineHeight: 18 },
  // Log action buttons (View / Clear)
  logBtn: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
  },
  logBtnText: { fontSize: 12, fontWeight: "600" },
  // Crash log detail modal
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
  logStack: { fontSize: 10, lineHeight: 14, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
