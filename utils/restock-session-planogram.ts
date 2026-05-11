import type { Machine, RestockSessionReplacementLine } from "@/types";

/**
 * Applies in-session "new stock in swapped slots" lines to the planogram.
 * Call when restock completes (Done): each line with positive qty moves one column
 * from `replacesProductId` to `productId`. Order matches line order.
 */
export function applyPendingRestockReplacements(
  machines: Machine[],
  replacementLines: Record<string, RestockSessionReplacementLine[]>,
): Machine[] {
  return machines.map((m) => {
    const lines = (replacementLines[m.id] ?? []).filter((l) => l.qty > 0);
    if (lines.length === 0) return m;

    const slots = [...m.slots];
    for (const line of lines) {
      const idx = slots.findIndex((s) => s === line.replacesProductId);
      if (idx < 0) continue;
      slots[idx] = line.productId;
    }

    const present = new Set(
      slots.filter((s): s is string => Boolean(s)),
    );
    const stockCounts: Record<string, number> = {};
    for (const [pid, v] of Object.entries(m.stockCounts)) {
      if (present.has(pid)) stockCounts[pid] = v;
    }

    return { ...m, slots, stockCounts };
  });
}
