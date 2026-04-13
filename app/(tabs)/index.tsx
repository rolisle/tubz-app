import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationCard } from '@/components/location-card';
import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Location } from '@/types';

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface StatCardProps {
  label: string;
  value: number | string;
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

type TabId = 'all' | 'city';

interface TabBarProps {
  active: TabId;
  onChange: (t: TabId) => void;
  colors: (typeof Colors)['light'];
}

function TabBar({ active, onChange, colors }: TabBarProps) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'city', label: 'By City' },
  ];
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[styles.tab, active === t.id && { backgroundColor: colors.tint }]}
          onPress={() => onChange(t.id)}
          activeOpacity={0.8}>
          <Text style={[styles.tabLabel, { color: active === t.id ? '#fff' : colors.subtext }]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('all');

  const stats = useMemo(() => {
    const totalLocations = state.locations.length;
    const totalMachines = state.locations.reduce((sum, l) => sum + l.machines.length, 0);
    const totalProducts = state.products.length;
    return { totalLocations, totalMachines, totalProducts };
  }, [state.locations, state.products]);

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

  const cityGroups = useMemo(() => {
    const map = new Map<string, Location[]>();
    for (const loc of state.locations) {
      const key = loc.city?.trim() || 'No City';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(loc);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === 'No City') return 1;
        if (b === 'No City') return -1;
        return a.localeCompare(b);
      })
      .map(([city, data]) => ({ title: city, data }));
  }, [state.locations]);

  const navigateTo = (loc: Location) =>
    router.push({ pathname: '/location/[id]', params: { id: loc.id } });

  const header = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.wordmark, { color: colors.text }]}>Tubz</Text>
        <Text style={[styles.date, { color: colors.subtext }]}>{todayLabel()}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Locations" value={stats.totalLocations} colors={colors} />
        <StatCard label="Machines" value={stats.totalMachines} colors={colors} />
        <StatCard label="Products" value={stats.totalProducts} colors={colors} />
      </View>

      {/* Recent restocks */}
      {recentRestocks.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Restocks</Text>
          {recentRestocks.map((loc) => (
            <LocationCard key={loc.id} location={loc} onPress={() => navigateTo(loc)} />
          ))}
        </View>
      )}

      {/* Tab bar */}
      {state.locations.length > 0 && (
        <TabBar active={tab} onChange={setTab} colors={colors} />
      )}
    </>
  );

  if (state.locations.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {header}
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (tab === 'city') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SectionList
          sections={cityGroups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={header}
          renderSectionHeader={({ section }) => (
            <View style={styles.cityHeader}>
              <Text style={[styles.cityTitle, { color: colors.text }]}>{section.title}</Text>
              <Text style={[styles.cityCount, { color: colors.subtext }]}>
                {section.data.length} location{section.data.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <LocationCard location={item} onPress={() => navigateTo(item)} />
          )}
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {header}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Locations</Text>
          {state.locations.map((loc) => (
            <LocationCard key={loc.id} location={loc} onPress={() => navigateTo(loc)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  wordmark: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  date: { fontSize: 14, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  statValue: { fontSize: 26, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  cityTitle: { fontSize: 18, fontWeight: '700' },
  cityCount: { fontSize: 13 },
  empty: {
    marginTop: 40,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyNote: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
