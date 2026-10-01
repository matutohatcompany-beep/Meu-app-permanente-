import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { Field } from "@/src/components/field";
import { ConfirmSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Badge, Button, Card, IconButton, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { useActiveSales, useData } from "@/src/db/DataContext";
import { formatDateLong } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function AdminScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, updateCommission, updateConfig, addCity, removeCity } = useData();
  const sales = useActiveSales();

  const [commission, setCommission] = useState(String(db.config.commissionPct));
  const [cycleDays, setCycleDays] = useState(String(db.config.cycleDays));
  const [newCity, setNewCity] = useState("");
  const [confirmCity, setConfirmCity] = useState<string | null>(null);

  const recent = [...sales].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 20);

  function saveGains() {
    const pct = Number(commission.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast("Comissão inválida.", "error");
      return;
    }
    updateCommission(pct);
    const days = parseInt(cycleDays, 10);
    if (Number.isFinite(days) && days > 0) updateConfig({ cycleDays: days });
    toast("Configurações salvas.", "success");
  }

  function link(icon: IconName, label: string, desc: string, href: string, testID: string) {
    return (
      <Card onPress={() => router.push(href as any)} style={s.link} testID={testID}>
        <View style={s.linkIcon}>
          <Icon name={icon} size={20} color={colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.linkLabel}>{label}</Text>
          <Text style={s.linkDesc}>{desc}</Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.muted} />
      </Card>
    );
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Admin" subtitle="Centro de controle" back />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <SectionTitle>Ganhos & Ciclo</SectionTitle>
          <Field
            label="Comissão de botinas (%)"
            value={commission}
            onChangeText={(t) => setCommission(t.replace(/[^\d.,]/g, ""))}
            keyboardType="decimal-pad"
            icon="percent"
            hint="Vendas antigas mantêm o percentual registrado na época."
            testID="admin-commission-input"
          />
          <Field
            label="Dias do ciclo de visita"
            value={cycleDays}
            onChangeText={(t) => setCycleDays(t.replace(/\D/g, ""))}
            keyboardType="number-pad"
            icon="calendar"
            hint="Próxima visita = última visita + estes dias. Padrão: 60."
            testID="admin-cycle-input"
          />
          <Button label="Salvar" icon="check" onPress={saveGains} testID="admin-save-gains" />
        </Card>

        <View>
          <SectionTitle>Atalhos</SectionTitle>
          <View style={{ gap: spacing.sm }}>
            {link("target", "Metas", "Editar e recalcular metas", "/goals", "admin-goals-link")}
            {link("package", "Produtos", "Editar código, custo, preço, foto", "/(tabs)/products", "admin-products-link")}
            {link("history", "Histórico de alterações", "Ver e restaurar mudanças", "/admin/history", "admin-history-link")}
          </View>
        </View>

        {/* Cities */}
        <Card>
          <SectionTitle>Cidades</SectionTitle>
          <View style={s.cityAdd}>
            <View style={{ flex: 1 }}>
              <Field value={newCity} onChangeText={setNewCity} placeholder="Nova cidade" testID="admin-city-input" />
            </View>
            <Button
              label="Add"
              size="md"
              onPress={() => {
                if (!newCity.trim()) return;
                addCity(newCity);
                setNewCity("");
                toast("Cidade adicionada.", "success");
              }}
              testID="admin-city-add"
            />
          </View>
          {db.cities.length === 0 ? (
            <Text style={s.empty}>Nenhuma cidade. Elas são criadas ao cadastrar clientes.</Text>
          ) : (
            <View style={s.chips}>
              {db.cities.map((ci) => (
                <Pressable key={ci} style={s.chip} onPress={() => setConfirmCity(ci)} testID={`admin-city-${ci}`}>
                  <Text style={s.chipText}>{ci}</Text>
                  <Icon name="close" size={14} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {/* Correct sale */}
        <View>
          <SectionTitle>Corrigir venda</SectionTitle>
          <Text style={s.note}>A correção recalcula somente aquela venda. As demais não mudam.</Text>
          {recent.length === 0 ? (
            <Card><Text style={s.empty}>Nenhuma venda registrada.</Text></Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {recent.map((sale) => (
                <Card key={sale.id} onPress={() => router.push(`/sale/${sale.id}`)} style={s.saleRow} testID={`admin-sale-${sale.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.saleClient}>{sale.clientName || "Cliente avulso"}</Text>
                    <Text style={s.saleDate}>{formatDateLong(sale.date)} · {sale.city || "—"}</Text>
                  </View>
                  <Text style={s.saleTotal}>{formatBRL(sale.bootTotal + sale.modaTotal)}</Text>
                  <Icon name="chevron-right" size={18} color={colors.muted} />
                </Card>
              ))}
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      <ConfirmSheet
        visible={!!confirmCity}
        onClose={() => setConfirmCity(null)}
        title={`Remover "${confirmCity}"?`}
        message="A cidade sai da lista. Clientes e vendas não são afetados."
        confirmLabel="Remover"
        danger
        onConfirm={() => {
          if (confirmCity) removeCity(confirmCity);
          toast("Cidade removida.", "success");
        }}
        testID="admin-city-remove-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  linkIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  linkLabel: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  linkDesc: { fontSize: 13, color: c.muted, marginTop: 1, fontWeight: "600" },
  cityAdd: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceTertiary,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: c.border,
  },
  chipText: { fontSize: 14, fontWeight: "700", color: c.onSurfaceTertiary },
  empty: { fontSize: 14, color: c.muted, fontWeight: "600" },
  note: { fontSize: 13, color: c.muted, marginBottom: spacing.sm, fontWeight: "600" },
  saleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  saleClient: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  saleDate: { fontSize: 13, color: c.muted, marginTop: 1, fontWeight: "600" },
  saleTotal: { fontSize: 15, fontWeight: "900", color: c.onSurface },
}));
