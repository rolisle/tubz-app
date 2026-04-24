import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { Appearance } from "react-native";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { AppProvider } from "@/context/app-context";
import { SettingsProvider } from "@/context/settings-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { installGlobalHandlers } from "@/utils/crash-log";
import {
  ensureNotificationChannel,
  requestNotificationPermission,
} from "@/utils/notifications";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme =
    useColorScheme() ?? Appearance.getColorScheme() ?? "light";

  useEffect(() => {
    installGlobalHandlers();
    ensureNotificationChannel().then(() => requestNotificationPermission());
    SystemUI.setBackgroundColorAsync(Colors[colorScheme].background);
  }, [colorScheme]);

  return (
    <SettingsProvider>
      <AppProvider>
        <ThemeProvider
          value={
            colorScheme === "dark"
              ? {
                  ...DarkTheme,
                  colors: {
                    ...DarkTheme.colors,
                    background: Colors.dark.background,
                  },
                }
              : {
                  ...DefaultTheme,
                  colors: {
                    ...DefaultTheme.colors,
                    background: Colors.light.background,
                  },
                }
          }
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="location/[id]"
              options={{ headerShown: false, animation: "none" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppProvider>
    </SettingsProvider>
  );
}
