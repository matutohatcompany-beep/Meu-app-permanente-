import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Badge, Card, ChipRow, EmptyState, ScreenHeader } from "@/src/components/ui";
import { useActiveClients, useActiveSales, useData } from "@/src/db/DataContext";
import { Client } from "@/src/db/types";
import { formatDate, nextVisitDate, visitStatus } from "@/src/logic/date";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function WeekScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clients = useActiveClients();
  const sales = useActiveSales();
  const { db } = useData();
  const cycleDays = db.config.cycleDays;

  const [filter, setFilter] = useState("overdue");

  const counts = useMemo(() => {
    const c: Record<string, number> = { overdue: 0 };
    for (let w = 1; w <= 9; w++) c[String(w)] = 0;
    for (const cl of clients) {
      if (cl.cycleWeek) c[String(cl.cycleWeek)] = (c[String(cl.cycleWeek)] ?? 0) + 1;
      if (visitStatus(cl.lastVisitDate, cycleDays).status === "atrasado") c.overdue += 1;
    }
    return c;
  }, [clients, cycleDays]);

  const options = [
    { key: "overdue", label: `Atrasados${counts.overdue ? ` (${counts.overdue})` : ""}` },
    ...Array.from({ length: 9 }, (_, i) => {
      const w = String(i + 1);
      return { key: w, label: `Sem. ${w}${counts[w] ? ` (${counts[w]})` : ""}` };
    }),
  ];

  const list = useMemo(() => {
    let base: Client[];
    if (filter === "overdue") {
      base = clients.filter((c) => visitStatus(c.lastVisitDate, cycleDays).status === "atrasado");
    } else {
      base = clients.filter((c) => String(c.cycleWeek) === filter);
    }
    return [...base].sort((a, b) => (a.city ?? "").localeCompare(b.city ?? "") || a.name.localeCompare(b.name));
  }, [clients, filter, cycleDays]);

  // group by city
  const grouped = useMemo(() => {
    const map = new Map<string, Client[]>();
    for (const c of list) {
      const city = c.city || "Sem cidade";
      map.set(city, [...(map.get(city) ?? []), c]);
    }
    return Array.from(map.entries());
  }, [list]);

  function clientInfo(c: Client) {
    const his = sales.filter((x) => x.clientId === c.id);
    const products = new Set<string>();
    const sizes = new Set<string>();
    let lastPurchase: string | null = null;
    for (const sale of his) {
      if (!lastPurchase || new Date(sale.date) > new Date(lastPurchase)) lastPurchase = sale.date;
      for (const it of sale.items) {
        products.add(it.name);
        if (it.size) sizes.add(it.size);
      }
    }
    if (c.size) sizes.add(c.size);
    return { products: Array.from(products), sizes: Array.from(sizes), lastPurchase };
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Clientes da semana" subtitle="Rodízio de 60 dias" back />
      <ChipRow options={options} value={filter} onChange={setFilter} testIDPrefix="week-filter" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={filter === "overdue" ? "Nenhum cliente atrasado." : "Nenhum cliente nesta semana."}
            subtitle="Defina a semana do ciclo no cadastro do cliente."
          />
        ) : (
          grouped.map(([city, members]) => (
            <View key={city}>
              <Text style={s.cityTitle}>
                {city} <Text style={s.cityCount}>· {members.length}</Text>
              </Text>
              <View style={{ gap: spacing.sm }}>
                {members.map((c) => {
                  const info = clientInfo(c);
                  const vs = visitStatus(c.lastVisitDate, cycleDays);
                  const next = nextVisitDate(c.lastVisitDate, cycleDays);
                  const tone = vs.status === "atrasado" ? "error" : vs.status === "proxima" ? "warning" : vs.status === "sem-visita" ? "neutral" : "success";
                  const label =
                    vs.status === "atrasado"
                      ? `Atrasado ${Math.abs(vs.daysUntil ?? 0)}d`
                      : vs.status === "proxima"
                        ? `Em ${vs.daysUntil}d`
                        : vs.status === "sem-visita"
                          ? "Sem visita"
                          : "Em dia";
                  return (
                    <Card key={c.id} onPress={() => router.push(`/client/${c.id}`)} testID={`week-client-${c.id}`}>
                      <View style={s.head}>
                        <Text style={s.name}>{c.name}</Text>
                        <Badge label={label} tone={tone as any} />
                      </View>
                      <View style={s.info}>
                        <Icon name="calendar" size={14} color={colors.muted} />
                        <Text style={s.infoText}>
                          Últ. compra {formatDate(info.lastPurchase)} · Próx. {next ? formatDate(next) : "—"}
                        </Text>
                      </View>
                      {info.sizes.length > 0 && (
                        <View style={s.info}>
                          <Icon name="boot" size={14} color={colors.muted} />
                          <Text style={s.infoText}>Tamanhos: {info.sizes.join(", ")}</Text>
                        </View>
                      )}
                      {info.products.length > 0 && (
                        <View style={s.info}>
                          <Icon name="package" size={14} color={colors.muted} />
                          <Text style={s.infoText} numberOfLines={2}>Levar: {info.products.join(", ")}</Text>
                        </View>
                      )}
                      {c.notes ? (
                        <View style={s.info}>
                          <Icon name="info" size={14} color={colors.muted} />
                          <Text style={s.infoText} numberOfLines={2}>{c.notes}</Text>
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  cityTitle: { fontSize: 17, fontWeight: "900", color: c.onSurface, marginBottom: spacing.sm },
  cityCount: { color: c.muted, fontWeight: "700" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  name: { fontSize: 16, fontWeight: "800", color: c.onSurface, flex: 1 },
  info: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 3 },
  infoText: { fontSize: 13, color: c.onSurfaceSecondary, fontWeight: "600", flex: 1 },
}));
