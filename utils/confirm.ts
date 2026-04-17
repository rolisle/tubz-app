import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * On web uses window.confirm; on native uses Alert.alert.
 * Returns a promise that resolves to true if confirmed, false if cancelled.
 */
export function confirm(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Convenience wrapper for destructive delete confirmations.
 */
export function confirmDelete(itemName: string, message?: string): Promise<boolean> {
  return confirm(
    `Delete ${itemName}?`,
    message ?? 'This cannot be undone.'
  );
}
