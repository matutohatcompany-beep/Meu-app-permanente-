import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Icon, IconName } from "@/src/components/icon";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  size = "lg",
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: "lg" | "md";
  testID?: string;
  style?: ViewStyle;
}) {
  const s = useBtnStyles();
  const { colors } = useTheme();
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.brandSecondary,
    ghost: "transparent",
    danger: colors.error,
    accent: colors.accent,
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onBrandSecondary,
    ghost: colors.brandPrimary,
    danger: colors.onError,
    accent: colors.onAccent,
  }[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        size === "md" && s.btnMd,
        { backgroundColor: bg },
        variant === "ghost" && s.ghost,
        (disabled || loading) && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === "md" ? 18 : 20} color={fg} />}
          <Text style={[s.label, size === "md" && s.labelMd, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const useBtnStyles = makeStyles((c) => ({
  btn: {
    minHeight: 54,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  btnMd: { minHeight: 44, borderRadius: radius.md },
  ghost: { borderWidth: 1.5, borderColor: c.borderStrong },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  label: { fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  labelMd: { fontSize: 15 },
}));

// ---------------------------------------------------------------------------
// Icon button
// ---------------------------------------------------------------------------
export function IconButton({
  name,
  onPress,
  color,
  bg,
  size = 22,
  testID,
}: {
  name: IconName;
  onPress: () => void;
  color?: string;
  bg?: string;
  size?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg ?? "transparent",
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon name={name} size={size} color={color ?? colors.onSurface} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}) {
  const s = useCardStyles();
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[s.card, style]}>
      {children}
    </View>
  );
}

const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
}));

// ---------------------------------------------------------------------------
// Section title
// ---------------------------------------------------------------------------
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const s = useMiscStyles();
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const s = useMiscStyles();
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: color ?? colors.accent }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function EmptyState({
  icon = "info",
  title,
  subtitle,
  actionLabel,
  onAction,
  testID,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const s = useMiscStyles();
  const { colors } = useTheme();
  return (
    <View style={s.empty} testID={testID}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={30} color={colors.muted} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle && <Text style={s.emptySub}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={{ marginTop: spacing.lg }}>
          <Button label={actionLabel} onPress={onAction} icon="plus" size="md" />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Badge / Pill
// ---------------------------------------------------------------------------
export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "error" | "accent" | "info";
}) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
    success: { bg: colors.success, fg: colors.onSuccess },
    warning: { bg: colors.warning, fg: colors.onWarning },
    error: { bg: colors.error, fg: colors.onError },
    accent: { bg: colors.accent, fg: colors.onAccent },
    info: { bg: colors.info, fg: colors.onInfo },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: map.bg,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen header (sticky, safe-area aware)
// ---------------------------------------------------------------------------
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const s = useHeaderStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={s.headerRow}>
        {back && (
          <IconButton name="back" onPress={() => router.back()} testID="header-back-button" />
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
    </View>
  );
}

const useHeaderStyles = makeStyles((c) => ({
  header: {
    backgroundColor: c.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontSize: 24, fontWeight: "900", color: c.onSurface, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: c.muted, marginTop: 2, fontWeight: "600" },
}));

// ---------------------------------------------------------------------------
// Floating action button
// ---------------------------------------------------------------------------
export function FAB({
  icon = "plus",
  onPress,
  label,
  testID,
  bottomExtra = 0,
}: {
  icon?: IconName;
  onPress: () => void;
  label?: string;
  testID?: string;
  bottomExtra?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: "absolute",
          right: spacing.lg,
          bottom: insets.bottom + spacing.lg + bottomExtra,
          backgroundColor: colors.brandPrimary,
          borderRadius: radius.pill,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: label ? spacing.lg : 0,
          height: 56,
          width: label ? undefined : 56,
          justifyContent: "center",
          ...StyleSheet.flatten({
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 8,
          }),
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Icon name={icon} size={26} color={colors.onBrandPrimary} />
      {label && (
        <Text style={{ color: colors.onBrandPrimary, fontWeight: "800", fontSize: 16 }}>{label}</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Key-value row
// ---------------------------------------------------------------------------
export function KV({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "default" | "success" | "error" | "muted";
}) {
  const s = useMiscStyles();
  const { colors } = useTheme();
  const valueColor =
    tone === "success"
      ? colors.success
      : tone === "error"
        ? colors.error
        : tone === "muted"
          ? colors.muted
          : colors.onSurfaceSecondary;
  return (
    <View style={s.kvRow}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={[s.kvValue, { color: valueColor }, strong && { fontWeight: "900", fontSize: 17 }]}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Horizontal chip row (sticky filter row) — chips never wrap.
// ---------------------------------------------------------------------------
export function ChipRow({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  testIDPrefix?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 56, justifyContent: "center" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" }}
      >
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              testID={testIDPrefix ? `${testIDPrefix}-${o.key}` : undefined}
              onPress={() => onChange(o.key)}
              style={{
                flexShrink: 0,
                height: 36,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? colors.brandPrimary : colors.brandTertiary,
                borderWidth: 1,
                borderColor: active ? colors.brandPrimary : colors.border,
              }}
            >
              <Text
                style={{
                  color: active ? colors.onBrandPrimary : colors.onBrandTertiary,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useMiscStyles = makeStyles((c) => ({
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: c.onSurface, letterSpacing: -0.2 },
  track: { height: 12, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  fill: { height: 12, borderRadius: radius.pill },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: c.onSurface, textAlign: "center" },
  emptySub: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: spacing.xs, maxWidth: 300 },
  kvRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
  kvLabel: { fontSize: 15, color: c.muted, fontWeight: "600" },
  kvValue: { fontSize: 15, fontWeight: "700" },
}));
