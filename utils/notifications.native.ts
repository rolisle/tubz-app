import { Asset } from "expo-asset";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { breadcrumb } from "./crash-log";
import type { Location } from "../types";

export const RESTOCK_CHANNEL_ID = "restock-reminders";

/** Android: FCM / Expo push often uses the `default` channel — ensure it exists with high importance. */
export const DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID = "default";

/**
 * Create (or update) Android notification channels used by local + remote notifications.
 * Must run before scheduling; without channels, notifications are silently dropped on Android 8+.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  const restock = {
    name: "Restock Reminders",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#9cfc68",
    showBadge: false,
  };

  const general = {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#9cfc68",
    showBadge: false,
  };

  await Notifications.setNotificationChannelAsync(RESTOCK_CHANNEL_ID, restock);
  await Notifications.setNotificationChannelAsync(
    DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID,
    general,
  );
}

// Preload the app icon so we can attach it to notifications.
// On iOS it becomes a rich media attachment; on Android it's used as the
// setLargeIcon() override (otherwise Android falls back to the launcher
// foreground, which is the generic Expo placeholder).
let cachedIconUri: string | null = null;
async function getIconUri(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (cachedIconUri) return cachedIconUri;
  try {
    const asset = Asset.fromModule(require("../assets/images/icon.png"));
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
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function notificationAccessAllowed(
  s: Notifications.NotificationPermissionsStatus,
): boolean {
  if (s.granted) return true;
  if (
    Platform.OS === "ios" &&
    s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  return false;
}

/** Request permission – call once at startup. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  // Notifications are not supported on web
  if (Platform.OS === "web") return false;

  const existing = await Notifications.getPermissionsAsync();
  if (notificationAccessAllowed(existing)) return true;

  const result = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
    android: {},
  });
  return notificationAccessAllowed(result);
}

/**
 * Android: open system UI to allow exact alarms for this package. There is no
 * modal-style prompt — `SCHEDULE_EXACT_ALARM` is special access. As of Android
 * 14 many builds require this (or USE_EXACT_ALARM in the manifest) or
 * expo-notifications falls back to inexact alarms that often never fire on time.
 */
export async function openAndroidExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== "android") return;
  const pkg = Constants.expoConfig?.android?.package;
  if (!pkg) return;
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM,
      { data: `package:${pkg}` },
    );
  } catch (e) {
    console.warn("[notifications] openAndroidExactAlarmSettings:", e);
  }
}

/** Read-only snapshot for Settings → notification self-tests. */
export type NotificationDiagnostics = {
  permitted: boolean;
  status: string;
  scheduledTotal: number;
  /** Count of `restock-*` jobs (real location reminders). */
  restockScheduled: number;
};

export async function getNotificationDiagnostics(): Promise<NotificationDiagnostics | null> {
  if (Platform.OS === "web") return null;

  const p = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const restockScheduled = scheduled.filter((n) =>
    n.identifier.startsWith("restock-"),
  ).length;

  return {
    permitted: notificationAccessAllowed(p),
    status: String(p.status),
    scheduledTotal: scheduled.length,
    restockScheduled,
  };
}

const SETTINGS_IMMEDIATE_TEST_ID = "tubz-settings-immediate-test";
const SETTINGS_DELAY_TEST_ID = "tubz-settings-delay-test";

/**
 * Present a local notification right now (`trigger: null`). Does not use the
 * alarm scheduler — sanity check for permission + channel + handler.
 */
