import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  colorEquals,
  primaryColor,
  SWEET_PRESETS,
  TOY_PRESETS,
  useSettings,
  type AppColor,
} from "@/context/settings-context";
import { confirm } from "@/utils/confirm";
import { exportData, importData } from "@/utils/data-transfer";
import {
  formatDataTransferStamp,
  loadDataTransferMeta,
  patchDataTransferMeta,
  type DataTransferMeta,
} from "@/utils/data-transfer-meta";
import {
  clampStockLevel,
  DEFAULT_SWEET_STOCK_LEVEL,
  DEFAULT_TOY_STOCK_LEVEL,
} from "@/utils/slot-capacity";

/* ─── SwatchRow ──────────────────────────────────────────────── */

interface SwatchRowProps {
  label: string;
  presets: { label: string; value: AppColor }[];
  current: AppColor;
  settingKey: "accentColor" | "sweetColor" | "toyColor";
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

function parseLevelInput(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number.parseInt(t.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

const StockLevelSection = memo(function StockLevelSection({
  visible,
  colors,
}: {
  visible: boolean;
  colors: (typeof Colors)["light"];
}) {
  const { settings, setSetting } = useSettings();
  const [sweetText, setSweetText] = useState(String(settings.sweetStockLevel));
  const [toyText, setToyText] = useState(String(settings.toyStockLevel));

  useEffect(() => {
    if (!visible) return;
    setSweetText(String(settings.sweetStockLevel));
    setToyText(String(settings.toyStockLevel));
  }, [visible, settings.sweetStockLevel, settings.toyStockLevel]);

  const commitSweet = useCallback(() => {
    const n = parseLevelInput(sweetText);
    const v = clampStockLevel(
      n ?? DEFAULT_SWEET_STOCK_LEVEL,
      DEFAULT_SWEET_STOCK_LEVEL,
    );
    setSetting("sweetStockLevel", v);
    setSweetText(String(v));
  }, [sweetText, setSetting]);

  const commitToy = useCallback(() => {
    const n = parseLevelInput(toyText);
    const v = clampStockLevel(
      n ?? DEFAULT_TOY_STOCK_LEVEL,
      DEFAULT_TOY_STOCK_LEVEL,
    );
    setSetting("toyStockLevel", v);
    setToyText(String(v));
  }, [toyText, setSetting]);

  return (
    <View style={styles.stockSection}>
      <Text style={[styles.stockHint, { color: colors.subtext }]}>
        Per-column cap when restocking and in history (planogram columns are
        unchanged).
      </Text>
      <View style={styles.stockRow}>
        <Text style={[styles.stockLabel, { color: colors.text }]}>
          🍬 Sweet max per column
        </Text>
        <TextInput
          style={[
            styles.stockInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
          keyboardType="number-pad"
          returnKeyType="done"
          value={sweetText}
          onChangeText={setSweetText}
          onBlur={commitSweet}
          onSubmitEditing={commitSweet}
        />
      </View>
      <View style={styles.stockRow}>
        <Text style={[styles.stockLabel, { color: colors.text }]}>
          🪀 Toy max per column
        </Text>
        <TextInput
          style={[
            styles.stockInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
          keyboardType="number-pad"
          returnKeyType="done"
          value={toyText}
          onChangeText={setToyText}
          onBlur={commitToy}
          onSubmitEditing={commitToy}
        />
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

type TransferStatus =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "err"; text: string };

export function SettingsModal({
  visible,
  onClose,
  colors,
}: SettingsModalProps) {
  const { settings, setSetting } = useSettings();
  const { state, replaceState } = useApp();
  const [panel, setPanel] = useState<"main" | "changelog">("main");
  const [dataTransferMeta, setDataTransferMeta] = useState<DataTransferMeta>(
    {},
  );
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({
    kind: "idle",
  });
  const clearStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appVersion = Constants.expoConfig?.version ?? "—";

  const setOkStatus = useCallback((text: string) => {
    if (clearStatusTimer.current) clearTimeout(clearStatusTimer.current);
    setTransferStatus({ kind: "ok", text });
    clearStatusTimer.current = setTimeout(
      () => setTransferStatus({ kind: "idle" }),
      3500,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (clearStatusTimer.current) clearTimeout(clearStatusTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    loadDataTransferMeta().then(setDataTransferMeta);
  }, [visible]);

  useEffect(() => {
    if (!visible) setPanel("main");
  }, [visible]);

  const sections: {
    label: string;
    key: "accentColor" | "sweetColor" | "toyColor";
    presets: { label: string; value: AppColor }[];
  }[] = [
    {
      label: "Accent / Tab Colour",
      key: "accentColor",
      presets: ACCENT_PRESETS,
    },
    {
      label: "Sweet Machine Colour",
      key: "sweetColor",
      presets: SWEET_PRESETS,
    },
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
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        {panel === "main" ? (
          <>
            <FsModalNavbar
              title="⚙️ Settings"
              subtitle={
                appVersion !== "—" ? `Version ${appVersion}` : undefined
              }
              colors={colors}
              accent={primaryColor(settings.accentColor)}
              right={{ label: "Done", tone: "muted", onPress: onClose }}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.text, marginTop: 20 },
                ]}
              >
                About
              </Text>
              <TouchableOpacity
                style={[styles.menuRow, { borderColor: colors.border }]}
                onPress={() => setPanel("changelog")}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuRowIcon, { color: colors.subtext }]}>
                  📋
                </Text>
                <Text style={[styles.menuRowLabel, { color: colors.text }]}>
                  What’s new
                </Text>
                <Text
                  style={[styles.menuRowChevron, { color: colors.subtext }]}
                >
                  ›
                </Text>
              </TouchableOpacity>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Theme
              </Text>

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
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.text, marginTop: 20 },
                ]}
              >
                Stock levels
              </Text>
              <StockLevelSection visible={visible} colors={colors} />

              {/* Live preview */}
              <View
                style={[styles.previewRow, { borderTopColor: colors.border }]}
              >
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
                    style={[
                      StyleSheet.absoluteFill,
                      { borderRadius: 10, opacity: 0.12 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.previewChipText,
                      { color: primaryColor(settings.sweetColor) },
                    ]}
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
                    style={[
                      StyleSheet.absoluteFill,
                      { borderRadius: 10, opacity: 0.12 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.previewChipText,
                      { color: primaryColor(settings.toyColor) },
                    ]}
                  >
                    🪀 Toy Machine
                  </Text>
                </View>
              </View>

              {/* Data transfer */}
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Data
              </Text>
              <View style={styles.dataFormatWrap}>
                <View style={styles.dataFormatChips}>
                  {(["json", "csv"] as const).map((fmt) => {
                    const active = settings.dataExportFormat === fmt;
                    const accentCol = primaryColor(settings.accentColor);
                    return (
                      <TouchableOpacity
                        key={fmt}
                        onPress={() => setSetting("dataExportFormat", fmt)}
                        activeOpacity={0.75}
                        style={[
                          styles.dataFormatChip,
                          {
                            borderColor: active ? accentCol : colors.border,
                            backgroundColor: active
                              ? accentCol + "18"
                              : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dataFormatChipText,
                            { color: colors.text },
                          ]}
                        >
                          {fmt === "json" ? ".json" : ".csv"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={[styles.dataRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  disabled={transferStatus.kind === "busy"}
                  style={[
                    styles.dataBtn,
                    { backgroundColor: colors.border },
                    transferStatus.kind === "busy" && styles.dataBtnDisabled,
                  ]}
                  onPress={async () => {
                    setTransferStatus({ kind: "busy", text: "Exporting…" });
                    try {
                      await exportData(state, settings.dataExportFormat);
                      const ts = new Date().toISOString();
                      await patchDataTransferMeta({ lastExportAt: ts });
                      setDataTransferMeta((prev) => ({
                        ...prev,
                        lastExportAt: ts,
                      }));
                      setOkStatus("Export saved ✓");
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : String(e);
                      setTransferStatus({ kind: "err", text: msg });
                    }
                  }}
                >
                  <Text style={[styles.dataBtnText, { color: colors.text }]}>
                    {transferStatus.kind === "busy" &&
                    transferStatus.text === "Exporting…"
                      ? "Exporting…"
                      : "⬆ Export data"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={transferStatus.kind === "busy"}
                  style={[
                    styles.dataBtn,
                    { backgroundColor: colors.border },
                    transferStatus.kind === "busy" && styles.dataBtnDisabled,
                  ]}
                  onPress={async () => {
                    setTransferStatus({ kind: "busy", text: "Importing…" });
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
                        const ts = new Date().toISOString();
                        await patchDataTransferMeta({ lastImportAt: ts });
                        setDataTransferMeta((prev) => ({
                          ...prev,
                          lastImportAt: ts,
                        }));
                        setOkStatus("Imported ✓");
                      } else {
                        setTransferStatus({ kind: "idle" });
                      }
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : String(e);
                      if (msg === "Cancelled") {
                        setTransferStatus({ kind: "idle" });
                        return;
                      }
                      setTransferStatus({ kind: "err", text: msg });
                    }
                  }}
                >
                  <Text style={[styles.dataBtnText, { color: colors.text }]}>
                    {transferStatus.kind === "busy" &&
                    transferStatus.text === "Importing…"
                      ? "Importing…"
                      : "⬇ Import data"}
                  </Text>
                </TouchableOpacity>
              </View>

              {transferStatus.kind !== "idle" && (
                <View style={styles.transferStatusRow}>
                  <Text
                    style={[
                      styles.transferStatusText,
                      transferStatus.kind === "err"
                        ? { color: "#e05050" }
                        : transferStatus.kind === "ok"
                          ? { color: "#3a9e5f" }
                          : { color: colors.subtext },
                    ]}
                    numberOfLines={2}
                  >
                    {transferStatus.kind === "err"
                      ? `⚠ ${transferStatus.text}`
                      : transferStatus.text}
                  </Text>
                </View>
              )}

              <View style={styles.dataMetaWrap}>
                <Text style={[styles.dataMetaLabel, { color: colors.subtext }]}>
                  Last export:{" "}
                  {formatDataTransferStamp(dataTransferMeta.lastExportAt)}
                </Text>
                <Text style={[styles.dataMetaLabel, { color: colors.subtext }]}>
                  Last import:{" "}
                  {formatDataTransferStamp(dataTransferMeta.lastImportAt)}
                </Text>
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
    marginBottom: 10,
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
  dataBtnDisabled: { opacity: 0.45 },
  transferStatusRow: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  transferStatusText: { fontSize: 13, lineHeight: 18 },
  dataMetaWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 4,
  },
  dataMetaLabel: { fontSize: 12, lineHeight: 17 },
  dataFormatWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dataFormatHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  dataFormatChips: { flexDirection: "row", gap: 10 },
  dataFormatChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  dataFormatChipText: { fontSize: 14, fontWeight: "700" },
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
  stockSection: { paddingHorizontal: 20, marginBottom: 8 },
  stockHint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  stockLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  stockInput: {
    width: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
});
