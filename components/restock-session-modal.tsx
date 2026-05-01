import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RestockProductRow } from "@/components/restock-product-row";
import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { GradView } from "@/components/ui/grad-view";
import { ProductPickerModal } from "@/components/ui/product-picker-modal";
import { ProductThumb } from "@/components/ui/product-thumb";
import { SlideModal } from "@/components/ui/slide-modal";
import { MACHINE_LABELS } from "@/constants/machine-labels";
import { Colors } from "@/constants/theme";
import type { AppColor } from "@/context/settings-context";
import type { Machine, MachineType, Product, ProductCategory } from "@/types";

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
  restockDone: Record<string, Record<string, boolean>>;
  onChangeQty: (machineId: string, productId: string, delta: number) => void;
  onToggleDone: (machineId: string, productId: string) => void;
  onSnapQty: (machineId: string, productId: string) => void;
  /** Replace one slot (first matching position for oldProductId) with newProductId; updates layout + stock counts. */
  onReplaceProduct: (
    machineId: string,
    oldProductId: string,
    newProductId: string,
  ) => void;
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
  restockDone,
  onChangeQty,
  onToggleDone,
  onSnapQty,
  onReplaceProduct,
  accent,
  colors,
}: RestockSessionModalProps) {
  const [replaceFor, setReplaceFor] = useState<
    { machineId: string; oldProductId: string; category: ProductCategory } | null
  >(null);

  useEffect(() => {
    if (!visible) setReplaceFor(null);
  }, [visible]);

  return (
    <SlideModal visible={visible} onRequestClose={onClose} animation="fade">
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <FsModalNavbar
          title="Restock"
          subtitle={locationName}
          colors={colors}
          accent={accent}
          left={{ label: "Cancel", tone: "muted", onPress: onClose }}
          rightElement={
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accent }]}
              onPress={onComplete}
            >
              <Text style={styles.confirmBtnText}>Done</Text>
            </TouchableOpacity>
          }
        />

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
            <>
              <Text style={[styles.sessionTip, { color: colors.subtext }]}>
                Double-tap the product (image and name) to jump to full quantity or
                back to zero. Use the circle to mark a line complete — it disables
                editing until you clear it.{" "}
                <Text style={{ fontWeight: "600", color: colors.text }}>
                  Change product
                </Text>{" "}
                swaps one slot (the first position for that product on the
                machine) for another catalogue item — other slots stay as they
                are. Layout changes apply when you tap Done; Cancel keeps the
                original products.
              </Text>
            {machines.map((machine) => {
              // Count how many slots each product occupies — this is the max restockable for that product
              const slotCounts = new Map<string, number>();
              for (const id of machine.slots) {
                if (id) slotCounts.set(id, (slotCounts.get(id) ?? 0) + 1);
              }
              const productIds = Array.from(slotCounts.keys());
              const machineColorStr = machineColors[machine.type];
              const machineColorSetting = machine.type === "sweet"
                ? machineColorSettings.sweet
                : machineColorSettings.toy;
              const capacityPerSlot = machine.type === "toy" ? 12 : 9;
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
                        const max = (slotCounts.get(pid) ?? 1) * capacityPerSlot;
                        const done = restockDone[machine.id]?.[pid] ?? false;
                        return (
                          <RestockProductRow
                            key={pid}
                            productId={pid}
                            product={product}
                            qty={qty}
                            max={max}
                            machineType={machine.type}
                            colors={colors}
                            done={done}
                            onToggleDone={() => onToggleDone(machine.id, pid)}
                            accent={accent}
                            onDoubleTapSnap={() => onSnapQty(machine.id, pid)}
                            onDecrement={() => onChangeQty(machine.id, pid, -1)}
                            onIncrement={() => onChangeQty(machine.id, pid, +1)}
                            onChangeProduct={() =>
                              setReplaceFor({
                                machineId: machine.id,
                                oldProductId: pid,
                                category: machine.type as ProductCategory,
                              })
                            }
                          />
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })}
            </>
          )}
        </ScrollView>

        {replaceFor ? (
          <ProductPickerModal
            category={replaceFor.category}
            products={products}
            title="Change product"
            emptyMessage="No products match this machine type."
            onClose={() => setReplaceFor(null)}
            renderRow={(product, _rowAccent, rowColors) => (
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  { borderBottomColor: rowColors.border },
                ]}
                onPress={() => {
                  if (product.id !== replaceFor.oldProductId) {
                    onReplaceProduct(
                      replaceFor.machineId,
                      replaceFor.oldProductId,
                      product.id,
                    );
                  }
                  setReplaceFor(null);
                }}
              >
                <ProductThumb product={product} size={36} />
                <Text style={[styles.pickerRowName, { color: rowColors.text }]}>
                  {product.name}
                </Text>
                {product.id === replaceFor.oldProductId ? (
                  <Text style={[styles.pickerCurrent, { color: rowColors.subtext }]}>
                    Current
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        ) : null}
      </SafeAreaView>
    </SlideModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  confirmBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  sessionTip: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
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
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowName: { flex: 1, fontSize: 14, fontWeight: "500" },
  pickerCurrent: { fontSize: 11, fontWeight: "600" },
});