export async function presentImmediateLocalNotification(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (Platform.OS === "web") {
    return { ok: false, error: "Not available on web." };
  }

  try {
    if (!(await requestNotificationPermission())) {
      return { ok: false, error: "Notification permission not granted." };
    }
    await ensureNotificationChannel();
    const iconUri = await getIconUri();

    await Notifications.cancelScheduledNotificationAsync(
      SETTINGS_IMMEDIATE_TEST_ID,
    ).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: SETTINGS_IMMEDIATE_TEST_ID,
      content: {
        title: "Tubz · instant test",
        body: "Immediate notification (no alarm clock). If you see this, alerts are working.",
        data: { settingsTest: "immediate" },
        ...(Platform.OS === "android"
          ? { channelId: DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID }
          : {}),
        ...(Platform.OS === "ios" && iconUri
          ? {
              attachments: [
                { identifier: "app-icon", url: iconUri, type: "public.png" },
              ],
            }
          : {}),
      },
      trigger: null,
    });
    breadcrumb(
      `presentImmediateLocalNotification: ok id=${SETTINGS_IMMEDIATE_TEST_ID}`,
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Schedule a one-shot notification in a few seconds (uses the same alarm path
 * as restock reminders — useful to confirm delayed delivery).
 */
export async function scheduleShortDelayNotificationTest(
  seconds: number,
): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS === "web") {
    return { ok: false, error: "Not available on web." };
  }

  const sec = Math.min(120, Math.max(1, Math.floor(seconds)));

  try {
    if (!(await requestNotificationPermission())) {
      return { ok: false, error: "Notification permission not granted." };
    }
    await ensureNotificationChannel();
    const iconUri = await getIconUri();

    await Notifications.cancelScheduledNotificationAsync(SETTINGS_DELAY_TEST_ID).catch(
      () => {},
    );

    await Notifications.scheduleNotificationAsync({
      identifier: SETTINGS_DELAY_TEST_ID,
      content: {
        title: "Tubz · delayed test",
        body: `Fires in about ${sec}s — uses the same scheduler as restock reminders.`,
        data: { settingsTest: "delay", seconds: sec },
        ...(Platform.OS === "android"
          ? { channelId: DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID }
          : {}),
        ...(Platform.OS === "ios" && iconUri
          ? {
              attachments: [
                { identifier: "app-icon", url: iconUri, type: "public.png" },
              ],
            }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: sec,
        repeats: false,
      },
    });
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const listed = scheduled.some((n) => n.identifier === SETTINGS_DELAY_TEST_ID);
    breadcrumb(
      `scheduleShortDelayNotificationTest: ${sec}s listed=${listed} totalScheduled=${scheduled.length}`,
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
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
export async function cancelLocationNotification(
  locationId: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(
    `restock-${locationId}`,
  ).catch(() => {});
}

/**
 * Schedule (or reschedule) a notification for a single location.
 *
 * Fires 7 days before the restock due date. If that window is already past
 * but the due date is still in the future (e.g. 1-week period), fires on the
 * due date instead of a near-immediate time that the next reschedule could cancel.
 */
export async function scheduleLocationNotification(
  location: Location,
): Promise<void> {
  return scheduleLocationNotificationWithPermission(location, false);
}

async function scheduleLocationNotificationWithPermission(
  location: Location,
  hasPermission: boolean,
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    if (!hasPermission) {
      const allowed = await requestNotificationPermission();
      if (!allowed) {
        breadcrumb(
          `scheduleLocationNotification: permission denied, skip "${location.name}"`,
        );
        return;
      }
    }

    // Ensure the Android channel exists before every schedule attempt.
    // This is idempotent, so calling it here (rather than only at startup)
    // removes the race condition between app-context hydration and _layout.tsx
    // initialisation. Without this, scheduleNotificationAsync can be called
    // before the channel exists, throwing a native Java exception that kills
    // the process before any JS error handler can catch it.
    await ensureNotificationChannel();
    breadcrumb(`scheduleLocationNotification: channel ready for "${location.name}" (${location.id})`);

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

    const daysUntil = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const body =
      daysUntil <= 1
        ? `${location.name} is due for a restock today.`
        : `${location.name} is due for a restock in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}.`;

    const iconUri = await getIconUri();

    breadcrumb(`scheduleNotificationAsync: firing for "${location.name}" at ${triggerAt.toISOString()}`);
    await Notifications.scheduleNotificationAsync({
      identifier: `restock-${location.id}`,
      content: {
        title: "📦 Restock Due Soon",
        body,
        data: { locationId: location.id },
        // channelId belongs in the content on Android, NOT in the trigger
        ...(Platform.OS === "android" ? { channelId: RESTOCK_CHANNEL_ID } : {}),
        // attachments is an iOS-only API — guard it so Android doesn't reject the payload
        ...(Platform.OS === "ios" && iconUri
          ? {
              attachments: [
                { identifier: "app-icon", url: iconUri, type: "public.png" },
              ],
            }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerAt,
      },
    });
  } catch (e) {
    // Swallow scheduling errors — a failed notification must never crash the app.
    console.warn("[notifications] scheduleLocationNotification failed:", e);
  }
}

/** Dashboard test menu — identifiers must NOT use `restock-` so `rescheduleAllNotifications` never cancels them. */
export async function scheduleTestRestockReminder(
  identifier: string,
  fireAt: Date,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const allowed = await requestNotificationPermission();
    if (!allowed) {
      breadcrumb("scheduleTestRestockReminder: permission denied");
      return;
    }
    await ensureNotificationChannel();
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(
      () => {},
    );

    const iconUri = await getIconUri();
    breadcrumb(
      `scheduleTestRestockReminder: "${identifier}" at ${fireAt.toISOString()}`,
    );
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: "📦 Restock Due Soon",
        body,
        data: { test: true },
        ...(Platform.OS === "android" ? { channelId: RESTOCK_CHANNEL_ID } : {}),
        ...(Platform.OS === "ios" && iconUri
          ? {
              attachments: [
                { identifier: "app-icon", url: iconUri, type: "public.png" },
              ],
            }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
  } catch (e) {
    console.warn("[notifications] scheduleTestRestockReminder failed:", e);
  }
}

/** Cancel all restock-* notifications and reschedule from scratch. */
export async function rescheduleAllNotifications(
  locations: Location[],
): Promise<void> {
  if (Platform.OS === "web") return;

  const allowed = await requestNotificationPermission();
  if (!allowed) {
    breadcrumb("rescheduleAllNotifications: permission not granted; skipping");
    return;
  }

  // Only touch `restock-*` (real locations). Test / dev reminders use other prefixes.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith("restock-"))
      .map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(
          () => {},
        ),
      ),
  );

  // Re-schedule each location that has a restock period
  await Promise.all(
    locations
      .filter((l) => l.restockPeriodWeeks)
      .map((l) => scheduleLocationNotificationWithPermission(l, true)),
  );
}
