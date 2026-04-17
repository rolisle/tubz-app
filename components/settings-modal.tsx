import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { GradView } from "@/components/ui/grad-view";
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
import { exportData, importData } from "@/utils/data-transfer";

/* ─── SwatchRow ──────────────────────────────────────────────── */

interface SwatchRowProps {
  label: string;
  presets: { label: string; value: AppColor }[];
  current: AppColor;
  onChange: (v: AppColor) => void;
  colors: (typeof Colors)["light"];
}

const SwatchRow = memo(function SwatchRow({
  label,
  presets,
  current,
  onChange,
  colors,
}: SwatchRowProps) {
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
              onPress={() => onChange(p.value)}
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
  const { settings, setSetting } = useSettings();
  const { state, replaceState } = useApp();

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            ⚙️ Settings
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.sheetClose, { color: colors.subtext }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sheetSection, { color: colors.text }]}>Theme</Text>

        {sections.map((s) => (
          <SwatchRow
            key={s.key}
            label={s.label}
            presets={s.presets}
            current={settings[s.key]}
            onChange={(v) => setSetting(s.key, v)}
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

        {/* Data transfer */}
        <Text style={[styles.sheetSection, { color: colors.text, marginTop: 8 }]}>
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
                const confirmed =
                  Platform.OS === "web"
                    ? window.confirm(
                        `Replace all data with this export?\n` +
                          `(${payload.locations.length} locations, ${payload.products.length} products)\n\n` +
                          `This cannot be undone.`,
                      )
                    : await new Promise<boolean>((res) =>
                        Alert.alert(
                          "Replace all data?",
                          `This will replace all locations and products with the imported data.\n\n` +
                            `${payload.locations.length} locations · ${payload.products.length} products\n\nThis cannot be undone.`,
                          [
                            { text: "Cancel", style: "cancel", onPress: () => res(false) },
                            { text: "Import", style: "destructive", onPress: () => res(true) },
                          ],
                        ),
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetClose: { fontSize: 15, fontWeight: "500" },
  sheetSection: {
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 20,
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
});
