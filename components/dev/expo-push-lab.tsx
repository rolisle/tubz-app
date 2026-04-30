/**
 * Minimal Expo Push workflow from
 * https://docs.expo.dev/push-notifications/push-notifications-setup/
 *
 * Does not call setNotificationHandler — the app already configures that in
 * utils/notifications.native.ts. Ensures Android `default` channel for FCM
 * deliveries as in the docs. Firebase is initialized from google-services.json
 * (Gradle / EAS) — no @react-native-firebase/app dependency.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";

async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: "Tubz · Expo push test",
    body: "If you see this, Expo push + FCM/APNs path is working.",
    data: { source: "expo-push-lab" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

async function registerForPushNotificationsAsync(): Promise<string> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9cfc68",
    });
  }

  if (!Device.isDevice) {
    throw new Error("Push requires a physical device (not a simulator).");
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      android: {},
    });
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    throw new Error("Notification permission not granted — cannot obtain Expo push token.");
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error("EAS projectId missing from config (extra.eas.projectId).");
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  return pushToken.data;
}

export interface ExpoPushLabProps {
  visible: boolean;
  colors: (typeof Colors)["light"];
  accent: string;
  onAlert: (title: string, message?: string) => void;
}

export const ExpoPushLab = memo(function ExpoPushLab({
  visible,
  colors,
  accent,
  onAlert,
}: ExpoPushLabProps) {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [registering, setRegistering] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || Platform.OS === "web") return;

    setRegistering(true);
    setRegisterError(null);
    registerForPushNotificationsAsync()
      .then((token) => {
        setExpoPushToken(token);
        setRegistering(false);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setRegisterError(msg);
        setExpoPushToken("");
        setRegistering(false);
      });

    const notificationListener = Notifications.addNotificationReceivedListener((n) => {
      setNotification(n);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(() => {
      /* tap handled — optional */
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [visible]);

  const onSendTestPush = useCallback(async () => {
    if (!expoPushToken) {
      onAlert("No token", "Wait for registration to finish or fix the error above.");
      return;
    }
    setSending(true);
    try {
      await sendPushNotification(expoPushToken);
      onAlert(
        "Request sent",
        "Expo’s push API accepted the request. You should get a notification shortly (device online, correct FCM/APNs setup).",
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onAlert("Send failed", msg);
    } finally {
      setSending(false);
    }
  }, [expoPushToken, onAlert]);

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Expo push</Text>
        <Text style={[styles.monoSmall, { color: colors.subtext }]}>
          Expo Push only runs on iOS/Android device builds, not in the browser.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>Expo push (FCM / APNs)</Text>
      <Text style={[styles.hint, { color: colors.subtext }]}>
        From Expo docs — uses getExpoPushTokenAsync + exp.host push API. Requires a dev/production
        build with credentials, not Expo Go.
      </Text>

      {registering ? (
        <View style={styles.rowCenter}>
          <ActivityIndicator color={accent} />
          <Text style={[styles.status, { color: colors.subtext }]}> Registering for push…</Text>
        </View>
      ) : registerError ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{registerError}</Text>
      ) : (
        <Text style={[styles.monoSmall, { color: colors.text }]} selectable>
          {expoPushToken || "—"}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          {
            borderColor: accent,
            opacity: sending || !expoPushToken ? 0.5 : 1,
          },
        ]}
        onPress={onSendTestPush}
        disabled={sending || !expoPushToken}
        activeOpacity={0.7}
      >
        <Text style={[styles.primaryBtnText, { color: accent }]}>
          {sending ? "Sending…" : "Send test via Expo Push API"}
        </Text>
      </TouchableOpacity>

      {notification ? (
        <View style={[styles.preview, { borderTopColor: colors.border }]}>
          <Text style={[styles.previewLabel, { color: colors.subtext }]}>Last received (foreground)</Text>
          <Text style={[styles.previewLine, { color: colors.text }]} numberOfLines={2}>
            {notification.request.content.title ?? ""}
          </Text>
          <Text style={[styles.previewLine, { color: colors.subtext }]} numberOfLines={3}>
            {notification.request.content.body ?? ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 17 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  status: { fontSize: 13 },
  monoSmall: { fontSize: 11, lineHeight: 15, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  errorText: { fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
  preview: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 4 },
  previewLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  previewLine: { fontSize: 13, lineHeight: 18 },
});
