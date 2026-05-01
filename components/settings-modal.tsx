import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useState } from "react";
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

import { ChangelogPanel } from "@/components/changelog-panel";
import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { GradView } from "@/components/ui/grad-view";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";
import { useApp } from "@/context/app-context";
import {
  ACCENT_PRESETS,
  type AppColor,
  type AppSettings,
  colorEquals,
  primaryColor,
  SWEET_PRESETS,
  TOY_PRESETS,
  useSettings,
} from "@/context/settings-context";
import { confirm } from "@/utils/confirm";
import { exportData, importData } from "@/utils/data-transfer";
import {
  getNotificationDiagnostics,
  openAndroidExactAlarmSettings,
} from "@/utils/notifications";

/* ─── SwatchRow ──────────────────────────────────────────────── */

interface SwatchRowProps {
  label: string;
  presets: { label: string; value: AppColor }[];
  current: AppColor;
  settingKey: keyof AppSettings;
  colors: (typeof Colors)["light"];
}

const SwatchRow = memo(function SwatchRow({
  label,
  presets,
  current,
  settingKey,
  colors,
}: SwatchRowProps) {
  const { setSetting } = useSettings();
  return (
    <View style={styles.swatchSection}>
      <Text style={[styles.swatchLabel, { color: colors.subtext }]}>
        {label}
      </Text>
      <View style={styles.swatchRow}>
        {presets.map((p) => {
          const isActive = colorEquals(current, p.value);
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => setSetting(settingKey, p.value)}
              activeOpacity={0.75}
              style={[
                styles.swatch,
                p.value.length === 1 && { backgroundColor: p.value[0] },
                p.value.length > 1 && { backgroundColor: p.value[0] },
                isActive && styles.swatchActive,
              ]}
            >
              {p.value.length > 1 && (
                <LinearGradient
                  colors={p.value as [string, string, ...string[]]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

/* ─── SettingsModal ──────────────────────────────────────────── */

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)["light"];
}

export function SettingsModal({ visible, onClose, colors }: SettingsModalProps) {
  const { settings } = useSettings();
  const { state, replaceState } = useApp();
  const [panel, setPanel] = useState<"main" | "changelog">("main");
  const appVersion = Constants.expoConfig?.version ?? "—";

  useEffect(() => {
    if (!visible) setPanel("main");
  }, [visible]);

  const showNotificationDiagnostics = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Notifications", "Not available in the browser build.");
      return;
    }
    const d = await getNotificationDiagnostics();
    if (!d) return;
    Alert.alert(
      "Notification diagnostics",
      [
        `Alerts allowed: ${d.permitted ? "Yes" : "No"}`,
        `System status: ${d.status}`,
        `Scheduled jobs (all): ${d.scheduledTotal}`,
        `Restock reminders (restock-*): ${d.restockScheduled}`,
      ].join("\n"),
    );
  }, []);

  const openExactAlarmSettingsFromSettings = useCallback(async () => {
    await openAndroidExactAlarmSettings();
  }, []);

  const sections: {
    label: string;
    key: keyof AppSettings;
    presets: { label: string; value: AppColor }[];
  }[] = [
    { label: "Accent / Tab Colour", key: "accentColor", presets: ACCENT_PRESETS },
    { label: "Sweet Machine Colour", key: "sweetColor", presets: SWEET_PRESETS },
    { label: "Toy Machine Colour", key: "toyColor", presets: TOY_PRESETS },
  ];

  return (
    <SlideModal
      animation="fade"
      visible={visible}
      onRequestClose={() => {
        if (panel === "changelog") setPanel("main");
        else onClose();
      }}
      enterDuration={160}
      exitDuration={120}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        {panel === "main" ? (
          <>
            <FsModalNavbar
              title="⚙️ Settings"
              subtitle={appVersion !== "—" ? `Version ${appVersion}` : undefined}
              colors={colors}
              accent={primaryColor(settings.accentColor)}
              right={{ label: "Done", tone: "muted", onPress: onClose }}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Theme</Text>

              {sections.map((s) => (
                <SwatchRow
                  key={s.key}
                  label={s.label}
                  presets={s.presets}
                  current={settings[s.key]}
                  settingKey={s.key}
                  colors={colors}
                />
              ))}

              {/* Live preview */}
              <View style={[styles.previewRow, { borderTopColor: colors.border }]}>
                <View
                  style={[
                    styles.previewChip,
                    {
                      backgroundColor: primaryColor(settings.sweetColor) + "22",
                      borderColor: primaryColor(settings.sweetColor),
                    },
                  ]}
                >
                  <GradView
                    colors={settings.sweetColor}
                    style={[StyleSheet.absoluteFill, { borderRadius: 10, opacity: 0.12 }]}
                  />
                  <Text
                    style={[styles.previewChipText, { color: primaryColor(settings.sweetColor) }]}
                  >
                    🍬 Sweet Machine
                  </Text>
                </View>
                <View
                  style={[
                    styles.previewChip,
                    {
                      backgroundColor: primaryColor(settings.toyColor) + "22",
                      borderColor: primaryColor(settings.toyColor),
                    },
                  ]}
                >
                  <GradView
                    colors={settings.toyColor}
                    style={[StyleSheet.absoluteFill, { borderRadius: 10, opacity: 0.12 }]}
                  />
                  <Text
                    style={[styles.previewChipText, { color: primaryColor(settings.toyColor) }]}
                  >
                    🪀 Toy Machine
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
                About
              </Text>
              <TouchableOpacity
                style={[styles.menuRow, { borderColor: colors.border }]}
                onPress={() => setPanel("changelog")}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuRowIcon, { color: colors.subtext }]}>📋</Text>
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  What’s new
                </Text>
                <Text style={[styles.menuRowChevron, { color: colors.subtext }]}>›</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
                Notifications
              </Text>
              <Text style={[styles.notifSectionHint, { color: colors.subtext }]}>
                Simple checks on this device (not related to data export).
              </Text>
              <TouchableOpacity
                style={[styles.menuRow, { borderColor: colors.border }]}
                onPress={showNotificationDiagnostics}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuRowIcon, { color: colors.subtext }]}>📊</Text>
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  Show permission and schedule counts
                </Text>
                <Text style={[styles.menuRowChevron, { color: colors.subtext }]}>›</Text>
              </TouchableOpacity>
              {Platform.OS === "android" && (
                <TouchableOpacity
                  style={[styles.menuRow, { borderColor: colors.border }]}
                  onPress={openExactAlarmSettingsFromSettings}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.menuRowIcon, { color: colors.subtext }]}>🔔</Text>
                  <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                    Android: alarms and reminders access
                  </Text>
                  <Text style={[styles.menuRowChevron, { color: colors.subtext }]}>›</Text>
                </TouchableOpacity>
              )}

              {/* Data transfer */}
              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
                Data
              </Text>
              <View style={[styles.dataRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.dataBtn, { backgroundColor: colors.border }]}
                  onPress={async () => {
                    try {
                      await exportData(state);
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : String(e);
                      if (Platform.OS === "web") {
                        window.alert("Export failed: " + msg);
                      } else {
                        Alert.alert("Export failed", msg);
                      }
                    }
                  }}
                >
                  <Text style={[styles.dataBtnText, { color: colors.text }]}>
                    ⬆ Export data
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dataBtn, { backgroundColor: colors.border }]}
                  onPress={async () => {
                    try {
                      const payload = await importData();
                      const confirmed = await confirm(
                        "Replace all data?",
                        `This will replace all locations and products with the imported data.\n\n` +
                          `${payload.locations.length} locations · ${payload.products.length} products\n\nThis cannot be undone.`,
                        { confirmLabel: "Import", destructive: true },
                      );
                      if (confirmed) {
                        replaceState({
                          locations: payload.locations,
                          products: payload.products,
                        });
                        onClose();
                      }
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : String(e);
                      if (msg === "Cancelled") return;
                      if (Platform.OS === "web") {
                        window.alert("Import failed: " + msg);
                      } else {
                        Alert.alert("Import failed", msg);
                      }
                    }
                  }}
                >
                  <Text style={[styles.dataBtnText, { color: colors.text }]}>
                    ⬇ Import data
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        ) : (
          <>
            <FsModalNavbar
              title="What’s new"
              colors={colors}
              accent={primaryColor(settings.accentColor)}
              left={{
                label: "‹ Settings",
                tone: "accent",
                onPress: () => setPanel("main"),
              }}
              right={{ label: "Done", tone: "muted", onPress: onClose }}
            />
            <ChangelogPanel colors={colors} />
          </>
        )}
      </SafeAreaView>
    </SlideModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    opacity: 0.5,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  swatchSection: { paddingHorizontal: 20, marginBottom: 16 },
  swatchLabel: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 28, height: 28, borderRadius: 14, overflow: "hidden" },
  swatchActive: {
    borderWidth: 3,
    borderColor: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    elevation: 4,
  },
  previewRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  previewChipText: { fontSize: 13, fontWeight: "600" },
  dataRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  dataBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  dataBtnText: { fontSize: 14, fontWeight: "600" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuRowIcon: { fontSize: 18, marginRight: 12 },
  menuRowLabel: { flex: 1, fontSize: 16, fontWeight: "500" },
  menuRowChevron: { fontSize: 22, fontWeight: "300" },
  notifSectionHint: {
    paddingHorizontal: 20,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
    marginTop: -2,
  },
});
