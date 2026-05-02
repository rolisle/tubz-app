import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
import type {
  Machine,
  MachineType,
  Product,
  ProductCategory,
  RestockSessionReplacementLine,
} from "@/types";

export interface RestockSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  locationName: string;
  machines: Machine[];
  products: Product[];
  machineColors: Record<MachineType, string>;
  machineColorSettings: { sweet: AppColor; toy: AppColor };
  /** Slot counts for primary restock rows (decrements when a slot is moved to “replacement” lines). */
  primarySlotCounts: Record<string, Record<string, number>>;
  replacementLines: Record<string, RestockSessionReplacementLine[]>;
  restockQtys: Record<string, Record<string, number>>;
  restockDone: Record<string, Record<string, boolean>>;
  onChangeQty: (machineId: string, productId: string, delta: number) => void;
  onToggleDone: (machineId: string, productId: string) => void;
  onSnapQty: (machineId: string, productId: string) => void;
  onChangeReplacementQty: (
    machineId: string,
    lineId: string,
    delta: number,
  ) => void;
  onToggleReplacementDone: (machineId: string, lineId: string) => void;
  onSnapReplacementQty: (machineId: string, lineId: string) => void;
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
  primarySlotCounts,
  replacementLines,
  restockQtys,
  restockDone,
  onChangeQty,
  onToggleDone,
  onSnapQty,
  onChangeReplacementQty,
  onToggleReplacementDone,
  onSnapReplacementQty,
  onReplaceProduct,
  accent,
  colors,
}: RestockSessionModalProps) {
  const [replaceFor, setReplaceFor] = useState<{
    machineId: string;
    oldProductId: string;
    category: ProductCategory;
  } | null>(null);

  useEffect(() => {
    if (!visible) setReplaceFor(null);
  }, [visible]);

  return (
    <SlideModal visible={visible} onRequestClose={onClose} animation="fade">
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
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
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No machines yet
              </Text>
              <Text style={[styles.emptyNote, { color: colors.subtext }]}>
                Add machines to this location first.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sessionTip, { color: colors.subtext }]}>
                Double-tap the product (image and name) to jump to full quantity
                or back to zero. Use the circle to mark a line complete.{" "}
                <Text style={{ fontWeight: "600", color: colors.text }}>
                  Change product
                </Text>{" "}
                moves one slot planogram to a new catalog item: you keep
                restocking the original product on the rows above; the new
                product appears below with a “Replacing …” label (top-selling
                counts that as stock for the old line only). Layout updates when
                you tap Done.
              </Text>
              {machines.map((machine) => {
                const primaryMap = primarySlotCounts[machine.id] ?? {};
                const primaryIds = Object.keys(primaryMap).filter(
                  (pid) => (primaryMap[pid] ?? 0) > 0,
                );
                const repl = replacementLines[machine.id] ?? [];
                const machineColorStr = machineColors[machine.type];
                const machineColorSetting =
                  machine.type === "sweet"
                    ? machineColorSettings.sweet
                    : machineColorSettings.toy;
                const capacityPerSlot = machine.type === "toy" ? 12 : 9;
                const primaryTotal = primaryIds.reduce(
                  (s, pid) => s + (restockQtys[machine.id]?.[pid] ?? 0),
                  0,
                );
                const replTotal = repl.reduce((s, line) => s + line.qty, 0);
                const totalQty = primaryTotal + replTotal;

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
                    <View
                      style={[styles.machineHeader, { overflow: "hidden" }]}
                    >
                      <GradView
                        colors={machineColorSetting}
                        style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
                      />
                      <View style={styles.machineTitleRow}>
                        <Text
                          style={[
                            styles.machineTitle,
                            { color: machineColorStr },
                          ]}
                        >
                          {MACHINE_LABELS[machine.type]}
                        </Text>
                        {totalQty > 0 && (
                          <View
                            style={[
                              styles.totalBadge,
                              { backgroundColor: machineColorStr + "22" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.totalBadgeText,
                                { color: machineColorStr },
                              ]}
                            >
                              {totalQty} total
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.machineBody}>
                      {primaryIds.length === 0 && repl.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyMachine,
                            { color: colors.subtext },
                          ]}
                        >
                          No products in this machine.
                        </Text>
                      ) : (
                        <>
                          {primaryIds.length > 0 ? (
                            <>
                              <Text
                                style={[
                                  styles.sectionHint,
                                  { color: colors.subtext },
                                ]}
                              >
                                Original slots
                              </Text>
                              {primaryIds.map((pid) => {
                                const product = products.find(
                                  (p) => p.id === pid,
                                );
                                const qty = restockQtys[machine.id]?.[pid] ?? 0;
                                const slots = primaryMap[pid] ?? 1;
                                const max = slots * capacityPerSlot;
                                const done =
                                  restockDone[machine.id]?.[pid] ?? false;
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
                                    onToggleDone={() =>
                                      onToggleDone(machine.id, pid)
                                    }
                                    accent={accent}
                                    onDoubleTapSnap={() =>
                                      onSnapQty(machine.id, pid)
                                    }
                                    onDecrement={() =>
                                      onChangeQty(machine.id, pid, -1)
                                    }
                                    onIncrement={() =>
                                      onChangeQty(machine.id, pid, +1)
                                    }
                                    onChangeProduct={() =>
                                      setReplaceFor({
                                        machineId: machine.id,
                                        oldProductId: pid,
                                        category:
                                          machine.type as ProductCategory,
                                      })
                                    }
                                  />
                                );
                              })}
                            </>
                          ) : null}

                          {repl.length > 0 ? (
                            <View style={styles.replBlock}>
                              <Text
                                style={[
                                  styles.sectionHint,
                                  { color: colors.subtext },
                                ]}
                              >
                                New stock in swapped slots
                              </Text>
                              {repl.map((line) => {
                                const product = products.find(
                                  (p) => p.id === line.productId,
                                );
                                const replacedBy = products.find(
                                  (p) => p.id === line.replacesProductId,
                                );
                                const label = `Replacing ${replacedBy?.name ?? line.replacesProductId}`;
                                const max = capacityPerSlot;
                                return (
                                  <RestockProductRow
                                    key={line.id}
                                    productId={line.productId}
                                    product={product}
                                    qty={line.qty}
                                    max={max}
                                    machineType={machine.type}
                                    colors={colors}
                                    done={line.done}
                                    onToggleDone={() =>
                                      onToggleReplacementDone(
                                        machine.id,
                                        line.id,
                                      )
                                    }
                                    accent={accent}
                                    onDoubleTapSnap={() =>
                                      onSnapReplacementQty(machine.id, line.id)
                                    }
                                    onDecrement={() =>
                                      onChangeReplacementQty(
                                        machine.id,
                                        line.id,
                                        -1,
                                      )
                                    }
                                    onIncrement={() =>
                                      onChangeReplacementQty(
                                        machine.id,
                                        line.id,
                                        +1,
                                      )
                                    }
                                    replacingLabel={label}
                                  />
                                );
                              })}
                            </View>
                          ) : null}
                        </>
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
  sectionHint: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: 6,
    marginTop: 4,
  },
  replBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#8883",
  },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyNote: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
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
