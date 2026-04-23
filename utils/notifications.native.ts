import { Asset } from 'expo-asset';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Location } from '../types';

export const RESTOCK_CHANNEL_ID = 'restock-reminders';

/**
 * Create (or update) the Android notification channel for restock reminders.
 * Safe to call multiple times — Android is idempotent for channels with the
 * same id. Must be called before any notification is scheduled on Android 8+,
 * otherwise notifications are silently dropped.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(RESTOCK_CHANNEL_ID, {
    name: 'Restock Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#9cfc68',
    showBadge: false,
  });
}

// Preload the app icon so we can attach it to notifications.
// On iOS it becomes a rich media attachment; on Android it's used as the
// setLargeIcon() override (otherwise Android falls back to the launcher
// foreground, which is the generic Expo placeholder).
let cachedIconUri: string | null = null;
async function getIconUri(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (cachedIconUri) return cachedIconUri;
  try {
    const asset = Asset.fromModule(require('../assets/images/icon.png'));
    if (!asset.localUri) await asset.downloadAsync();
    cachedIconUri = asset.localUri ?? asset.uri;
    return cachedIconUri;
  } catch {
    return null;
  }
}

/**
 * Identifier format: `restock-{locationId}`
 * One scheduled notification per location. We cancel and reschedule on
 * every state change so the notification is always accurate.
 */

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Request permission – call once at startup. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  // Notifications are not supported on web
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Calculate the ISO date when a location's restock is due. */
function dueDate(location: Location): Date | null {
  if (!location.restockPeriodWeeks) return null;
  const base = location.lastRestockedAt
    ? new Date(location.lastRestockedAt)
    : new Date(location.createdAt);
  const due = new Date(base);
  due.setDate(due.getDate() + location.restockPeriodWeeks * 7);
  return due;
}

/** Cancel any scheduled notification for this location. */
export async function cancelLocationNotification(locationId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(`restock-${locationId}`).catch(() => {});
}

/**
 * Schedule (or reschedule) a notification for a single location.
 *
 * Fires 7 days before the restock due date. If that trigger is already in
 * the past but the due date is still in the future, fires immediately.
 * Skips locations with no restock period set.
 */
export async function scheduleLocationNotification(location: Location): Promise<void> {
  if (Platform.OS === 'web') return;

  // Always cancel the old one first to avoid duplicates
  await cancelLocationNotification(location.id);

  if (!location.restockPeriodWeeks) return;

  const due = dueDate(location);
  if (!due) return;

  const now = new Date();

  // Notification fires 1 week before the due date
  const triggerDate = new Date(due);
  triggerDate.setDate(triggerDate.getDate() - 7);

  // Don't schedule if due date is already past (already overdue, no notification needed)
  if (due <= now) return;

  // If the 7-day warning window has already passed (e.g. restockPeriodWeeks === 1),
  // fire on the due date itself rather than immediately. Firing at now+2s would
  // almost always be cancelled by the next rescheduleAllNotifications call triggered
  // by a state update, so the notification would never actually appear.
  const triggerAt = triggerDate > now ? triggerDate : due;

  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const body =
    daysUntil <= 1
      ? `${location.name} is due for a restock today.`
      : `${location.name} is due for a restock in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;

  const iconUri = await getIconUri();

  await Notifications.scheduleNotificationAsync({
    identifier: `restock-${location.id}`,
    content: {
      title: '📦 Restock Due Soon',
      body,
      data: { locationId: location.id },
      // attachments is an iOS-only API — guard it so Android doesn't reject the payload
      ...(Platform.OS === 'ios' && iconUri
        ? { attachments: [{ identifier: 'app-icon', url: iconUri, type: 'public.png' }] }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
      // Android 8+ requires every notification to belong to a channel
      ...(Platform.OS === 'android' ? { channelId: RESTOCK_CHANNEL_ID } : {}),
    },
  });
}

/** Cancel all restock-* notifications and reschedule from scratch. */
export async function rescheduleAllNotifications(locations: Location[]): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel only restock-* identifiers so other notification types are unaffected
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('restock-'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );

  // Re-schedule each location that has a restock period
  await Promise.all(
    locations
      .filter((l) => l.restockPeriodWeeks)
      .map((l) => scheduleLocationNotification(l))
  );
}
