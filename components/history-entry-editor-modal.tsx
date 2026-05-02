import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DatePickerModal } from "@/components/ui/date-picker-modal";
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
  RestockMachineEntry,
  RestockProductReplacement,
  RestockEntry,
} from "@/types";

export interface HistoryEntryEditorModalProps {
  editingEntry: { index: number; entry: RestockEntry } | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: (index: number) => void;
  editEntryDate: Date;
  onDateChange: (d: Date) => void;
  draftMachines: RestockMachineEntry[];
  onChangeLineQty: (
    machineId: string,
    lineIndex: number,
    delta: number,
  ) => void;
  showDatePicker: boolean;
  onShowDatePicker: (visible: boolean) => void;
  machineColors: Record<MachineType, string>;
  machineColorSettings: { sweet: AppColor; toy: AppColor };
  products: Product[];
  accent: string;
  colors: (typeof Colors)["light"];
  layoutMachines: Machine[];
  /** Older entries only — shown when no line uses `replacesProductId`. */
  legacyProductReplacements?: RestockProductReplacement[];
  /** Correct the SKU on an "original slots" row in place (does not add a new-stock line). */
  onChangePrimaryLineProduct: (
    machineId: string,
    lineIndex: number,
    newProductId: string,
  ) => void;
  /** Change SKU on a "new stock in swapped slots" row (keeps replacesProductId). */
  onChangeReplacementLineProduct?: (
    machineId: string,
    lineIndex: number,
    newProductId: string,
  ) => void;
  /** Append a "new stock in swapped slots" line (same default qty as live restock: one column). */
  onAddReplacementLine: (
    machineId: string,
    replacesProductId: string,
    newProductId: string,
  ) => void;
}

