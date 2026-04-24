import { memo, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/theme";

export interface FsModalNavbarAction {
  label: string;
  onPress: () => void;
  /** Visual emphasis for the label colour. Defaults to `"neutral"`. */
  tone?: "neutral" | "accent" | "danger" | "muted";
  /** Override the resolved colour entirely. */
  color?: string;
  disabled?: boolean;
}

export interface FsModalNavbarProps {
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: string;
  /** Left-hand side action — commonly Cancel / Back. */
  left?: FsModalNavbarAction;
  /** Right-hand side action — commonly Save / Done. */
  right?: FsModalNavbarAction;
  /** Escape-hatch: render a custom node instead of the text action on the
   *  left side. Useful for filled pill buttons. */
  leftElement?: ReactNode;
  /** Escape-hatch: render a custom node instead of the text action on the
   *  right side. Useful for filled pill buttons. */
  rightElement?: ReactNode;
  colors: (typeof Colors)["light"];
  accent: string;
}

/** Shared top-bar for every full-screen modal in the app.
 *
 * Consolidates the duplicated `fsModalNavbar` / `fsModalSide` / `fsModalTitle`
 * style blocks that previously lived in each screen. The navbar renders a
 * fixed three-column row (left / title / right) so titles stay visually
 * centred even when only one side is populated. */
export const FsModalNavbar = memo(function FsModalNavbar({
  title,
  subtitle,
  left,
  right,
  leftElement,
  rightElement,
  colors,
  accent,
}: FsModalNavbarProps) {
  return (
    <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
      <View style={[styles.side, styles.leftSide]}>
        {leftElement ?? (left && renderAction(left, colors, accent))}
      </View>

      <View style={styles.center}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.subtext }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.rightSide]}>
        {rightElement ?? (right && renderAction(right, colors, accent))}
      </View>
    </View>
  );
});

function renderAction(
  action: FsModalNavbarAction,
  colors: (typeof Colors)["light"],
  accent: string,
) {
  return (
    <TouchableOpacity
      onPress={action.onPress}
      disabled={action.disabled}
      hitSlop={8}
    >
      <Text
        style={[
          styles.action,
          { color: resolveColor(action, colors, accent) },
          action.disabled && { opacity: 0.4 },
        ]}
      >
        {action.label}
      </Text>
    </TouchableOpacity>
  );
}

function resolveColor(
  action: FsModalNavbarAction,
  colors: (typeof Colors)["light"],
  accent: string,
): string {
  if (action.color) return action.color;
  switch (action.tone) {
    case "accent":
      return accent;
    case "danger":
      return colors.danger;
    case "muted":
      return colors.subtext;
    default:
      return colors.text;
  }
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { minWidth: 64 },
  leftSide: { alignItems: "flex-start" },
  rightSide: { alignItems: "flex-end" },
  center: { flex: 1, alignItems: "center" },
  action: { fontSize: 15, fontWeight: "600" },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: { fontSize: 12, textAlign: "center", marginTop: 2 },
});
