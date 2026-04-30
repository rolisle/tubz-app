import { memo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";

export interface SettingsMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onEditAddress: () => void;
  onEditOpeningHours: () => void;
  onViewHistory: () => void;
  onDelete: () => void;
  historyCount: number;
  colors: (typeof Colors)["light"];
  accent: string;
}

export const SettingsMenuModal = memo(function SettingsMenuModal({
  visible,
  onClose,
  onEditAddress,
  onEditOpeningHours,
  onViewHistory,
  onDelete,
  historyCount,
  colors,
  accent,
}: SettingsMenuModalProps) {
  return (
    <SlideModal
      animation="fade"
      visible={visible}
      onRequestClose={onClose}
      enterDuration={160}
      exitDuration={120}
    >
      <SafeAreaView
        style={[styles.fsModalSafe, { backgroundColor: colors.background }]}
      >
        <FsModalNavbar
          title="Settings"
          colors={colors}
          accent={accent}
          left={{ label: "‹ Back", tone: "accent", onPress: onClose }}
        />
        <ScrollView contentContainerStyle={styles.menuList}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onEditAddress}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemIcon, { color: colors.subtext }]}>
              ✏️
            </Text>
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>
              Edit address
            </Text>
            <Text style={[styles.menuItemChevron, { color: colors.subtext }]}>
              ›
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onEditOpeningHours}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemIcon, { color: colors.subtext }]}>
              ⏰
            </Text>
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>
              Edit opening hours
            </Text>
            <Text style={[styles.menuItemChevron, { color: colors.subtext }]}>
              ›
            </Text>
          </TouchableOpacity>

          {historyCount > 0 && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={onViewHistory}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemIcon, { color: colors.subtext }]}>
                🕓
              </Text>
              <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                Restock history
              </Text>
              <Text style={[styles.menuItemMeta, { color: colors.subtext }]}>
                {historyCount} {historyCount === 1 ? "entry" : "entries"}
              </Text>
              <Text
                style={[styles.menuItemChevron, { color: colors.subtext }]}
              >
                ›
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={[styles.menuItemIcon, { color: "#ef4444" }]}>🗑️</Text>
            <Text style={[styles.menuItemLabel, { color: "#ef4444" }]}>
              Delete location
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </SlideModal>
  );
});

const styles = StyleSheet.create({
  fsModalSafe: { flex: 1 },
  menuList: { paddingTop: 8, paddingBottom: 40 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemIcon: { fontSize: 20, width: 26, textAlign: "center" },
  menuItemLabel: { flex: 1, fontSize: 16 },
  menuItemMeta: { fontSize: 13 },
  menuItemChevron: { fontSize: 20, fontWeight: "400" },
});
