import { memo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { MACHINE_LABELS } from "@/constants/machine-labels";
import { Colors } from "@/constants/theme";
import type { Product, RestockEntry } from "@/types";

interface HistoryRow {
  entry: RestockEntry;
  originalIndex: number;
}

export interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  rows: HistoryRow[];
  totalEntries: number;
  products: Product[];
  onEditEntry: (originalIndex: number) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}

export const HistoryModal = memo(function HistoryModal({
  visible,
  onClose,
  rows,
  totalEntries,
  products,
  onEditEntry,
  colors,
  accent,
}: HistoryModalProps) {
  return (
    <SlideModal animation="fade" visible={visible} onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.fsModalSafe, { backgroundColor: colors.background }]}
      >
        <FsModalNavbar
          title="Restock History"
          colors={colors}
          accent={accent}
          left={{ label: "‹ Back", tone: "accent", onPress: onClose }}
        />
        <FlatList
          data={rows}
          keyExtractor={({ entry, originalIndex }) =>
            `${entry.timestamp}-${originalIndex}`
          }
          contentContainerStyle={styles.historyList}
          renderItem={({ item: { entry, originalIndex }, index }) => {
            const hasProducts = entry.machines?.some(
              (m) => m.products.length > 0,
            );
            const hasReplacements =
              (entry.productReplacements?.length ?? 0) > 0;
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  styles.historyRow,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => onEditEntry(originalIndex)}
              >
                <Text style={[styles.historyIndex, { color: colors.subtext }]}>
                  #{totalEntries - index}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyDate, { color: colors.text }]}>
                    {new Date(entry.timestamp).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                  {hasProducts &&
                    entry.machines.map(
                      (me) =>
                        me.products.length > 0 && (
                          <View key={me.machineId} style={{ marginTop: 4 }}>
                            <Text
                              style={[
                                styles.historyMachineLabel,
                                { color: colors.subtext },
                              ]}
                            >
                              {MACHINE_LABELS[me.machineType]}
                            </Text>
                            {me.products.map((p) => {
                              const product = products.find(
                                (pr) => pr.id === p.productId,
                              );
                              return (
                                <Text
                                  key={p.productId}
                                  style={[
                                    styles.historyProductLine,
                                    { color: colors.text },
                                  ]}
                                >
                                  · {product?.name ?? p.productId} ×{p.qty}
                                </Text>
                              );
                            })}
                          </View>
                        ),
                    )}
                  {hasReplacements &&
                    (entry.productReplacements ?? []).map((r, ri) => {
                      const from = products.find(
                        (pr) => pr.id === r.replacedProductId,
                      );
                      const to = products.find(
                        (pr) => pr.id === r.replacedWithProductId,
                      );
                      return (
                        <Text
                          key={`rep-${ri}-${r.replacedProductId}`}
                          style={[
                            styles.historyReplaceLine,
                            { color: colors.subtext },
                          ]}
                        >
                          ↳ {from?.name ?? r.replacedProductId}: missing ×
                          {r.missingQtyRecorded} — replaced with{" "}
                          {to?.name ?? r.replacedWithProductId}
                        </Text>
                      );
                    })}
                </View>
                <Text
                  style={[
                    styles.historyEditChevron,
                    { color: colors.subtext },
                  ]}
                >
                  ›
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.historyEmpty, { color: colors.subtext }]}>
              No history yet.
            </Text>
          }
        />
      </SafeAreaView>
    </SlideModal>
  );
});

const styles = StyleSheet.create({
  fsModalSafe: { flex: 1 },
  historyList: { paddingBottom: 40 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyIndex: { fontSize: 12, fontWeight: "600", minWidth: 28 },
  historyDate: { fontSize: 15 },
  historyMachineLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  historyProductLine: { fontSize: 13, paddingLeft: 4 },
  historyReplaceLine: {
    fontSize: 12,
    paddingLeft: 4,
    marginTop: 4,
    lineHeight: 17,
    fontStyle: "italic",
  },
  historyEmpty: { textAlign: "center", paddingTop: 32, fontSize: 14 },
  historyEditChevron: { fontSize: 20, fontWeight: "300" },
});
