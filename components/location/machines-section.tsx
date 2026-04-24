import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { GradView } from "@/components/ui/grad-view";
import { MachineGrid } from "@/components/ui/machine-grid";
import { MACHINE_LABELS } from "@/constants/machine-labels";
import { Colors } from "@/constants/theme";
import type { AppColor } from "@/context/settings-context";
import type { Machine, MachineType, Product } from "@/types";

export interface MachinesSectionProps {
  type: MachineType;
  machines: Machine[];
  products: Product[];
  typeColor: string;
  gradientColors: AppColor;
  colors: (typeof Colors)["light"];
  onAddMachine: (type: MachineType) => void;
  onDeleteMachine: (machineId: string) => void;
  onUpdateMachine: (machine: Machine) => void;
}

export const MachinesSection = memo(function MachinesSection({
  type,
  machines,
  products,
  typeColor,
  gradientColors,
  colors,
  onAddMachine,
  onDeleteMachine,
  onUpdateMachine,
}: MachinesSectionProps) {
  const emoji = type === "sweet" ? "🍬" : "🪀";
  const label = type === "sweet" ? "Sweet Machines" : "Toy Machines";
  const maxSlots = 9;
  return (
    <View style={styles.machineSection}>
      <View style={styles.machineSectionHeader}>
        <Text style={[styles.machineSectionTitle, { color: typeColor }]}>
          {emoji} {label}
        </Text>
        <TouchableOpacity
          style={[styles.addMachineInlineBtn, { borderColor: typeColor }]}
          onPress={() => onAddMachine(type)}
        >
          <GradView
            colors={gradientColors}
            style={[StyleSheet.absoluteFill, { opacity: 0.12 }]}
          />
          <Text
            style={[styles.addMachineInlineBtnText, { color: typeColor }]}
          >
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      {machines.length === 0 && (
        <Text style={[styles.sectionNote, { color: colors.subtext }]}>
          No {type} machines yet.
        </Text>
      )}

      {machines.map((machine) => {
        const filledSlots = machine.slots.filter(Boolean).length;
        return (
          <View
            key={machine.id}
            style={[
              styles.machineCard,
              {
                backgroundColor: colors.card,
                borderColor: typeColor + "55",
                borderLeftColor: typeColor,
                borderLeftWidth: 3,
              },
            ]}
          >
            <View style={styles.machineHeader}>
              <View style={styles.machineTitleRow}>
                <Text style={[styles.machineTitle, { color: typeColor }]}>
                  {MACHINE_LABELS[machine.type]}
                </Text>
                <Text
                  style={[
                    styles.machineCount,
                    {
                      color:
                        filledSlots === maxSlots
                          ? colors.danger
                          : colors.subtext,
                    },
                  ]}
                >
                  {filledSlots}/{maxSlots}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onDeleteMachine(machine.id)}
                hitSlop={8}
              >
                <Text style={{ color: "#ef4444", fontSize: 13 }}>Remove</Text>
              </TouchableOpacity>
            </View>
            <MachineGrid
              machine={machine}
              products={products}
              onUpdate={onUpdateMachine}
            />
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionNote: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  machineCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  machineTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  machineTitle: { fontSize: 16, fontWeight: "700" },
  machineCount: { fontSize: 13, fontWeight: "500" },
  machineSection: { marginBottom: 8 },
  machineSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  machineSectionTitle: { fontSize: 15, fontWeight: "700" },
  addMachineInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 8,
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  addMachineInlineBtnText: { fontSize: 13, fontWeight: "600" },
});
