import { StyleSheet } from "react-native";

export const SS = StyleSheet.create({
  // ── Safe area wrapper ───────────────────────────────────────────────────────
  flex1: { flex: 1 },

  // ── Tab screen header row ───────────────────────────────────────────────────
  /** Full-width row sitting at the top of every tab screen. */
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  /** Large bold page title. */
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  /** Smaller subtitle line underneath the title. */
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // ── Header action chip (bordered pill button in the header row) ─────────────
  /** Outlined small button aligned to the title block. */
  headerBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Screen body scroll container ────────────────────────────────────────────
  /** Standard scrollable content area with generous bottom clearance. */
  screenContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  /** List/FlatList contentContainerStyle. */
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Search bar ──────────────────────────────────────────────────────────────
  /** Outer row — compose margin overrides per screen. */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptyNote: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Full-screen slide modal ─────────────────────────────────────────────────
  fsModalSafe: { flex: 1 },
  fsModalContent: {
    padding: 20,
    gap: 4,
    paddingBottom: 40,
  },

  // ── Form fields ─────────────────────────────────────────────────────────────
  /** ALL-CAPS label above a form field. */
  formFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  /** Standard single-line bordered text input. */
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 4,
  },

  // ── Section header label (inside list content) ──────────────────────────────
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    paddingVertical: 8,
    marginTop: 4,
  },
});
