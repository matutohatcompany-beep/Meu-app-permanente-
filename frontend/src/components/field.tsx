import React, { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { Icon, IconName } from "@/src/components/icon";
import { maskMoneyDigits } from "@/src/logic/money";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

// ---------------------------------------------------------------------------
// Labeled text input
// ---------------------------------------------------------------------------
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  icon,
  testID,
  hint,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  multiline?: boolean;
  icon?: IconName;
  testID?: string;
  hint?: string;
  autoFocus?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
}) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.inputWrap, focused && s.focused, multiline && s.multilineWrap]}>
        {icon && <Icon name={icon} size={18} color={colors.muted} />}
        <TextInput
          testID={testID}
          style={[s.input, multiline && s.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Money input (digits typed as centavos -> live BRL mask). Emits integer cents.
// ---------------------------------------------------------------------------
export function MoneyField({
  label,
  cents,
  onChange,
  testID,
  big,
  hint,
  tone,
}: {
  label?: string;
  cents: number;
  onChange: (cents: number) => void;
  testID?: string;
  big?: boolean;
  hint?: string;
  tone?: "default" | "warning" | "error";
}) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const display = maskMoneyDigits(String(cents)).text;
  const borderTone =
    tone === "error" ? colors.error : tone === "warning" ? colors.warning : undefined;
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={s.label}>{label}</Text>}
      <View
        style={[
          s.inputWrap,
          big && s.bigWrap,
          focused && s.focused,
          borderTone && { borderColor: borderTone, borderWidth: 2 },
        ]}
      >
        <TextInput
          testID={testID}
          style={[s.input, big && s.bigInput]}
          value={display}
          onChangeText={(t) => onChange(maskMoneyDigits(t).cents)}
          keyboardType="number-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hint && <Text style={[s.hint, tone === "error" && { color: colors.error }]}>{hint}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Quantity stepper
// ---------------------------------------------------------------------------
export function Stepper({
  value,
  onChange,
  min = 1,
  testID,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  testID?: string;
}) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={s.stepper} testID={testID}>
      <Pressable
        style={s.stepBtn}
        onPress={() => onChange(Math.max(min, value - 1))}
        testID={testID ? `${testID}-minus` : undefined}
      >
        <Icon name="minus" size={20} color={colors.onSurface} />
      </Pressable>
      <Text style={s.stepValue}>{value}</Text>
      <Pressable
        style={s.stepBtn}
        onPress={() => onChange(value + 1)}
        testID={testID ? `${testID}-plus` : undefined}
      >
        <Icon name="plus" size={20} color={colors.onSurface} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------
export function Segmented({
  options,
  value,
  onChange,
  testID,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  testID?: string;
}) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={s.segmented} testID={testID}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            testID={testID ? `${testID}-${o.key}` : undefined}
            style={[s.segment, active && { backgroundColor: colors.brandPrimary }]}
          >
            <Text
              style={[
                s.segmentText,
                { color: active ? colors.onBrandPrimary : colors.onSurfaceTertiary },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Select button (opens a sheet elsewhere)
// ---------------------------------------------------------------------------
export function SelectButton({
  label,
  value,
  placeholder,
  onPress,
  icon,
  testID,
}: {
  label?: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  icon?: IconName;
  testID?: string;
}) {
  const s = useFieldStyles();
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && <Text style={s.label}>{label}</Text>}
      <Pressable testID={testID} onPress={onPress} style={s.inputWrap}>
        {icon && <Icon name={icon} size={18} color={colors.muted} />}
        <Text style={[s.input, { color: value ? colors.onSurface : colors.muted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const useFieldStyles = makeStyles((c) => ({
  label: { fontSize: 14, fontWeight: "700", color: c.onSurfaceSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  multilineWrap: { alignItems: "flex-start", paddingVertical: spacing.sm },
  bigWrap: { minHeight: 68, backgroundColor: c.brandTertiary, borderColor: c.borderStrong },
  focused: { borderColor: c.brandPrimary, borderWidth: 2 },
  input: { flex: 1, fontSize: 16, color: c.onSurface, fontWeight: "600", paddingVertical: spacing.md },
  bigInput: { fontSize: 30, fontWeight: "900", color: c.onSurface },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 12, color: c.muted, marginTop: 4 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    alignSelf: "flex-start",
  },
  stepBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  stepValue: { fontSize: 20, fontWeight: "900", color: c.onSurface, minWidth: 44, textAlign: "center" },
  segmented: {
    flexDirection: "row",
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, height: 42, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 14, fontWeight: "800" },
}));
