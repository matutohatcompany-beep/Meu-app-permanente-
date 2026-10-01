import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { Card, ScreenHeader } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

interface Item {
  icon: IconName;
  label: string;
  desc: string;
  href: string;
  testID: string;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Vendas & Dinheiro",
    items: [
      { icon: "target", label: "Metas", desc: "Botinas e moda country", href: "/goals", testID: "more-goals" },
      { icon: "wallet", label: "Despesas", desc: "Lançar gastos da viagem", href: "/expense", testID: "more-expense" },
      { icon: "trending", label: "Relatórios", desc: "Dia, semana, mês e cidade", href: "/reports", testID: "more-reports" },
      { icon: "cart", label: "Recompra", desc: "Reposição de moda country", href: "/recompra", testID: "more-recompra" },
    ],
  },
  {
    title: "Relacionamento",
    items: [
      { icon: "calendar", label: "Clientes da semana", desc: "Rodízio de 60 dias", href: "/week", testID: "more-week" },
      { icon: "whatsapp", label: "Mensagens WhatsApp", desc: "Modelos prontos", href: "/messages", testID: "more-messages" },
      { icon: "gift", label: "Eventos Country", desc: "Calendário de eventos", href: "/events", testID: "more-events" },
    ],
  },
  {
    title: "Controle",
    items: [
      { icon: "settings", label: "Admin", desc: "Comissão, metas, cidades", href: "/admin", testID: "more-admin" },
      { icon: "database", label: "Backup", desc: "Exportar e restaurar dados", href: "/backup", testID: "more-backup" },
    ],
  },
];

export default function MoreScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      <ScreenHeader title="Mais" subtitle="Ferramentas e controle" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {GROUPS.map((g) => (
          <View key={g.title}>
            <Text style={s.groupTitle}>{g.title}</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {g.items.map((it, i) => (
                <View key={it.href}>
                  {i > 0 && <View style={s.divider} />}
                  <Card
                    testID={it.testID}
                    onPress={() => router.push(it.href as any)}
                    style={s.item}
                  >
                    <View style={s.itemIcon}>
                      <Icon name={it.icon} size={22} color={colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemLabel}>{it.label}</Text>
                      <Text style={s.itemDesc}>{it.desc}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.muted} />
                  </Card>
                </View>
              ))}
            </Card>
          </View>
        ))}
        <Text style={s.footer}>Funciona 100% offline · Dados salvos no aparelho</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  groupTitle: { fontSize: 14, fontWeight: "800", color: c.muted, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 0,
    borderRadius: 0,
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: c.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  itemLabel: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  itemDesc: { fontSize: 13, color: c.muted, marginTop: 1, fontWeight: "600" },
  divider: { height: 1, backgroundColor: c.divider, marginLeft: 72 },
  footer: { textAlign: "center", color: c.muted, fontSize: 13, fontWeight: "600", marginTop: spacing.sm },
}));
