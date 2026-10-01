import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { useToast } from "@/src/components/toast";
import { Badge, Button, Card, EmptyState, IconButton, KV, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { useActiveSales, useData } from "@/src/db/DataContext";
import { formatDate, formatDateLong, nextVisitDate, visitStatus } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { onlyDigits } from "@/src/logic/text";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ClientDetail() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useData();
  const sales = useActiveSales();

  const client = db.clients.find((c) => c.id === id && !c.deletedAt);
  const history = useMemo(
    () => sales.filter((x) => x.clientId === id).sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [sales, id],
  );

  if (!client) {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Cliente" back />
        <EmptyState icon="users" title="Cliente não encontrado." />
      </View>
    );
  }

  const vs = visitStatus(client.lastVisitDate, db.config.cycleDays);
  const next = nextVisitDate(client.lastVisitDate, db.config.cycleDays);

  function openWhatsApp() {
    const digits = onlyDigits(client!.whatsapp || "");
    if (!digits) {
      toast("Cliente sem WhatsApp cadastrado.", "error");
      return;
    }
    const full = digits.length <= 11 ? `55${digits}` : digits;
    Linking.openURL(`https://wa.me/${full}`).catch(() => toast("Não foi possível abrir o WhatsApp.", "error"));
  }

  function openMaps() {
    let query = "";
    if (client!.lat != null && client!.lng != null) query = `${client!.lat},${client!.lng}`;
    else if (client!.address) query = encodeURIComponent(`${client!.address} ${client!.city ?? ""}`);
    else if (client!.city) query = encodeURIComponent(client!.city);
    if (!query) {
      toast("Sem endereço ou coordenadas.", "error");
      return;
    }
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() =>
      toast("Não foi possível abrir o mapa.", "error"),
    );
  }

  const statusTone =
    vs.status === "atrasado" ? "error" : vs.status === "proxima" ? "warning" : vs.status === "sem-visita" ? "neutral" : "success";
  const statusLabel =
    vs.status === "atrasado"
      ? `Atrasado ${Math.abs(vs.daysUntil ?? 0)}d`
      : vs.status === "proxima"
        ? `Visitar em ${vs.daysUntil}d`
        : vs.status === "sem-visita"
          ? "Nunca visitado"
          : "Em dia";

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={client.name}
        subtitle={client.city}
        back
        right={<IconButton name="pencil" onPress={() => router.push(`/client/form?id=${client.id}`)} testID="client-edit-button" />}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button label="WhatsApp" icon="whatsapp" variant="primary" onPress={openWhatsApp} style={{ flex: 1 }} testID="client-whatsapp-button" />
          <Button label="Mapa" icon="pin" variant="secondary" onPress={openMaps} style={{ flex: 1 }} testID="client-maps-button" />
        </View>

        <Card>
          <View style={s.statusRow}>
            <Badge label={statusLabel} tone={statusTone as any} />
            {client.cycleWeek ? <Badge label={`Semana ${client.cycleWeek}`} /> : null}
          </View>
          <View style={s.sep} />
          <KV label="Última visita" value={formatDate(client.lastVisitDate)} />
          <KV label="Próxima visita (60 dias)" value={next ? formatDate(next) : "—"} />
          {client.size ? <KV label="Tamanho" value={client.size} /> : null}
          {client.birthday ? <KV label="Aniversário" value={client.birthday} /> : null}
          {client.howMet ? <KV label="Como conheceu" value={client.howMet} /> : null}
          {client.whatsapp ? <KV label="WhatsApp" value={client.whatsapp} /> : null}
          {client.address ? <KV label="Endereço" value={client.address} /> : null}
          {client.notes ? (
            <>
              <View style={s.sep} />
              <Text style={s.notesLabel}>Observações</Text>
              <Text style={s.notes}>{client.notes}</Text>
            </>
          ) : null}
        </Card>

        <View>
          <SectionTitle right={<Text style={s.count}>{history.length} venda(s)</Text>}>Histórico de compras</SectionTitle>
          {history.length === 0 ? (
            <Card>
              <Text style={s.emptyHistory}>Nenhuma compra registrada para este cliente.</Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {history.map((sale) => (
                <Card key={sale.id} onPress={() => router.push(`/sale/${sale.id}`)} testID={`client-sale-${sale.id}`}>
                  <View style={s.saleHead}>
                    <Text style={s.saleDate}>{formatDateLong(sale.date)}</Text>
                    <Text style={s.saleTotal}>{formatBRL(sale.bootTotal + sale.modaTotal)}</Text>
                  </View>
                  {sale.items.map((it) => (
                    <Text key={it.id} style={s.saleItem} numberOfLines={1}>
                      • {it.quantity}× {it.name}
                      {it.size ? ` (nº ${it.size})` : ""} — {formatBRL(it.unitPrice)}
                    </Text>
                  ))}
                  <View style={s.saleFoot}>
                    <Icon name="dollar" size={14} color={colors.success} />
                    <Text style={s.saleGain}>Ganho {formatBRL(sale.grossGain)}</Text>
                    <Icon name="chevron-right" size={16} color={colors.muted} />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  statusRow: { flexDirection: "row", gap: spacing.sm },
  sep: { height: 1, backgroundColor: c.divider, marginVertical: spacing.sm },
  notesLabel: { fontSize: 13, fontWeight: "800", color: c.muted, marginBottom: 4 },
  notes: { fontSize: 15, color: c.onSurfaceSecondary, lineHeight: 21 },
  count: { fontSize: 13, color: c.muted, fontWeight: "700" },
  emptyHistory: { color: c.muted, fontSize: 15, fontWeight: "600", textAlign: "center" },
  saleHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  saleDate: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  saleTotal: { fontSize: 16, fontWeight: "900", color: c.onSurface },
  saleItem: { fontSize: 14, color: c.onSurfaceSecondary, marginTop: 2 },
  saleFoot: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  saleGain: { flex: 1, fontSize: 13, color: c.success, fontWeight: "800" },
}));
