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

import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MachineGrid } from '@/components/ui/machine-grid';
import { Colors } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Machine, MachineType } from '@/types';

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
  });
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateLocation, deleteLocation, restockLocation, addMachine, updateMachine, deleteMachine, updateStockCount } = useApp();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const location = useMemo(
    () => state.locations.find((l) => l.id === id),
    [state.locations, id]
  );

  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.address ?? '');
  const [notes, setNotes] = useState(location?.notes ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(
    location?.lastRestockedAt ? new Date(location.lastRestockedAt) : new Date()
  );

  const handleMachineUpdate = useCallback(
    (machine: Machine) => updateMachine(location?.id ?? '', machine),
    [location?.id, updateMachine]
  );

  const handleStockChange = useCallback(
    (machineId: string, productId: string, delta: number) =>
      updateStockCount(location?.id ?? '', machineId, productId, delta),
    [location?.id, updateStockCount]
  );

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
    if (field === 'name' && !trimmed) return;
    updateLocation({ ...location, [field]: trimmed || undefined });
  };

  const handleRestock = () => {
    restockLocation(location.id);
    setPickerDate(new Date());
  };

  const handleConfirmDate = (date: Date) => {
    updateLocation({ ...location, lastRestockedAt: date.toISOString() });
    setShowDatePicker(false);
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
          onPress: () => { deleteLocation(location.id); router.back(); },
        },
      ]
    );
  };

  const handleAddMachine = (type: MachineType) => {
    if (location.machines.find((m) => m.type === type)) {
      Alert.alert('Already added', `A ${type} machine already exists for this location.`);
      return;
    }
    addMachine(location.id, type);
  };


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

          {/* Last restock row */}
          <View style={styles.restockRow}>
            <View style={styles.restockInfo}>
              <Text style={[styles.restockMeta, { color: colors.subtext }]}>Last restocked</Text>
              <Text style={[styles.restockDate, { color: colors.text }]}>
                {location.lastRestockedAt ? formatDate(location.lastRestockedAt) : 'Never'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPickerDate(location.lastRestockedAt ? new Date(location.lastRestockedAt) : new Date());
                setShowDatePicker(true);
              }}
              style={[styles.editDateBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.editDateBtnText, { color: colors.subtext }]}>Edit date</Text>
            </TouchableOpacity>
          </View>

          {/* Restock button */}
          <TouchableOpacity
            style={[styles.restockBtn, { backgroundColor: colors.card, borderColor: colors.tint }]}
            onPress={handleRestock}>
            <Text style={[styles.restockBtnText, { color: colors.tint }]}>
              ✓ Mark Restocked Now
            </Text>
          </TouchableOpacity>

          <DatePickerModal
            visible={showDatePicker}
            value={pickerDate}
            onConfirm={handleConfirmDate}
            onCancel={() => setShowDatePicker(false)}
          />

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
              <View style={styles.machineHeader}>
                <Text style={[styles.machineTitle, { color: colors.text }]}>
                  {MACHINE_LABELS[machine.type]}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteMachine(machine.id)} hitSlop={8}>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>Remove</Text>
                </TouchableOpacity>
              </View>

              <MachineGrid
                machine={machine}
                products={state.products}
                onUpdate={handleMachineUpdate}
                onStockChange={(productId, delta) => handleStockChange(machine.id, productId, delta)}
              />
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
                  <Text style={[styles.addMachineBtnText, { color: colors.tint }]}>Add Sweet Machine</Text>
                </TouchableOpacity>
              )}
              {canAddToy && (
                <TouchableOpacity
                  style={[styles.addMachineBtn, { borderColor: colors.tint, backgroundColor: colors.card }]}
                  onPress={() => handleAddMachine('toy')}>
                  <Text style={styles.addMachineEmoji}>🪀</Text>
                  <Text style={[styles.addMachineBtnText, { color: colors.tint }]}>Add Toy Machine</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Notes */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
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
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  nameInput: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    padding: 0,
  },
  addressInput: { fontSize: 14, marginBottom: 8, padding: 0 },
  restockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  restockInfo: { flex: 1, gap: 1 },
  restockMeta: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  restockDate: { fontSize: 14, fontWeight: '600' },
  editDateBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editDateBtnText: { fontSize: 12, fontWeight: '500' },
  restockBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 20,
  },
  restockBtnText: { fontSize: 15, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  sectionLabel: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionNote: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
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
  machineTitle: { fontSize: 16, fontWeight: '700' },
  addMachineRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
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
  addMachineBtnText: { fontSize: 14, fontWeight: '600' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 96,
    marginTop: 8,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16 },
});
