import { StyleSheet, Text, View } from "react-native";
import type { OpenStatus } from "@/utils/opening-hours";

interface OpenStatusBadgeProps {
  status: OpenStatus;
}

/** Renders an "Open / Closed" badge with a colour-coded dot and sub-label. */
export function OpenStatusBadge({ status }: OpenStatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: status.color + "18",
          borderColor: status.color + "44",
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: status.color }]} />
      <Text style={[styles.text, { color: status.color }]}>
        {status.isOpen ? "Open" : "Closed"}
        {"  "}
        <Text style={[styles.sub, { color: status.color + "bb" }]}>
          {status.label}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
  sub: { fontWeight: "400" },
});
