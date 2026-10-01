import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Segmented } from "@/src/components/field";
import { Card, EmptyState, KV, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { useActiveExpenses, useActiveSales } from "@/src/db/DataContext";
import { summarizeForPeriod } from "@/src/logic/calculations";
import { inRange, PERIOD_LABELS, PeriodKey, periodRange } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, spacing } from "@/src/theme";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
];

interface CityRow {
  city: string;
  bootTotal: number;
  modaTotal: number;
  total: number;
  gain: number;
  clients: number;
  sales: number;
}

export default function ReportsScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const sales = useActiveSales();
  const expenses = useActiveExpenses();
  const [period, setPeriod] = useState<PeriodKey>("month");

  const summary = useMemo(() => summarizeForPeriod(sales, expenses, period), [sales, expenses, period]);

  const cityRows = useMemo<CityRow[]>(() => {
    const { from, to } = periodRange(period);
    const map = new Map<string, CityRow & { clientSet: Set<string> }>();
    for (const sale of sales) {
      if (!inRange(sale.date, from, to)) continue;
      const city = sale.city || "Sem cidade";
      const row =
        map.get(city) ??
        {
          city,
          bootTotal: 0,
          modaTotal: 0,
          total: 0,
          gain: 0,
          clients: 0,
          sales: 0,
          clientSet: new Set<string>(),
        };
      row.bootTotal += sale.bootTotal;
      row.modaTotal += sale.modaTotal;
      row.total += sale.bootTotal + sale.modaTotal;
      row.gain += sale.grossGain;
      row.sales += 1;
      if (sale.clientId) row.clientSet.add(sale.clientId);
      map.set(city, row);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, clients: r.clientSet.size }))
      .sort((a, b) => b.total - a.total);
  }, [sales, period]);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Relatórios" subtitle="Indicadores por período" back />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Segmented options={PERIODS} value={period} onChange={(k) => setPeriod(k as PeriodKey)} testID="reports-period" />

        <Card>
          <SectionTitle>Resumo · {PERIOD_LABELS[period]}</SectionTitle>
          <KV label="Botinas (vendido)" value={formatBRL(summary.bootTotal)} />
          <KV label="Moda country (vendido)" value={formatBRL(summary.modaTotal)} />
          <KV label="Total vendido" value={formatBRL(summary.bootTotal + summary.modaTotal)} strong />
          <View style={s.sep} />
          <KV label="Comissão botinas" value={formatBRL(summary.bootCommission)} tone="success" />
          <KV label="Lucro moda" value={formatBRL(summary.modaProfit)} tone="success" />
          <KV label="Ganho bruto" value={formatBRL(summary.grossGain)} strong />
          <KV label="Despesas" value={formatBRL(summary.expenses)} tone="error" />
          <KV label="Ganho líquido" value={formatBRL(summary.netGain)} strong tone="success" />
          <View style={s.sep} />
          <KV label="Nº de vendas" value={String(summary.salesCount)} />
        </Card>

        <View>
          <SectionTitle>Por cidade</SectionTitle>
          {cityRows.length === 0 ? (
            <EmptyState icon="pin" title="Nenhuma venda neste período." />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {cityRows.map((r) => {
                const ticket = r.sales > 0 ? Math.round(r.total / r.sales) : 0;
                return (
                  <Card key={r.city}>
                    <View style={s.cityHead}>
                      <Text style={s.cityName}>{r.city}</Text>
                      <Text style={s.cityTotal}>{formatBRL(r.total)}</Text>
                    </View>
                    <View style={s.sep} />
                    <KV label="Botinas" value={formatBRL(r.bootTotal)} />
                    <KV label="Moda country" value={formatBRL(r.modaTotal)} />
                    <KV label="Ganho" value={formatBRL(r.gain)} tone="success" />
                    <KV label="Clientes" value={String(r.clients)} />
                    <KV label="Ticket médio" value={formatBRL(ticket)} />
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  sep: { height: 1, backgroundColor: c.divider, marginVertical: spacing.sm },
  cityHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cityName: { fontSize: 17, fontWeight: "900", color: c.onSurface },
  cityTotal: { fontSize: 17, fontWeight: "900", color: c.brandPrimary },
}));
