import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationCard } from '@/components/location-card';
import { GradView } from '@/components/ui/grad-view';
import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import {
  ACCENT_PRESETS,
  AppColor,
  AppSettings,
  colorEquals,
  primaryColor,
  SWEET_PRESETS,
  TOY_PRESETS,
  useSettings,
} from '@/context/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

function todayLabel() {
  return new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/* ─── Settings modal ─────────────────────────────────────────── */

interface SwatchRowProps {
  label: string;
  presets: { label: string; value: AppColor }[];
  current: AppColor;
  onChange: (v: AppColor) => void;
  colors: (typeof Colors)['light'];
}

const SwatchRow = memo(function SwatchRow({
  label,
  presets,
  current,
  onChange,
  colors,
}: SwatchRowProps) {
  return (
    <View style={styles.swatchSection}>
      <Text style={[styles.swatchLabel, { color: colors.subtext }]}>{label}</Text>
      <View style={styles.swatchRow}>
        {presets.map((p) => {
          const isActive = colorEquals(current, p.value);
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => onChange(p.value)}
              activeOpacity={0.75}
              style={[
                styles.swatch,
                p.value.length === 1 && { backgroundColor: p.value[0] },
                p.value.length > 1 && { backgroundColor: p.value[0] },
                isActive && styles.swatchActive,
              ]}
            >
              {p.value.length > 1 && (
                <LinearGradient
                  colors={p.value as [string, string, ...string[]]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  colors: (typeof Colors)['light'];
}

function SettingsModal({ visible, onClose, colors }: SettingsModalProps) {
  const { settings, setSetting } = useSettings();

  const sections: {
    label: string;
    key: keyof AppSettings;
    presets: { label: string; value: AppColor }[];
  }[] = [
    { label: 'Accent / Tab Colour',      key: 'accentColor', presets: ACCENT_PRESETS },
    { label: 'Sweet Machine Colour',      key: 'sweetColor',  presets: SWEET_PRESETS },
    { label: 'Toy Machine Colour',        key: 'toyColor',    presets: TOY_PRESETS },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>⚙️  Settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={[styles.sheetClose, { color: colors.subtext }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sheetSection, { color: colors.text }]}>Theme</Text>

        {sections.map((s) => (
          <SwatchRow
            key={s.key}
            label={s.label}
            presets={s.presets}
            current={settings[s.key]}
            onChange={(v) => setSetting(s.key, v)}
            colors={colors}
          />
        ))}

        {/* Live preview */}
        <View style={[styles.previewRow, { borderTopColor: colors.border }]}>
          <View
            style={[
              styles.previewChip,
              { backgroundColor: primaryColor(settings.sweetColor) + '22', borderColor: primaryColor(settings.sweetColor) },
            ]}
          >
            <GradView
              colors={settings.sweetColor}
              style={[StyleSheet.absoluteFill, { borderRadius: 10, opacity: 0.12 }]}
            />
            <Text style={[styles.previewChipText, { color: primaryColor(settings.sweetColor) }]}>
              🍬 Sweet Machine
            </Text>
          </View>
          <View
            style={[
              styles.previewChip,
              { backgroundColor: primaryColor(settings.toyColor) + '22', borderColor: primaryColor(settings.toyColor) },
            ]}
          >
            <GradView
              colors={settings.toyColor}
              style={[StyleSheet.absoluteFill, { borderRadius: 10, opacity: 0.12 }]}
            />
            <Text style={[styles.previewChipText, { color: primaryColor(settings.toyColor) }]}>
              🪀 Toy Machine
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Stat card ──────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: number | string;
  colors: (typeof Colors)['light'];
}

function StatCard({ label, value, colors }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.subtext }]}>{label}</Text>
    </View>
  );
}

/* ─── Main screen ────────────────────────────────────────────── */

export default function DashboardScreen() {
  const { state } = useApp();
  const { settings } = useSettings();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);

  const stats = useMemo(() => ({
    totalLocations: state.locations.length,
    totalMachines:  state.locations.reduce((s, l) => s + l.machines.length, 0),
    totalProducts:  state.products.length,
  }), [state.locations, state.products]);

  const recentRestocks = useMemo(
    () =>
      [...state.locations]
        .filter((l) => l.lastRestockedAt)
        .sort((a, b) =>
          new Date(b.lastRestockedAt!).getTime() - new Date(a.lastRestockedAt!).getTime()
        )
        .slice(0, 3),
    [state.locations],
  );

  const navigateTo = (id: string) =>
    router.push({ pathname: '/location/[id]', params: { id } });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.wordmark, { color: colors.text }]}>Tubz</Text>
            <Text style={[styles.date, { color: colors.subtext }]}>{todayLabel()}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            hitSlop={8}
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Locations" value={stats.totalLocations} colors={colors} />
          <StatCard label="Machines"  value={stats.totalMachines}  colors={colors} />
          <StatCard label="Products"  value={stats.totalProducts}  colors={colors} />
        </View>

        {/* Recent restocks */}
        {recentRestocks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Restocks</Text>
            {recentRestocks.map((loc) => (
              <LocationCard key={loc.id} location={loc} onPress={() => navigateTo(loc.id)} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {state.locations.length === 0 && (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No locations yet</Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              Add your first location in the Locations tab to start tracking stock.
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/locations')}>
              <GradView colors={settings.accentColor} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Go to Locations</Text>
              </GradView>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  wordmark: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  date: { fontSize: 14, marginTop: 2 },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  settingsIcon: { fontSize: 18 },
  // Stats
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
  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  // Empty state
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
  // Settings modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetClose: { fontSize: 15, fontWeight: '500' },
  sheetSection: { fontSize: 13, fontWeight: '700', paddingHorizontal: 20, marginBottom: 4, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 },
  // Swatches
  swatchSection: { paddingHorizontal: 20, marginBottom: 16 },
  swatchLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  // Preview
  previewRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewChipText: { fontSize: 13, fontWeight: '600' },
});
