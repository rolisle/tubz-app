import { Alert, Platform } from "react-native";

export interface ConfirmOptions {
  /** Label for the destructive/primary button. Defaults to "OK". */
  confirmLabel?: string;
  /** Label for the dismiss button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, styles the primary button as destructive on native. */
  destructive?: boolean;
}

/**
 * Cross-platform confirmation dialog.
 * On web uses window.confirm; on native uses Alert.alert.
 * Resolves `true` when confirmed, `false` when cancelled.
 */
export function confirm(
  title: string,
  message?: string,
  opts: ConfirmOptions = {},
): Promise<boolean> {
  const {
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    destructive = false,
  } = opts;

  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(text));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Convenience wrapper for destructive delete confirmations.
 */
export function confirmDelete(
  itemName: string,
  message?: string,
): Promise<boolean> {
  return confirm(`Delete ${itemName}?`, message ?? "This cannot be undone.", {
    confirmLabel: "Delete",
    destructive: true,
  });
}
