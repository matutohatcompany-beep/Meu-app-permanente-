import { Text, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { useToast } from "@/src/components/toast";
import { Badge, Button, Card, EmptyState, ScreenHeader } from "@/src/components/ui";
import { useData } from "@/src/db/DataContext";
import { formatDate, formatTime } from "@/src/logic/date";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function HistoryScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, restoreChange } = useData();

  return (
    <View style={s.screen}>
      <ScreenHeader title="Histórico de alterações" subtitle="Auditoria de mudanças" back />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
      >
        {db.changelog.length === 0 ? (
          <EmptyState icon="history" title="Nenhuma alteração registrada." />
        ) : (
          db.changelog.map((log) => (
            <Card key={log.id}>
              <View style={s.head}>
                <Badge label={log.entity} />
                <Text style={s.when}>
                  {formatDate(log.createdAt)} {formatTime(log.createdAt)}
                </Text>
              </View>
              <Text style={s.label}>
                {log.label} · {log.field}
              </Text>
              <View style={s.change}>
                <Text style={s.before}>{log.before}</Text>
                <Icon name="chevron-right" size={16} color={colors.muted} />
                <Text style={s.after}>{log.after}</Text>
              </View>
              {log.restorable && !log.restored && (
                <Button
                  label="Restaurar valor anterior"
                  variant="secondary"
                  size="md"
                  icon="restore"
                  onPress={() => {
                    restoreChange(log.id);
                    toast("Valor anterior restaurado.", "success");
                  }}
                  testID={`history-restore-${log.id}`}
                  style={{ marginTop: spacing.sm }}
                />
              )}
              {log.restored && <Text style={s.restored}>Restaurado</Text>}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  when: { fontSize: 12, color: c.muted, fontWeight: "600" },
  label: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginTop: spacing.sm },
  change: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  before: { fontSize: 14, color: c.error, fontWeight: "700", textDecorationLine: "line-through" },
  after: { fontSize: 14, color: c.success, fontWeight: "800" },
  restored: { fontSize: 13, color: c.success, fontWeight: "800", marginTop: spacing.sm },
}));
