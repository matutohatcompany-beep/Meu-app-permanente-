import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { Card, KV, ProgressBar, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { Segmented } from "@/src/components/field";
import { useActiveExpenses, useActiveSales, useData } from "@/src/db/DataContext";
import {
  derivedGoal,
  goalProgress,
  summarizeForPeriod,
} from "@/src/logic/calculations";
import { greeting, PERIOD_LABELS, PeriodKey } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
];

export default function HomeScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { db } = useData();
  const sales = useActiveSales();
  const expenses = useActiveExpenses();
  const [period, setPeriod] = useState<PeriodKey>("day");

  const summary = useMemo(
    () => summarizeForPeriod(sales, expenses, period),
    [sales, expenses, period],
  );

  const bootGoal = derivedGoal(db.goals, "boot", period);
  const modaGoal = derivedGoal(db.goals, "moda", period);

  const hasSalesThisPeriod = summary.salesCount > 0;

  return (
    <View style={s.screen}>
      <ScreenHeader title={`${greeting()}, Renan`} subtitle="Matuto · Botinas + Moda Country" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Segmented
          options={PERIODS}
          value={period}
          onChange={(k) => setPeriod(k as PeriodKey)}
          testID="home-period-segmented"
        />

        {/* Net gain hero */}
        <Card style={s.hero}>
          <Text style={s.heroLabel}>Ganho líquido · {PERIOD_LABELS[period]}</Text>
          <Text style={s.heroValue} testID="home-net-gain">
            {formatBRL(summary.netGain)}
          </Text>
          <View style={s.heroRow}>
            <View style={s.heroPill}>
              <Text style={s.heroPillLabel}>Ganho bruto</Text>
              <Text style={s.heroPillValue}>{formatBRL(summary.grossGain)}</Text>
            </View>
            <View style={s.heroPill}>
              <Text style={s.heroPillLabel}>Despesas</Text>
              <Text style={s.heroPillValue}>{formatBRL(summary.expenses)}</Text>
            </View>
          </View>
        </Card>

        {!hasSalesThisPeriod && (
          <Card>
            <Text style={s.emptyLine}>
              {period === "day"
                ? "Você ainda não possui vendas hoje."
                : "Nenhuma venda registrada neste período."}
            </Text>
          </Card>
        )}

        {/* Summary breakdown */}
        <Card>
          <SectionTitle>Resumo</SectionTitle>
          <KV label="Vendas botinas" value={formatBRL(summary.bootTotal)} />
          <KV label="Comissão botinas" value={formatBRL(summary.bootCommission)} tone="success" />
          <View style={s.sep} />
          <KV label="Vendas moda country" value={formatBRL(summary.modaTotal)} />
          <KV label="Lucro moda country" value={formatBRL(summary.modaProfit)} tone="success" />
          <View style={s.sep} />
          <KV label="Ganho bruto" value={formatBRL(summary.grossGain)} strong />
          <KV label="Despesas" value={formatBRL(summary.expenses)} tone="error" />
          <KV label="Ganho líquido" value={formatBRL(summary.netGain)} strong tone="success" />
        </Card>

        {/* Goals */}
        <View>
          <SectionTitle>Metas · {PERIOD_LABELS[period]}</SectionTitle>
          <View style={{ gap: spacing.md }}>
            <GoalCard
              icon="boot"
              title="Botinas"
              sold={summary.bootTotal}
              goal={bootGoal}
              gainLabel="Comissão"
              gain={summary.bootCommission}
              color={colors.brandPrimary}
            />
            <GoalCard
              icon="shirt"
              title="Moda Country"
              sold={summary.modaTotal}
              goal={modaGoal}
              gainLabel="Lucro"
              gain={summary.modaProfit}
              color={colors.accent}
            />
          </View>
        </View>

        {/* Shortcuts */}
        <View>
          <SectionTitle>Atalhos</SectionTitle>
          <View style={s.shortcutGrid}>
            <Shortcut icon="cart" label="Nova venda" onPress={() => router.push("/(tabs)/sell")} testID="shortcut-sell" />
            <Shortcut icon="users" label="Novo cliente" onPress={() => router.push("/client/form")} testID="shortcut-client" />
            <Shortcut icon="package" label="Novo produto" onPress={() => router.push("/product/form")} testID="shortcut-product" />
            <Shortcut icon="wallet" label="Despesa" onPress={() => router.push("/expense")} testID="shortcut-expense" />
            <Shortcut icon="calendar" label="Clientes da semana" onPress={() => router.push("/week")} testID="shortcut-week" wide />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function GoalCard({
  icon,
  title,
  sold,
  goal,
  gainLabel,
  gain,
  color,
}: {
  icon: IconName;
  title: string;
  sold: number;
  goal: number;
  gainLabel: string;
  gain: number;
  color: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const progress = goalProgress(sold, goal);
  return (
    <Card>
      <View style={s.goalHead}>
        <View style={s.goalTitleRow}>
          <View style={[s.goalIcon, { backgroundColor: color }]}>
            <Icon name={icon} size={18} color={colors.onBrandPrimary} />
          </View>
          <Text style={s.goalTitle}>{title}</Text>
        </View>
        <Text style={[s.goalPct, { color }]}>{Math.round(progress * 100)}%</Text>
      </View>
      <View style={{ marginVertical: spacing.sm }}>
        <ProgressBar value={progress} color={color} />
      </View>
      <View style={s.goalFooter}>
        <Text style={s.goalSold}>
          {formatBRL(sold)}
          <Text style={s.goalGoal}> / {goal > 0 ? formatBRL(goal) : "sem meta"}</Text>
        </Text>
        <Text style={s.goalGain}>
          {gainLabel}: <Text style={{ color: colors.success, fontWeight: "900" }}>{formatBRL(gain)}</Text>
        </Text>
      </View>
    </Card>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
  testID,
  wide,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
  wide?: boolean;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [s.shortcut, wide && s.shortcutWide, pressed && { opacity: 0.8 }]}
    >
      <View style={s.shortcutIcon}>
        <Icon name={icon} size={22} color={colors.brandPrimary} />
      </View>
      <Text style={s.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hero: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  heroLabel: { color: c.onSurfaceInverse, opacity: 0.8, fontSize: 14, fontWeight: "700" },
  heroValue: { color: c.onSurfaceInverse, fontSize: 40, fontWeight: "900", marginTop: 4, letterSpacing: -1 },
  heroRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  heroPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  heroPillLabel: { color: c.onSurfaceInverse, opacity: 0.75, fontSize: 12, fontWeight: "700" },
  heroPillValue: { color: c.onSurfaceInverse, fontSize: 17, fontWeight: "900", marginTop: 2 },
  emptyLine: { fontSize: 15, color: c.muted, fontWeight: "600", textAlign: "center" },
  sep: { height: 1, backgroundColor: c.divider, marginVertical: spacing.sm },
  goalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  goalIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  goalTitle: { fontSize: 16, fontWeight: "900", color: c.onSurface },
  goalPct: { fontSize: 18, fontWeight: "900" },
  goalFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalSold: { fontSize: 15, fontWeight: "900", color: c.onSurface },
  goalGoal: { fontSize: 13, color: c.muted, fontWeight: "600" },
  goalGain: { fontSize: 13, color: c.muted, fontWeight: "700" },
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  shortcut: {
    width: "48%",
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  shortcutWide: { width: "100%" },
  shortcutIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  shortcutLabel: { fontSize: 15, fontWeight: "800", color: c.onSurface, flexShrink: 1 },
}));
