// Web/SSR stub — expo-notifications is not available on web.
// The .native.ts version of this file is used on iOS/Android.

import type { Location } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function cancelLocationNotification(_locationId: string): Promise<void> {}

export async function scheduleLocationNotification(_location: Location): Promise<void> {}

export async function rescheduleAllNotifications(_locations: Location[]): Promise<void> {}
