import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationCard } from '@/components/location-card';
import { Colors, StockColors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { StockLevel } from '@/types';

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface StatCardProps {
  label: string;
  value: number;
  accent?: string;
  colors: (typeof Colors)['light'];
}

function StatCard({ label, value, accent, colors }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null,
      ]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.subtext }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const stats = useMemo(() => {
    const total = state.locations.length;
    const byLevel = (l: StockLevel) => state.locations.filter((loc) => loc.stockLevel === l).length;
    return {
      total,
      full: byLevel('full'),
      half: byLevel('half'),
      none: byLevel('none'),
    };
  }, [state.locations]);

  const attentionLocations = useMemo(
    () => state.locations.filter((l) => l.stockLevel === 'none' || l.stockLevel === 'half'),
    [state.locations]
  );

  const recentRestocks = useMemo(
    () =>
      [...state.locations]
        .filter((l) => l.lastRestockedAt)
        .sort(
          (a, b) =>
            new Date(b.lastRestockedAt!).getTime() - new Date(a.lastRestockedAt!).getTime()
        )
        .slice(0, 3),
    [state.locations]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.wordmark, { color: colors.text }]}>Tubz</Text>
            <Text style={[styles.date, { color: colors.subtext }]}>{todayLabel()}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Locations" value={stats.total} colors={colors} />
          <StatCard
            label="Low Stock"
            value={stats.half}
            accent={StockColors.half.dot}
            colors={colors}
          />
          <StatCard
            label="Out of Stock"
            value={stats.none}
            accent={StockColors.none.dot}
            colors={colors}
          />
        </View>

        {/* Attention section */}
        {attentionLocations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Needs Attention</Text>
            {attentionLocations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onPress={() => router.push({ pathname: '/location/[id]', params: { id: loc.id } })}
              />
            ))}
          </View>
        )}

        {/* Recent restocks */}
        {recentRestocks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Restocks</Text>
            {recentRestocks.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onPress={() => router.push({ pathname: '/location/[id]', params: { id: loc.id } })}
              />
            ))}
          </View>
        )}

        {/* All locations */}
        {state.locations.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Locations</Text>
            {state.locations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onPress={() => router.push({ pathname: '/location/[id]', params: { id: loc.id } })}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No locations yet</Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              Add your first location in the Locations tab to start tracking stock.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(tabs)/locations')}>
              <Text style={styles.emptyBtnText}>Go to Locations</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  empty: {
    marginTop: 40,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyNote: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
