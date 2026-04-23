import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProvider } from '@/context/app-context';
import { SettingsProvider } from '@/context/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ensureNotificationChannel, requestNotificationPermission } from '@/utils/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // On Android 8+, a notification channel must exist before any notification
    // can be scheduled. ensureNotificationChannel() is a no-op on iOS/web.
    ensureNotificationChannel().then(() => requestNotificationPermission());
  }, []);

  return (
    <SettingsProvider>
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="location/[id]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProvider>
    </SettingsProvider>
  );
}
