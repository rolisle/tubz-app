import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MachineGrid } from '@/components/ui/machine-grid';
import { StockBadge } from '@/components/ui/stock-badge';
import { Colors, StockColors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Machine, MachineType, StockLevel } from '@/types';

const STOCK_OPTIONS: { label: string; value: StockLevel }[] = [
  { label: '1 Box', value: 'full' },
  { label: '½ Box', value: 'half' },
  { label: 'None', value: 'none' },
];

const MACHINE_LABELS: Record<MachineType, string> = {
  sweet: 'Sweet Machine 🍬',
  toy: 'Toy Machine 🪀',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface StockSelectorProps {
  value: StockLevel;
  onChange: (level: StockLevel) => void;
  colors: (typeof Colors)['light'];
}

function StockSelector({ value, onChange, colors }: StockSelectorProps) {
  return (
    <View style={styles.stockRow}>
      {STOCK_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        const sc = StockColors[opt.value];
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.stockOption,
              {
                backgroundColor: selected ? sc.bg : colors.card,
                borderColor: selected ? sc.dot : colors.border,
              },
            ]}>
            <View style={[styles.stockDot, { backgroundColor: selected ? sc.dot : colors.border }]} />
            <Text style={[styles.stockLabel, { color: selected ? sc.text : colors.subtext }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateLocation, deleteLocation, restockLocation, addMachine, updateMachine, deleteMachine } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const location = useMemo(
    () => state.locations.find((l) => l.id === id),
    [state.locations, id]
  );

  // Editable fields (local state, saved on blur)
  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.address ?? '');
  const [notes, setNotes] = useState(location?.notes ?? '');

  if (!location) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.subtext }]}>Location not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.tint, marginTop: 8 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const saveField = (field: 'name' | 'address' | 'notes', value: string) => {
    const trimmed = value.trim();
    if (field === 'name' && !trimmed) return; // don't blank the name
    updateLocation({ ...location, [field]: trimmed || undefined });
  };

  const handleRestock = () => {
    Alert.alert(
      'Mark as Restocked',
      'This will set stock to "1 Box" and record the current time as the last restock.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: () => restockLocation(location.id),
        },
      ]
    );
  };

  const handleDeleteLocation = () => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteLocation(location.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleAddMachine = (type: MachineType) => {
    const existing = location.machines.find((m) => m.type === type);
    if (existing) {
      Alert.alert('Already added', `A ${type} machine already exists for this location.`);
      return;
    }
    addMachine(location.id, type);
  };

  const handleMachineUpdate = useCallback(
    (machine: Machine) => updateMachine(location.id, machine),
    [location.id, updateMachine]
  );

  const handleDeleteMachine = (machineId: string) => {
    Alert.alert('Remove Machine', 'Remove this machine from the location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMachine(location.id, machineId),
      },
    ]);
  };

  const canAddSweet = !location.machines.find((m) => m.type === 'sweet');
  const canAddToy = !location.machines.find((m) => m.type === 'toy');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Nav bar */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.tint }]}>‹ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteLocation} hitSlop={8}>
            <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '500' }}>Delete</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Name */}
          <TextInput
            style={[styles.nameInput, { color: colors.text }]}
            value={name}
            onChangeText={setName}
            onBlur={() => saveField('name', name)}
            placeholder="Location name"
            placeholderTextColor={colors.subtext}
            returnKeyType="done"
          />

          {/* Address */}
          <TextInput
            style={[styles.addressInput, { color: colors.subtext }]}
            value={address}
            onChangeText={setAddress}
            onBlur={() => saveField('address', address)}
            placeholder="Address (optional)"
            placeholderTextColor={colors.border}
            returnKeyType="done"
          />

          {/* Last restock */}
          <Text style={[styles.restockLabel, { color: colors.subtext }]}>
            Last restocked: {formatDate(location.lastRestockedAt)}
          </Text>

          {/* Restock button */}
          <TouchableOpacity
            style={[styles.restockBtn, { backgroundColor: StockColors.full.bg, borderColor: StockColors.full.dot }]}
            onPress={handleRestock}>
            <Text style={[styles.restockBtnText, { color: StockColors.full.text }]}>
              ✓ Mark Restocked
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Machines */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Machines</Text>

          {location.machines.length === 0 && (
            <Text style={[styles.sectionNote, { color: colors.subtext }]}>
              No machines added yet. Add a sweet or toy machine below.
            </Text>
          )}

          {location.machines.map((machine) => (
            <View
              key={machine.id}
              style={[styles.machineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Machine header */}
              <View style={styles.machineHeader}>
                <Text style={[styles.machineTitle, { color: colors.text }]}>
                  {MACHINE_LABELS[machine.type]}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteMachine(machine.id)} hitSlop={8}>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>Remove</Text>
                </TouchableOpacity>
              </View>

              {/* Slots grid */}
              <View style={styles.gridWrap}>
                <View style={styles.gridLabelRow}>
                  <Text style={[styles.gridLabel, { color: colors.subtext }]}>Slots</Text>
                </View>
                <MachineGrid
                  machine={machine}
                  products={state.products}
                  onUpdate={handleMachineUpdate}
                />
              </View>
            </View>
          ))}

          {/* Add machine buttons */}
          {(canAddSweet || canAddToy) && (
            <View style={styles.addMachineRow}>
              {canAddSweet && (
                <TouchableOpacity
                  style={[styles.addMachineBtn, { borderColor: colors.tint, backgroundColor: colors.card }]}
                  onPress={() => handleAddMachine('sweet')}>
                  <Text style={styles.addMachineEmoji}>🍬</Text>
                  <Text style={[styles.addMachineBtnText, { color: colors.tint }]}>
                    Add Sweet Machine
                  </Text>
                </TouchableOpacity>
              )}
              {canAddToy && (
                <TouchableOpacity
                  style={[styles.addMachineBtn, { borderColor: colors.tint, backgroundColor: colors.card }]}
                  onPress={() => handleAddMachine('toy')}>
                  <Text style={styles.addMachineEmoji}>🪀</Text>
                  <Text style={[styles.addMachineBtnText, { color: colors.tint }]}>
                    Add Toy Machine
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Notes */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            onBlur={() => saveField('notes', notes)}
            placeholder="Add notes about this location…"
            placeholderTextColor={colors.subtext}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, fontWeight: '500' },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  nameInput: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    padding: 0,
  },
  addressInput: {
    fontSize: 14,
    marginBottom: 8,
    padding: 0,
  },
  restockLabel: {
    fontSize: 12,
    marginBottom: 10,
  },
  restockBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 20,
  },
  restockBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 20,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionNote: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  stockRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  stockOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  machineCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  machineStockLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridWrap: {
    gap: 8,
  },
  gridLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addMachineRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
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
  },
  addMachineEmoji: { fontSize: 18 },
  addMachineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
    marginTop: 8,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: { fontSize: 16 },
});
