import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DatePickerModal } from "@/components/ui/date-picker-modal";
import { RestockProductRow } from "@/components/restock-product-row";
import { GradView } from "@/components/ui/grad-view";
import { Colors } from "@/constants/theme";
import type { AppColor } from "@/context/settings-context";
import type { MachineType, Product, RestockEntry } from "@/types";

const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: "Sweet Machine 🍬",
  toy: "Toy Machine 🪀",
};

export interface HistoryEntryEditorModalProps {
  editingEntry: { index: number; entry: RestockEntry } | null;
  onClose: () => void;
  onSave: () => void;
  onDelete: (index: number) => void;
  editEntryDate: Date;
  onDateChange: (d: Date) => void;
  editEntryQtys: Record<string, Record<string, number>>;
  onChangeQty: (machineId: string, productId: string, delta: number) => void;
  showDatePicker: boolean;
  onShowDatePicker: (visible: boolean) => void;
  machineColors: Record<MachineType, string>;
  machineColorSettings: { sweet: AppColor; toy: AppColor };
  products: Product[];
  accent: string;
  colors: (typeof Colors)["light"];
}

export function HistoryEntryEditorModal({
  editingEntry,
  onClose,
  onSave,
  onDelete,
  editEntryDate,
  onDateChange,
  editEntryQtys,
  onChangeQty,
  showDatePicker,
  onShowDatePicker,
  machineColors,
  machineColorSettings,
  products,
  accent,
  colors,
}: HistoryEntryEditorModalProps) {
  return (
    <Modal
      visible={!!editingEntry}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        {/* Navbar */}
        <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: colors.subtext }]}>‹ Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.navTitle, { color: colors.text }]}>Edit Entry</Text>
            {editingEntry && (
              <Text style={[styles.navSub, { color: colors.subtext }]}>
                #{editingEntry.index + 1}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: accent }]}
            onPress={onSave}
          >
            <Text style={styles.confirmBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Date row */}
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

          {/* Machine entries */}
          {editingEntry && editingEntry.entry.machines.length === 0 && (
            <Text style={[styles.emptyNote, { color: colors.subtext, textAlign: "left", marginTop: 16 }]}>
              No product data recorded for this session.
            </Text>
          )}
          {editingEntry?.entry.machines.map((me) => {
            const machineColorStr = machineColors[me.machineType];
            const machineColorSetting = me.machineType === "sweet"
              ? machineColorSettings.sweet
              : machineColorSettings.toy;
            const max = me.machineType === "toy" ? 12 : 9;

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

                {me.products.map((p) => {
                  const product = products.find((pr) => pr.id === p.productId);
                  const qty = editEntryQtys[me.machineId]?.[p.productId] ?? p.qty;
                  return (
                    <RestockProductRow
                      key={p.productId}
                      productId={p.productId}
                      product={product}
                      qty={qty}
                      max={max}
                      machineType={me.machineType}
                      colors={colors}
                      onDecrement={() => onChangeQty(me.machineId, p.productId, -1)}
                      onIncrement={() => onChangeQty(me.machineId, p.productId, +1)}
                    />
                  );
                })}
              </View>
            );
          })}

          {/* Delete entry */}
          {editingEntry && (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: "#ef4444" }]}
              onPress={() => onDelete(editingEntry.index)}
            >
              <Text style={styles.deleteBtnText}>🗑 Delete this entry</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Inline date picker */}
        <DatePickerModal
          visible={showDatePicker}
          value={editEntryDate}
          onConfirm={(d) => { onDateChange(d); onShowDatePicker(false); }}
          onCancel={() => onShowDatePicker(false)}
        />
      </SafeAreaView>
    </Modal>
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
});
