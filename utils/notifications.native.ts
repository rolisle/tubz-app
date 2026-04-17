import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Location } from '../types';

/**
 * Identifier format: `restock-{locationId}`
 * One scheduled notification per location. We cancel and reschedule on
 * every state change so the notification is always accurate.
 */

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

  // If the 1-week warning has already passed, fire immediately
  const triggerAt = triggerDate > now ? triggerDate : new Date(now.getTime() + 2000);

  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const body =
    daysUntil <= 1
      ? `${location.name} is due for a restock today.`
      : `${location.name} is due for a restock in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;

  await Notifications.scheduleNotificationAsync({
    identifier: `restock-${location.id}`,
    content: {
      title: '📦 Restock Due Soon',
      body,
      data: { locationId: location.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
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
