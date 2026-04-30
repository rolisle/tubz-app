// Web/SSR stub — expo-notifications is not available on web.
// The .native.ts version of this file is used on iOS/Android.

import type { Location } from '../types';

export const RESTOCK_CHANNEL_ID = 'restock-reminders';

/** Android — mirrored for shared constants; channel is only created on native. */
export const DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID = 'default';

export async function ensureNotificationChannel(): Promise<void> {}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function cancelLocationNotification(_locationId: string): Promise<void> {}

export async function scheduleLocationNotification(_location: Location): Promise<void> {}

export async function scheduleTestRestockReminder(
  _identifier: string,
  _fireAt: Date,
  _body: string,
): Promise<void> {}

/** Android 12+ — opens the screen to allow “Alarms & reminders” if exact alarms are still blocked. */
export async function openAndroidExactAlarmSettings(): Promise<void> {}

export type NotificationDiagnostics = {
  permitted: boolean;
  status: string;
  scheduledTotal: number;
  restockScheduled: number;
};

export async function getNotificationDiagnostics(): Promise<NotificationDiagnostics | null> {
  return null;
}

export async function presentImmediateLocalNotification(): Promise<{
  ok: boolean;
  error?: string;
}> {
  return { ok: false, error: "Not available on web." };
}

export async function scheduleShortDelayNotificationTest(
  _seconds: number,
): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "Not available on web." };
}

export async function rescheduleAllNotifications(_locations: Location[]): Promise<void> {}
