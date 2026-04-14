import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Location } from "@/types";

interface LocationCardProps {
  location: Location;
  onPress: () => void;
}

function formatLastRestock(iso: string | null): string {
  if (!iso) return "Never restocked";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Restocked today";
  if (diffDays === 1) return "Restocked yesterday";
  if (diffDays < 7) return `Restocked ${diffDays}d ago`;
  if (diffDays < 30) return `Restocked ${Math.floor(diffDays / 7)}w ago`;
  return `Restocked ${Math.floor(diffDays / 30)}mo ago`;
}

const MACHINE_ICONS: Record<string, string> = {
  sweet: "🍬",
  toy: "🪀",
};

function openMaps(location: Location) {
  const query = [location.address, location.postcode]
    .filter(Boolean)
    .join(", ");
  if (!query) return;
  const encoded = encodeURIComponent(query);
  // Opens in Google Maps app if installed, falls back to maps.google.com in browser
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
}

export function LocationCard({ location, onPress }: LocationCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const hasAddress = !!(location.address || location.postcode);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {location.name}
          </Text>
          {hasAddress ? (
            <Text
              style={[styles.address, { color: colors.subtext }]}
              numberOfLines={1}
            >
              {[location.address, location.city, location.postcode]
                .filter(Boolean)
                .join(", ")}
            </Text>
          ) : null}
          <Text style={[styles.restock, { color: colors.subtext }]}>
            {formatLastRestock(location.lastRestockedAt)}
          </Text>
        </View>

        {hasAddress && (
          <TouchableOpacity
            onPress={() => openMaps(location)}
            hitSlop={8}
            style={[
              styles.mapBtn,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.mapIcon}>🔎</Text>
          </TouchableOpacity>
        )}
      </View>

      {location.machines.length > 0 && (
        <View style={[styles.machines, { borderTopColor: colors.border }]}>
          {(["sweet", "toy"] as const)
            .map((type) => ({
              type,
              count: location.machines.filter((m) => m.type === type).length,
            }))
            .filter(({ count }) => count > 0)
            .map(({ type, count }) => (
              <View
                key={type}
                style={[
                  styles.machineChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={styles.machineIcon}>{MACHINE_ICONS[type]}</Text>
                <Text style={[styles.machineLabel, { color: colors.subtext }]}>
                  {count} {type === "sweet" ? "Sweet" : "Toy"}{count !== 1 ? "s" : ""}
                </Text>
              </View>
            ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: { fontSize: 16, fontWeight: "600" },
  address: { fontSize: 13 },
  restock: { fontSize: 12, marginTop: 2 },
  mapBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mapIcon: { fontSize: 18 },
  machines: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  machineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  machineIcon: { fontSize: 13 },
  machineLabel: { fontSize: 12, fontWeight: "500" },
});
