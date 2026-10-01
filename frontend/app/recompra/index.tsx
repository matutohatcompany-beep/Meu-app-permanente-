import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Segmented } from "@/src/components/field";
import { Badge, Card, ChipRow, EmptyState, KV, ScreenHeader } from "@/src/components/ui";
import { useActiveProducts, useActiveSales } from "@/src/db/DataContext";
import { MODA_CATEGORIES } from "@/src/db/types";
import { restockReport } from "@/src/logic/calculations";
import { PeriodKey, periodRange } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, spacing } from "@/src/theme";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
];

export default function RecompraScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const sales = useActiveSales();
  const products = useActiveProducts();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [cat, setCat] = useState("all");

  const rows = useMemo(() => {
    const { from, to } = periodRange(period);
    return restockReport(sales, products, from, to, cat === "all" ? undefined : cat);
  }, [sales, products, period, cat]);

  const totalEstimated = rows.reduce((a, r) => a + r.estimatedCost, 0);

  const catOptions = [{ key: "all", label: "Todas" }, ...MODA_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))];

  return (
    <View style={s.screen}>
      <ScreenHeader title="Recompra" subtitle="Reposição de moda country" back />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Segmented options={PERIODS} value={period} onChange={(k) => setPeriod(k as PeriodKey)} testID="recompra-period" />
      </View>
      <ChipRow options={catOptions} value={cat} onChange={setCat} testIDPrefix="recompra-cat" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        {rows.length === 0 ? (
          <EmptyState icon="cart" title="Nenhuma recompra encontrada." subtitle="Registre vendas de moda country para ver a reposição." />
        ) : (
          <>
            <Card style={s.totalCard}>
              <Text style={s.totalLabel}>Custo estimado de reposição</Text>
              <Text style={s.totalValue}>{formatBRL(totalEstimated)}</Text>
            </Card>
            {rows.map((r) => {
              const catLabel = MODA_CATEGORIES.find((c) => c.key === r.category)?.label;
              return (
                <Card key={r.productId}>
                  <View style={s.head}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.code}>{r.code}</Text>
                      <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                    </View>
                    {catLabel && <Badge label={catLabel} tone="accent" />}
                  </View>
                  <View style={s.sep} />
                  <KV label="Qtd. vendida" value={String(r.qtySold)} />
                  <KV label="Custo unitário atual" value={formatBRL(r.currentCost)} />
                  <KV label="Custo p/ repor" value={formatBRL(r.estimatedCost)} strong />
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  totalCard: { backgroundColor: c.surfaceInverse, borderColor: c.surfaceInverse },
  totalLabel: { color: c.onSurfaceInverse, opacity: 0.8, fontSize: 14, fontWeight: "700" },
  totalValue: { color: c.onSurfaceInverse, fontSize: 30, fontWeight: "900", marginTop: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  code: { fontSize: 12, fontWeight: "900", color: c.brandPrimary },
  name: { fontSize: 16, fontWeight: "800", color: c.onSurface, marginTop: 1 },
  sep: { height: 1, backgroundColor: c.divider, marginVertical: spacing.sm },
}));
