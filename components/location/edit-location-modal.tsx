import { memo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FsModalNavbar } from "@/components/ui/fs-modal-navbar";
import { SlideModal } from "@/components/ui/slide-modal";
import { Colors } from "@/constants/theme";

export interface EditLocationForm {
  name: string;
  address: string;
  city: string;
  postcode: string;
}

export interface EditLocationModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
  form: EditLocationForm;
  onChangeForm: (patch: Partial<EditLocationForm>) => void;
  errors: Record<string, string>;
  onClearError: (field: keyof EditLocationForm) => void;
  colors: (typeof Colors)["light"];
  accent: string;
}

export const EditLocationModal = memo(function EditLocationModal({
  visible,
  onCancel,
  onSave,
  form,
  onChangeForm,
  errors,
  onClearError,
  colors,
  accent,
}: EditLocationModalProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  return (
    <SlideModal animation="fade" visible={visible} onRequestClose={onCancel}>
      <SafeAreaView
        style={[styles.fsModalSafe, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FsModalNavbar
            title="Edit Location"
            colors={colors}
            accent={accent}
            left={{ label: "Cancel", tone: "danger", onPress: onCancel }}
            right={{ label: "Save", tone: "accent", onPress: onSave }}
          />
          <ScrollView
            contentContainerStyle={styles.editSheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.editFieldLabel, { color: colors.subtext }]}>
              Name <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.editField,
                {
                  color: colors.text,
                  borderColor: errors.name
                    ? "#ef4444"
                    : focusedField === "eName"
                      ? accent
                      : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={form.name}
              onChangeText={(v) => {
                onChangeForm({ name: v });
                onClearError("name");
              }}
              onFocus={() => setFocusedField("eName")}
              onBlur={() => setFocusedField(null)}
              placeholder="Location name"
              placeholderTextColor={colors.subtext}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="next"
            />
            {errors.name ? (
              <Text style={styles.editFieldError}>{errors.name}</Text>
            ) : null}

            <Text style={[styles.editFieldLabel, { color: colors.subtext }]}>
              Address <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.editField,
                {
                  color: colors.text,
                  borderColor: errors.address
                    ? "#ef4444"
                    : focusedField === "eAddress"
                      ? accent
                      : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={form.address}
              onChangeText={(v) => {
                onChangeForm({ address: v });
                onClearError("address");
              }}
              onFocus={() => setFocusedField("eAddress")}
              onBlur={() => setFocusedField(null)}
              placeholder="1st line of address"
              placeholderTextColor={colors.subtext}
              selectionColor={`${accent}44`}
              cursorColor={accent}
              returnKeyType="next"
            />
            {errors.address ? (
              <Text style={styles.editFieldError}>{errors.address}</Text>
            ) : null}

            <View style={styles.editFieldRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    styles.editFieldHalf,
                    {
                      color: colors.text,
                      borderColor: errors.city
                        ? "#ef4444"
                        : focusedField === "eCity"
                          ? accent
                          : colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={form.city}
                  onChangeText={(v) => {
                    onChangeForm({ city: v });
                    onClearError("city");
                  }}
                  onFocus={() => setFocusedField("eCity")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="City *"
                  placeholderTextColor={colors.subtext}
                  selectionColor={`${accent}44`}
                  cursorColor={accent}
                  returnKeyType="next"
                />
                {errors.city ? (
                  <Text style={styles.editFieldError}>{errors.city}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    styles.editFieldHalf,
                    {
                      color: colors.text,
                      borderColor: errors.postcode
                        ? "#ef4444"
                        : focusedField === "ePostcode"
                          ? accent
                          : colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={form.postcode}
                  onChangeText={(v) => {
                    onChangeForm({ postcode: v });
                    onClearError("postcode");
                  }}
                  onFocus={() => setFocusedField("ePostcode")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Postcode *"
                  placeholderTextColor={colors.subtext}
                  selectionColor={`${accent}44`}
                  cursorColor={accent}
                  returnKeyType="done"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {errors.postcode ? (
                  <Text style={styles.editFieldError}>{errors.postcode}</Text>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SlideModal>
  );
});

const styles = StyleSheet.create({
  fsModalSafe: { flex: 1 },
  editSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 6,
  },
  editFieldError: { fontSize: 12, color: "#ef4444", marginTop: 3 },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 8,
  },
  editField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editFieldRow: { flexDirection: "row", gap: 10 },
  editFieldHalf: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
