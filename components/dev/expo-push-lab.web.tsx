/**
 * Web: never import expo-notifications — its module side effects call localStorage and crash
 * under Node/SSR or non-browser polyfills (see ServerRegistrationModule.web.js).
 */
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

export interface ExpoPushLabProps {
  visible: boolean;
  colors: (typeof Colors)["light"];
  accent: string;
  onAlert: (title: string, message?: string) => void;
}

export const ExpoPushLab = memo(function ExpoPushLab({ colors }: ExpoPushLabProps) {
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
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  monoSmall: { fontSize: 11, lineHeight: 15, fontFamily: "monospace" },
});
