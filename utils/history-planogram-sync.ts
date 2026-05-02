import type {
  Machine,
  MachineType,
  RestockEntry,
  RestockMachineEntry,
  RestockProduct,
} from "@/types";

function capForMachineType(type: MachineType): number {
  return type === "toy" ? 12 : 9;
}

function replacementLines(
  me: RestockMachineEntry | undefined,
): RestockProduct[] {
  if (!me) return [];
  return me.products.filter((p) => Boolean(p.replacesProductId));
}

/**
 * Applies "new stock in swapped slots" product-id edits from a saved history entry
 * to the live planogram. Only meaningful when the edited entry is the latest session.
 */
export function applyReplacementNewStockProductEdits(
  machines: Machine[],
  oldEntry: RestockEntry,
  newMachineEntries: RestockMachineEntry[],
): { machines: Machine[]; changed: boolean } {
  let changed = false;
  const result = machines.map((m) => ({
    ...m,
    slots: [...m.slots],
    stockCounts: { ...m.stockCounts },
  }));

  for (const newMe of newMachineEntries) {
    const machine = result.find((x) => x.id === newMe.machineId);
    if (!machine) continue;
    const oldMe = oldEntry.machines.find((x) => x.machineId === newMe.machineId);
    const oldR = replacementLines(oldMe);
    const newR = replacementLines(newMe);
    if (newR.length === 0) continue;

    const cap = capForMachineType(machine.type);
    const usedOld = new Set<number>();

    for (const nline of newR) {
      let j = oldR.findIndex(
        (o, i) =>
          !usedOld.has(i) &&
          o.replacesProductId === nline.replacesProductId &&
          o.productId === nline.productId,
      );
      if (j < 0) {
        j = oldR.findIndex(
          (o, i) =>
            !usedOld.has(i) &&
            o.replacesProductId === nline.replacesProductId,
        );
      }
      if (j < 0) continue;
      usedOld.add(j);
      const oline = oldR[j];
      if (oline.productId === nline.productId) continue;

      const fromId = oline.productId;
      const toId = nline.productId;
      const slotBudget = Math.max(1, Math.ceil(oline.qty / cap));
      let remaining = Math.min(
        slotBudget,
        machine.slots.filter((s) => s === fromId).length,
      );
      if (remaining < 1) continue;

      for (let si = 0; si < machine.slots.length && remaining > 0; si++) {
        if (machine.slots[si] === fromId) {
          machine.slots[si] = toId;
          remaining--;
          changed = true;
        }
      }

      if (!machine.slots.some((s) => s === fromId)) {
        const nextSc = { ...machine.stockCounts };
        delete nextSc[fromId];
        machine.stockCounts = nextSc;
      }
    }
  }

  return { machines: result, changed };
}

function findAddedReplacementLines(
  oldMe: RestockMachineEntry | undefined,
  newMe: RestockMachineEntry,
): RestockProduct[] {
  const oldR = replacementLines(oldMe);
  const newR = replacementLines(newMe);
  const usedOld = new Set<number>();
  const added: RestockProduct[] = [];

  for (const nline of newR) {
    let j = oldR.findIndex(
      (o, i) =>
        !usedOld.has(i) &&
        o.replacesProductId === nline.replacesProductId &&
        o.productId === nline.productId,
    );
    if (j >= 0) {
      usedOld.add(j);
      continue;
    }
    j = oldR.findIndex(
      (o, i) =>
        !usedOld.has(i) &&
        o.replacesProductId === nline.replacesProductId,
    );
    if (j >= 0) {
      usedOld.add(j);
      continue;
    }
    added.push(nline);
  }

  return added;
}

/**
 * For the latest history entry, applies planogram slot swaps for replacement lines
 * that were added in the editor (not present/matched on the previous entry snapshot).
 */
export function applyAddedReplacementLinesToMachines(
  machines: Machine[],
  oldEntry: RestockEntry,
  newMachineEntries: RestockMachineEntry[],
): { machines: Machine[]; changed: boolean } {
  let changed = false;
  const result = machines.map((m) => ({
    ...m,
    slots: [...m.slots],
    stockCounts: { ...m.stockCounts },
  }));

  for (const newMe of newMachineEntries) {
    const machine = result.find((x) => x.id === newMe.machineId);
    if (!machine) continue;
    const oldMe = oldEntry.machines.find((x) => x.machineId === newMe.machineId);
    const added = findAddedReplacementLines(oldMe, newMe);
    const cap = capForMachineType(machine.type);

    for (const line of added) {
      const fromId = line.replacesProductId!;
      const toId = line.productId;
      let remaining = Math.min(
        Math.max(1, Math.ceil(line.qty / cap)),
        machine.slots.filter((s) => s === fromId).length,
      );
      if (remaining < 1) continue;

      for (let si = 0; si < machine.slots.length && remaining > 0; si++) {
        if (machine.slots[si] === fromId) {
          machine.slots[si] = toId;
          remaining--;
          changed = true;
        }
      }

      if (!machine.slots.some((s) => s === fromId)) {
        const nextSc = { ...machine.stockCounts };
        delete nextSc[fromId];
        machine.stockCounts = nextSc;
      }
    }
  }

  return { machines: result, changed };
}
