import { StyleSheet, Text, View } from 'react-native';

import { StockColors } from '@/constants/theme';
import type { StockLevel } from '@/types';

const LABELS: Record<StockLevel, string> = {
  full: '1 Box',
  half: '½ Box',
  none: 'None',
};

interface StockBadgeProps {
  level: StockLevel;
  size?: 'sm' | 'md';
}

export function StockBadge({ level, size = 'md' }: StockBadgeProps) {
  const colors = StockColors[level];
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }, isSmall && styles.dotSm]} />
      <Text style={[styles.label, { color: colors.text }, isSmall && styles.labelSm]}>
        {LABELS[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
});
