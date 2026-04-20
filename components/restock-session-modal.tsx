import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RestockProductRow } from "@/components/restock-product-row";
import { GradView } from "@/components/ui/grad-view";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";
import type { AppColor } from "@/context/settings-context";
import type { Machine, MachineType, Product } from "@/types";

const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: "Sweet Machine 🍬",
  toy: "Toy Machine 🪀",
};

export interface RestockSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  locationName: string;
  machines: Machine[];
  products: Product[];
  machineColors: Record<MachineType, string>;
  machineColorSettings: { sweet: AppColor; toy: AppColor };
  restockQtys: Record<string, Record<string, number>>;
  onChangeQty: (machineId: string, productId: string, delta: number) => void;
  accent: string;
  colors: (typeof Colors)["light"];
}

export function RestockSessionModal({
  visible,
  onClose,
  onComplete,
  locationName,
  machines,
  products,
  machineColors,
  machineColorSettings,
  restockQtys,
  onChangeQty,
  accent,
  colors,
}: RestockSessionModalProps) {
  return (
    <SlideModal visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        {/* Navbar */}
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: colors.subtext }]}>Cancel</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.navTitle, { color: colors.text }]}>Restock</Text>
            <Text style={[styles.navSub, { color: colors.subtext }]}>{locationName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: accent }]}
            onPress={onComplete}
          >
            <Text style={styles.confirmBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {machines.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No machines yet</Text>
              <Text style={[styles.emptyNote, { color: colors.subtext }]}>
                Add machines to this location first.
              </Text>
            </View>
          ) : (
            machines.map((machine) => {
              const productIds = Array.from(new Set(machine.slots.filter(Boolean) as string[]));
              const machineColorStr = machineColors[machine.type];
              const machineColorSetting = machine.type === "sweet"
                ? machineColorSettings.sweet
                : machineColorSettings.toy;
              const max = machine.type === "toy" ? 12 : 9;
              const totalQty = productIds.reduce(
                (s, pid) => s + (restockQtys[machine.id]?.[pid] ?? 0), 0
              );

              return (
                <View
                  key={machine.id}
                  style={[
                    styles.machineCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: machineColorStr + "55",
                      borderLeftColor: machineColorStr,
                    },
                  ]}
                >
                  {/* Machine header */}
                  <View style={[styles.machineHeader, { overflow: "hidden" }]}>
                    <GradView
                      colors={machineColorSetting}
                      style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
                    />
                    <View style={styles.machineTitleRow}>
                      <Text style={[styles.machineTitle, { color: machineColorStr }]}>
                        {MACHINE_LABELS[machine.type]}
                      </Text>
                      {totalQty > 0 && (
                        <View style={[styles.totalBadge, { backgroundColor: machineColorStr + "22" }]}>
                          <Text style={[styles.totalBadgeText, { color: machineColorStr }]}>
                            {totalQty} total
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Product rows */}
                  <View style={styles.machineBody}>
                    {productIds.length === 0 ? (
                      <Text style={[styles.emptyMachine, { color: colors.subtext }]}>
                        No products in this machine.
                      </Text>
                    ) : (
                      productIds.map((pid) => {
                        const product = products.find((p) => p.id === pid);
                        const qty = restockQtys[machine.id]?.[pid] ?? 0;
                        return (
                          <RestockProductRow
                            key={pid}
                            productId={pid}
                            product={product}
                            qty={qty}
                            max={max}
                            machineType={machine.type}
                            colors={colors}
                            onDecrement={() => onChangeQty(machine.id, pid, -1)}
                            onIncrement={() => onChangeQty(machine.id, pid, +1)}
                          />
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </SlideModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 15, fontWeight: "500" },
  navTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  navSub: { fontSize: 12, textAlign: "center" },
  confirmBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyNote: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  machineCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  machineTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  machineTitle: { fontSize: 15, fontWeight: "700" },
  totalBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  totalBadgeText: { fontSize: 11, fontWeight: "700" },
  machineBody: { paddingHorizontal: 14, paddingBottom: 6 },
  emptyMachine: { fontSize: 13, paddingVertical: 10 },
});
