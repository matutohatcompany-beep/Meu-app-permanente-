import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Badge, ChipRow, EmptyState, FAB, ScreenHeader } from "@/src/components/ui";
import { useActiveClients, useData } from "@/src/db/DataContext";
import { Client } from "@/src/db/types";
import { formatDate, visitStatus } from "@/src/logic/date";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ClientsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const clients = useActiveClients();
  const { db } = useData();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("all");

  const cityOptions = useMemo(
    () => [{ key: "all", label: "Todas" }, ...db.cities.map((ci) => ({ key: ci, label: ci }))],
    [db.cities],
  );

  const filtered = useMemo(() => {
    let base = clients;
    if (city !== "all") base = base.filter((c) => c.city === city);
    if (q) {
      const n = q.toLowerCase();
      base = base.filter(
        (c) =>
          c.name.toLowerCase().includes(n) ||
          c.city?.toLowerCase().includes(n) ||
          c.whatsapp?.toLowerCase().includes(n),
      );
    }
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, q, city]);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Clientes" subtitle={`${clients.length} cadastrado${clients.length === 1 ? "" : "s"}`} />
      <View style={s.search}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Nome, cidade ou WhatsApp"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          testID="clients-search"
        />
      </View>
      {db.cities.length > 0 && (
        <ChipRow options={cityOptions} value={city} onChange={setCity} testIDPrefix="clients-city" />
      )}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.sm }}
        renderItem={({ item }) => (
          <ClientRow client={item} cycleDays={db.config.cycleDays} onPress={() => router.push(`/client/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="Nenhum cliente cadastrado."
            subtitle="Cadastre seu primeiro cliente para montar sua rota."
            actionLabel="Novo cliente"
            onAction={() => router.push("/client/form")}
            testID="clients-empty"
          />
        }
        keyboardShouldPersistTaps="handled"
      />
      <FAB label="Cliente" onPress={() => router.push("/client/form")} testID="clients-add-fab" />
    </View>
  );
}

function ClientRow({ client, cycleDays, onPress }: { client: Client; cycleDays: number; onPress: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const vs = visitStatus(client.lastVisitDate, cycleDays);
  const statusBadge =
    vs.status === "atrasado"
      ? { label: "Atrasado", tone: "error" as const }
      : vs.status === "proxima"
        ? { label: `Em ${vs.daysUntil}d`, tone: "warning" as const }
        : vs.status === "sem-visita"
          ? { label: "Sem visita", tone: "neutral" as const }
          : { label: "Em dia", tone: "success" as const };
  const initials = client.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <Pressable
      testID={`client-row-${client.id}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {client.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {[client.city, client.lastVisitDate ? `Últ. visita ${formatDate(client.lastVisitDate)}` : "Nunca visitado"]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Badge label={statusBadge.label} tone={statusBadge.tone} />
        {client.cycleWeek ? <Text style={s.week}>Sem. {client.cycleWeek}</Text> : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    borderWidth: 1,
    borderColor: c.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 16, color: c.onSurface },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "900", color: c.brandPrimary },
  name: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  meta: { fontSize: 13, color: c.muted, marginTop: 2, fontWeight: "600" },
  week: { fontSize: 11, color: c.muted, fontWeight: "700" },
}));
