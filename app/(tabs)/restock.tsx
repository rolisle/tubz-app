import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MachineCard,
  type RestockMachine,
} from '@/components/restock/machine-card';
import { GradView } from '@/components/ui/grad-view';
import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { primaryColor, useSettings } from '@/context/settings-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MachineType } from '@/types';
import { confirm } from '@/utils/confirm';
import { uid } from '@/utils/id';

const STORAGE_KEY = '@tubz_restock_v1';

export default function RestockScreen() {
  const { state } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings } = useSettings();
  const accent = primaryColor(settings.accentColor);
  const sweetColor = settings.sweetColor;
  const toyColor = settings.toyColor;

  const defaultMachines = (): RestockMachine[] => [
    { id: uid(), type: 'sweet', items: [] },
    { id: uid(), type: 'toy', items: [] },
  ];

  const [machines, setMachines] = useState<RestockMachine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: RestockMachine[] = JSON.parse(raw);
          setMachines(parsed.length > 0 ? parsed : defaultMachines());
        } catch {
          setMachines(defaultMachines());
        }
      } else {
        setMachines(defaultMachines());
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  }, [machines, loaded]);

  const addMachine = (type: MachineType) => {
    setMachines((prev) => [...prev, { id: uid(), type, items: [] }]);
  };

  const updateMachine = useCallback((updated: RestockMachine) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m)),
    );
  }, []);

  const removeMachine = async (id: string) => {
    const ok = await confirm(
      'Remove Machine',
      'Remove this machine from your restock list?',
      { confirmLabel: 'Remove', destructive: true },
    );
    if (ok) setMachines((prev) => prev.filter((m) => m.id !== id));
  };

  const clearAll = async () => {
    if (machines.length === 0) return;
    const ok = await confirm(
      'Clear Restock List',
      'Remove all machines and reset quantities?',
      { confirmLabel: 'Clear', destructive: true },
    );
    if (ok) setMachines([]);
  };

  const totalItems = useMemo(
    () =>
      machines.reduce((s, m) => s + m.items.reduce((ss, i) => ss + i.qty, 0), 0),
    [machines],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Restock</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {totalItems > 0
              ? `${totalItems} item${totalItems !== 1 ? 's' : ''} planned`
              : 'Plan your next restock run'}
          </Text>
        </View>
        {machines.length > 0 && (
          <TouchableOpacity onPress={clearAll} hitSlop={8}>
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '500' }}>
              Clear all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.addMachineRow}>
          <TouchableOpacity
            style={[
              styles.addMachineBtn,
              { borderColor: primaryColor(sweetColor) },
            ]}
            onPress={() => addMachine('sweet')}
          >
            <GradView
              colors={sweetColor}
              style={[StyleSheet.absoluteFill, { opacity: 0.12 }]}
            />
            <Text style={styles.addMachineEmoji}>🍬</Text>
            <Text
              style={[
                styles.addMachineBtnText,
                { color: primaryColor(sweetColor) },
              ]}
            >
              Sweet Machine
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.addMachineBtn,
              { borderColor: primaryColor(toyColor) },
            ]}
            onPress={() => addMachine('toy')}
          >
            <GradView
              colors={toyColor}
              style={[StyleSheet.absoluteFill, { opacity: 0.12 }]}
            />
            <Text style={styles.addMachineEmoji}>🪀</Text>
            <Text
              style={[
                styles.addMachineBtnText,
                { color: primaryColor(toyColor) },
              ]}
            >
              Toy Machine
            </Text>
          </TouchableOpacity>
        </View>

        {machines.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nothing to restock yet
            </Text>
            <Text style={[styles.emptyNote, { color: colors.subtext }]}>
              Add a sweet or toy machine above, then set how many of each product
              you need.
            </Text>
          </View>
        ) : (
          machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              products={state.products}
              colors={colors}
              accent={accent}
              machineColor={machine.type === 'sweet' ? sweetColor : toyColor}
              onChange={updateMachine}
              onRemove={() => removeMachine(machine.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  addMachineRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addMachineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: 14,
    overflow: 'hidden',
  },
  addMachineEmoji: { fontSize: 18 },
  addMachineBtnText: { fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyNote: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