export function HistoryEntryEditorModal({
  editingEntry,
  onClose,
  onSave,
  onDelete,
  editEntryDate,
  onDateChange,
  draftMachines,
  onChangeLineQty,
  showDatePicker,
  onShowDatePicker,
  machineColors,
  machineColorSettings,
  products,
  accent,
  colors,
  layoutMachines,
  legacyProductReplacements,
  onChangePrimaryLineProduct,
  onChangeReplacementLineProduct,
  onAddReplacementLine,
}: HistoryEntryEditorModalProps) {
  const [replaceFor, setReplaceFor] = useState<
    | {
        kind: "primary";
        machineId: string;
        lineIndex: number;
        category: ProductCategory;
      }
    | {
        kind: "replacement";
        machineId: string;
        lineIndex: number;
        category: ProductCategory;
      }
    | null
  >(null);

  const [addReplFlow, setAddReplFlow] = useState<
    | {
        step: "replaced";
        machineId: string;
        machineType: MachineType;
      }
    | {
        step: "new";
        machineId: string;
        machineType: MachineType;
        replacesProductId: string;
      }
    | null
  >(null);

  const addReplReplacedPickerProducts = useMemo(() => {
    if (!addReplFlow || addReplFlow.step !== "replaced") return [];
    const me = draftMachines.find((m) => m.machineId === addReplFlow.machineId);
    const idSet = new Set(
      me?.products
        .filter((p) => !p.replacesProductId)
        .map((p) => p.productId) ?? [],
    );
    const cat = addReplFlow.machineType as ProductCategory;
    return products
      .filter((p) => idSet.has(p.id))
      .filter((p) => !p.category || p.category === cat);
  }, [addReplFlow, draftMachines, products]);

  /** Original-slot SKUs that already have at least one "new stock" line replacing them. */
  const addReplPrimaryIdsAlreadyReplaced = useMemo(() => {
    if (!addReplFlow || addReplFlow.step !== "replaced") return new Set<string>();
    const me = draftMachines.find((m) => m.machineId === addReplFlow.machineId);
    const blocked = new Set<string>();
    for (const p of me?.products ?? []) {
      if (p.replacesProductId) blocked.add(p.replacesProductId);
    }
    return blocked;
  }, [addReplFlow, draftMachines]);

  const addReplNewPickerProducts = useMemo(() => {
    if (!addReplFlow || addReplFlow.step !== "new") return [];
    const cat = addReplFlow.machineType as ProductCategory;
    return products.filter(
      (p) =>
        p.id !== addReplFlow.replacesProductId &&
        (!p.category || p.category === cat),
    );
  }, [addReplFlow, products]);

  const draftHasReplacementLines = useMemo(
    () => draftMachines.some((m) => m.products.some((p) => p.replacesProductId)),
    [draftMachines],
  );

  useEffect(() => {
    if (!editingEntry) {
      setReplaceFor(null);
      setAddReplFlow(null);
    }
  }, [editingEntry]);

  const showLegacySwaps =
    !draftHasReplacementLines && (legacyProductReplacements?.length ?? 0) > 0;

  return (
    <SlideModal
      visible={!!editingEntry}
      onRequestClose={onClose}
      animation="fade"
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <FsModalNavbar
          title="Edit Entry"
          subtitle={editingEntry ? `#${editingEntry.index + 1}` : undefined}
          colors={colors}
          accent={accent}
          left={{ label: "‹ Back", tone: "muted", onPress: onClose }}
          rightElement={
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accent }]}
              onPress={onSave}
            >
              <Text style={styles.confirmBtnText}>Save</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={[styles.dateRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onShowDatePicker(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.dateLabel, { color: colors.subtext }]}>Date</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {editEntryDate.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: colors.subtext, fontSize: 22 }]}>›</Text>
          </TouchableOpacity>

          <Text style={[styles.editTip, { color: colors.subtext }]}>
            <Text style={{ fontWeight: "600", color: colors.text }}>Add new stock (swapped slot)</Text>
            {` picks which original SKU was removed from a column, then the new SKU (one column, same as live restock). `}
            <Text style={{ fontWeight: "600", color: colors.text }}>Change product</Text>
            {` on original slots updates that row and any "new stock" lines that were replacing that SKU. On `}
            <Text style={{ fontWeight: "600", color: colors.text }}>New stock in swapped slots</Text>
            {`, it keeps the same "replacing" label and only changes the new SKU.`}
          </Text>

          {showLegacySwaps ? (
            <View
              style={[
                styles.replaceSection,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            >
              <Text style={[styles.replaceSectionTitle, { color: colors.text }]}>
                Product swaps (legacy format)
              </Text>
              {(legacyProductReplacements ?? []).map((r, ri) => {
                const from = products.find((p) => p.id === r.replacedProductId);
                const to = products.find((p) => p.id === r.replacedWithProductId);
                return (
                  <Text
                    key={`${r.machineId}-${ri}-${r.replacedProductId}-${r.replacedWithProductId}`}
                    style={[styles.replaceLine, { color: colors.subtext }]}
                  >
                    {from?.name ?? r.replacedProductId}: missing ×
                    {r.missingQtyRecorded} — replaced with{" "}
                    {to?.name ?? r.replacedWithProductId}
                  </Text>
                );
              })}
            </View>
          ) : null}

          {editingEntry &&
            draftMachines.length === 0 &&
            !showLegacySwaps && (
            <Text style={[styles.emptyNote, { color: colors.subtext, textAlign: "left", marginTop: 16 }]}>
              No product data recorded for this session.
            </Text>
          )}
          {editingEntry &&
            draftMachines.length === 0 &&
            showLegacySwaps && (
            <Text style={[styles.emptyNote, { color: colors.subtext, textAlign: "left", marginTop: 8 }]}>
              No quantities logged — only planogram swaps above.
            </Text>
          )}

          {draftMachines.map((me) => {
            const machineColorStr = machineColors[me.machineType];
            const machineColorSetting = me.machineType === "sweet"
              ? machineColorSettings.sweet
              : machineColorSettings.toy;
            const cap = me.machineType === "toy" ? 12 : 9;
            const layout = layoutMachines.find((m) => m.id === me.machineId);
            const slotCounts = new Map<string, number>();
            if (layout) {
              for (const id of layout.slots) {
                if (id) slotCounts.set(id, (slotCounts.get(id) ?? 0) + 1);
              }
            }

            return (
              <View
                key={me.machineId}
                style={[
                  styles.machineCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: machineColorStr + "55",
                    borderLeftColor: machineColorStr,
                    marginTop: 12,
                  },
                ]}
              >
                <View style={[styles.machineHeader, { overflow: "hidden" }]}>
                  <GradView
                    colors={machineColorSetting}
                    style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
                  />
                  <Text style={[styles.machineTitle, { color: machineColorStr }]}>
                    {MACHINE_LABELS[me.machineType]}
                  </Text>
                </View>

                <View style={styles.machineBody}>
                  {me.products.length === 0 ? (
                    <Text style={[styles.emptyMachine, { color: colors.subtext }]}>
                      No lines for this machine.
                    </Text>
                  ) : (
                    me.products.map((p, lineIndex) => {
                      const isRepl = Boolean(p.replacesProductId);
                      const prevRepl =
                        lineIndex > 0 &&
                        Boolean(me.products[lineIndex - 1]?.replacesProductId);
                      const showOriginalHeader =
                        !isRepl && (lineIndex === 0 || prevRepl);
                      const showNewHeader =
                        isRepl && (lineIndex === 0 || !prevRepl);

                      const product = products.find((pr) => pr.id === p.productId);
                      let max: number;
                      if (isRepl) {
                        max = cap;
                      } else {
                        const onLayout = slotCounts.get(p.productId) ?? 0;
                        const virtualSlots =
                          onLayout > 0
                            ? onLayout
                            : Math.max(1, Math.ceil(p.qty / cap) || 1);
                        max = virtualSlots * cap;
                      }
                      const replacedBy = p.replacesProductId
                        ? products.find((pr) => pr.id === p.replacesProductId)
                        : undefined;
                      const label = replacedBy
                        ? `Replacing ${replacedBy.name}`
                        : undefined;

                      return (
                        <View
                          key={`${me.machineId}-${lineIndex}-${p.productId}-${p.replacesProductId ?? "p"}`}
                        >
                          {showOriginalHeader ? (
                            <Text style={[styles.sectionHint, { color: colors.subtext }]}>
                              Original slots
                            </Text>
                          ) : null}
                          {showNewHeader ? (
                            <View
                              style={
                                lineIndex > 0 ? styles.replBlock : styles.replBlockFirst
                              }
                            >
                              <Text style={[styles.sectionHint, { color: colors.subtext }]}>
                                New stock in swapped slots
                              </Text>
                            </View>
                          ) : null}
                          <RestockProductRow
                            productId={p.productId}
                            product={product}
                            qty={p.qty}
                            max={max}
                            machineType={me.machineType}
                            colors={colors}
                            accent={accent}
                            replacingLabel={label}
                            onDecrement={() =>
                              onChangeLineQty(me.machineId, lineIndex, -1)
                            }
                            onIncrement={() =>
                              onChangeLineQty(me.machineId, lineIndex, +1)
                            }
                            onChangeProduct={
                              !isRepl
                                ? () => {
                                    setAddReplFlow(null);
                                    setReplaceFor({
                                      kind: "primary",
                                      machineId: me.machineId,
                                      lineIndex,
                                      category: me.machineType as ProductCategory,
                                    });
                                  }
                                : onChangeReplacementLineProduct
                                  ? () => {
                                      setAddReplFlow(null);
                                      setReplaceFor({
                                        kind: "replacement",
                                        machineId: me.machineId,
                                        lineIndex,
                                        category: me.machineType as ProductCategory,
                                      });
                                    }
                                  : undefined
                            }
                          />
                        </View>
                      );
                    })
                  )}
                </View>
                {me.products.some((p) => !p.replacesProductId) ? (
                  <TouchableOpacity
                    style={[
                      styles.addLineBtn,
                      {
                        borderColor: machineColorStr + "99",
                        backgroundColor: machineColorStr + "14",
                      },
                    ]}
                    onPress={() => {
                      setReplaceFor(null);
                      setAddReplFlow({
                        step: "replaced",
                        machineId: me.machineId,
                        machineType: me.machineType,
                      });
                    }}
                  >
                    <Text
                      style={[styles.addLineBtnText, { color: machineColorStr }]}
                    >
                      + Add new stock (swapped slot)
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}

          {editingEntry && (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: "#ef4444" }]}
              onPress={() => onDelete(editingEntry.index)}
            >
              <Text style={styles.deleteBtnText}>🗑 Delete this entry</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {replaceFor ? (
          <ProductPickerModal
            category={replaceFor.category}
            products={products}
            title={
              replaceFor.kind === "primary"
                ? "Change product"
                : "Change new stock product"
            }
            emptyMessage="No products match this machine type."
            onClose={() => setReplaceFor(null)}
            renderRow={(product, _rowAccent, rowColors) => (
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  { borderBottomColor: rowColors.border },
                ]}
                onPress={() => {
                  if (replaceFor.kind === "primary") {
                    const me = draftMachines.find(
                      (m) => m.machineId === replaceFor.machineId,
                    );
                    const line = me?.products[replaceFor.lineIndex];
                    if (
                      line &&
                      !line.replacesProductId &&
                      product.id !== line.productId
                    ) {
                      onChangePrimaryLineProduct(
                        replaceFor.machineId,
                        replaceFor.lineIndex,
                        product.id,
                      );
                    }
                  } else if (onChangeReplacementLineProduct) {
                    const me = draftMachines.find(
                      (m) => m.machineId === replaceFor.machineId,
                    );
                    const line = me?.products[replaceFor.lineIndex];
                    if (
                      line &&
                      line.replacesProductId &&
                      product.id !== line.productId
                    ) {
                      onChangeReplacementLineProduct(
                        replaceFor.machineId,
                        replaceFor.lineIndex,
                        product.id,
                      );
                    }
                  }
                  setReplaceFor(null);
                }}
              >
                <ProductThumb product={product} size={36} />
                <Text style={[styles.pickerRowName, { color: rowColors.text }]}>
                  {product.name}
                </Text>
                {product.id ===
                draftMachines.find((m) => m.machineId === replaceFor.machineId)
                  ?.products[replaceFor.lineIndex]?.productId ? (
                  <Text style={[styles.pickerCurrent, { color: rowColors.subtext }]}>
                    Current
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        ) : addReplFlow?.step === "replaced" ? (
          <ProductPickerModal
            category={addReplFlow.machineType as ProductCategory}
            products={addReplReplacedPickerProducts}
            title="What is it replacing?"
            emptyMessage="No original-slot products on this machine."
            onClose={() => setAddReplFlow(null)}
            renderRow={(product, _rowAccent, rowColors) => {
              const blocked = addReplPrimaryIdsAlreadyReplaced.has(product.id);
              if (blocked) {
                return (
                  <View
                    style={[
                      styles.pickerRow,
                      styles.pickerRowBlocked,
                      { borderBottomColor: rowColors.border },
                    ]}
                  >
                    <ProductThumb product={product} size={36} />
                    <Text
                      style={[styles.pickerRowName, { color: rowColors.subtext }]}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={[styles.pickerRowBlockedHint, { color: rowColors.subtext }]}
                    >
                      Already replacing
                    </Text>
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  style={[
                    styles.pickerRow,
                    { borderBottomColor: rowColors.border },
                  ]}
                  onPress={() => {
                    setAddReplFlow({
                      step: "new",
                      machineId: addReplFlow.machineId,
                      machineType: addReplFlow.machineType,
                      replacesProductId: product.id,
                    });
                  }}
                >
                  <ProductThumb product={product} size={36} />
                  <Text style={[styles.pickerRowName, { color: rowColors.text }]}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : addReplFlow?.step === "new" ? (
          <ProductPickerModal
            category={addReplFlow.machineType as ProductCategory}
            products={addReplNewPickerProducts}
            title="New product in slot"
            emptyMessage="No products match this machine type."
            onClose={() =>
              setAddReplFlow({
                step: "replaced",
                machineId: addReplFlow.machineId,
                machineType: addReplFlow.machineType,
              })
            }
            renderRow={(product, _rowAccent, rowColors) => (
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  { borderBottomColor: rowColors.border },
                ]}
                onPress={() => {
                  if (product.id !== addReplFlow.replacesProductId) {
                    onAddReplacementLine(
                      addReplFlow.machineId,
                      addReplFlow.replacesProductId,
                      product.id,
                    );
                  }
                  setAddReplFlow(null);
                }}
              >
                <ProductThumb product={product} size={36} />
                <Text style={[styles.pickerRowName, { color: rowColors.text }]}>
                  {product.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : null}

        <DatePickerModal
          visible={showDatePicker}
          value={editEntryDate}
          onConfirm={(d) => { onDateChange(d); onShowDatePicker(false); }}
          onCancel={() => onShowDatePicker(false)}
        />
      </SafeAreaView>
    </SlideModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  confirmBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#000" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  editTip: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
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
  replBlockFirst: { marginTop: 4 },
  emptyMachine: { fontSize: 13, paddingVertical: 10 },
  replaceSection: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  replaceSectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  replaceLine: { fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  emptyNote: { fontSize: 14, lineHeight: 20, maxWidth: 280 },
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
  machineTitle: { fontSize: 15, fontWeight: "700" },
  machineBody: { paddingHorizontal: 14, paddingBottom: 6 },
  addLineBtn: {
    marginHorizontal: 14,
    marginBottom: 12,
    marginTop: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  addLineBtnText: { fontSize: 13, fontWeight: "700" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  dateValue: { fontSize: 16, fontWeight: "600" },
  chevron: { fontSize: 20, fontWeight: "300" },
  deleteBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteBtnText: { fontSize: 15, fontWeight: "600", color: "#ef4444" },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerRowName: { flex: 1, fontSize: 14, fontWeight: "500" },
  pickerRowBlocked: { opacity: 0.45 },
  pickerRowBlockedHint: { fontSize: 11, fontWeight: "600", maxWidth: 118 },
  pickerCurrent: { fontSize: 11, fontWeight: "600" },
});
