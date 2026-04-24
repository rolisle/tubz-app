import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OpenStatusBadge } from "@/components/ui/open-status-badge";
import { Colors } from "@/constants/theme";
import type { Location } from "@/types";
import { openLocationInMaps } from "@/utils/maps";
import type { OpenStatus } from "@/utils/opening-hours";

export interface LocationHeaderProps {
  location: Location;
  openStatus: OpenStatus | null;
  colors: (typeof Colors)["light"];
}

export const LocationHeader = memo(function LocationHeader({
  location,
  openStatus,
  colors,
}: LocationHeaderProps) {
  const hasAddress = !!(location.address || location.city || location.postcode);
  return (
    <View style={styles.locationHeader}>
      <Text
        style={[styles.locationName, { color: colors.text }]}
        numberOfLines={2}
      >
        {location.name}
      </Text>
      {hasAddress ? (
        <TouchableOpacity
          onPress={() => openLocationInMaps(location)}
          activeOpacity={0.6}
        >
          <Text
            style={[styles.addressLine, { color: colors.subtext }]}
            numberOfLines={1}
          >
            {[location.address, location.city, location.postcode]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.addressEmpty, { color: colors.subtext }]}>
          No address set
        </Text>
      )}
      {openStatus && <OpenStatusBadge status={openStatus} />}
    </View>
  );
});

const styles = StyleSheet.create({
  locationHeader: { marginBottom: 2, gap: 4 },
  locationName: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  addressLine: { fontSize: 14 },
  addressEmpty: { fontSize: 13, fontStyle: "italic" },
});
