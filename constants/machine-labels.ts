import type { MachineType } from "@/types";

/** Human-friendly labels for each machine type, reused by every surface
 *  that renders a machine header (restock tab, location detail, history
 *  editor, etc.). */
export const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: "Sweet Machine 🍬",
  toy: "Toy Machine 🪀",
};
