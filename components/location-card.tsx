import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Location } from '@/types';
import { StockBadge } from './ui/stock-badge';

interface LocationCardProps {
  location: Location;
  onPress: () => void;
}

function formatLastRestock(iso: string | null): string {
  if (!iso) return 'Never restocked';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Restocked today';
  if (diffDays === 1) return 'Restocked yesterday';
  if (diffDays < 7) return `Restocked ${diffDays}d ago`;
  if (diffDays < 30) return `Restocked ${Math.floor(diffDays / 7)}w ago`;
  return `Restocked ${Math.floor(diffDays / 30)}mo ago`;
}

const MACHINE_ICONS: Record<string, string> = {
  sweet: '🍬',
  toy: '🪀',
};

export function LocationCard({ location, onPress }: LocationCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {location.name}
          </Text>
          {location.address ? (
            <Text style={[styles.address, { color: colors.subtext }]} numberOfLines={1}>
              {location.address}
            </Text>
          ) : null}
          <Text style={[styles.restock, { color: colors.subtext }]}>
            {formatLastRestock(location.lastRestockedAt)}
          </Text>
        </View>
        <StockBadge level={location.stockLevel} />
      </View>

      {location.machines.length > 0 && (
        <View style={[styles.machines, { borderTopColor: colors.border }]}>
          {location.machines.map((m) => {
            const filled = m.slots.filter(Boolean).length;
            return (
              <View key={m.id} style={styles.machineChip}>
                <Text style={styles.machineIcon}>{MACHINE_ICONS[m.type]}</Text>
                <Text style={[styles.machineLabel, { color: colors.subtext }]}>
                  {m.type === 'sweet' ? 'Sweet' : 'Toy'} · {filled}/9
                </Text>
                <StockBadge level={m.stockLevel} size="sm" />
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  address: {
    fontSize: 13,
  },
  restock: {
    fontSize: 12,
    marginTop: 2,
  },
  machines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  machineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  machineIcon: {
    fontSize: 14,
  },
  machineLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
