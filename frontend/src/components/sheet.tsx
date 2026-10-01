import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Button } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

// ---------------------------------------------------------------------------
// Base bottom sheet (Modal)
// ---------------------------------------------------------------------------
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
}) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID={testID}>
        <View style={s.grabber} />
        <View style={s.headerRow}>
          <Text style={s.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} testID="sheet-close-button">
            <Icon name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Select sheet — searchable option list
// ---------------------------------------------------------------------------
export interface Option {
  key: string;
  label: string;
  sublabel?: string;
}

export function SelectSheet({
  visible,
  onClose,
  title,
  options,
  onSelect,
  searchable,
  emptyLabel,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: Option[];
  onSelect: (key: string) => void;
  searchable?: boolean;
  emptyLabel?: string;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(q.toLowerCase()),
      )
    : options;
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID={testID}>
      {searchable && (
        <View style={s.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Pesquisar..."
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            testID="select-sheet-search"
          />
        </View>
      )}
      <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
        {filtered.length === 0 ? (
          <Text style={s.empty}>{emptyLabel ?? "Nada encontrado."}</Text>
        ) : (
          filtered.map((o) => (
            <Pressable
              key={o.key}
              style={s.option}
              testID={`option-${o.key}`}
              onPress={() => {
                onSelect(o.key);
                setQ("");
                onClose();
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.optionLabel}>{o.label}</Text>
                {o.sublabel && <Text style={s.optionSub}>{o.sublabel}</Text>}
              </View>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Confirm sheet
// ---------------------------------------------------------------------------
export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel = "Confirmar",
  danger,
  onConfirm,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  testID?: string;
}) {
  const s = useStyles();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID={testID}>
      {message && <Text style={s.message}>{message}</Text>}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          label={confirmLabel}
          variant={danger ? "danger" : "primary"}
          testID="confirm-sheet-confirm"
          onPress={() => {
            onConfirm();
            onClose();
          }}
        />
        <Button label="Cancelar" variant="ghost" onPress={onClose} testID="confirm-sheet-cancel" />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.borderStrong,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { fontSize: 19, fontWeight: "900", color: c.onSurface },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 16, color: c.onSurface },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  optionLabel: { fontSize: 16, fontWeight: "700", color: c.onSurface },
  optionSub: { fontSize: 13, color: c.muted, marginTop: 2 },
  empty: { textAlign: "center", color: c.muted, paddingVertical: spacing.xl, fontSize: 15 },
  message: { fontSize: 15, color: c.onSurfaceSecondary, lineHeight: 22 },
}));
