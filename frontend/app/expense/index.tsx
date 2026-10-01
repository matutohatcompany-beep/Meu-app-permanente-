import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Field, MoneyField } from "@/src/components/field";
import { ConfirmSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, Card, EmptyState, IconButton, KV, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { useActiveExpenses, useData } from "@/src/db/DataContext";
import { ExpenseDetails } from "@/src/db/types";
import { formatDate, todayKey } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const DETAIL_FIELDS: { key: keyof ExpenseDetails; label: string }[] = [
  { key: "fuel", label: "Combustível" },
  { key: "lodging", label: "Hospedagem" },
  { key: "food", label: "Alimentação" },
  { key: "fees", label: "Taxas" },
  { key: "other", label: "Outros" },
];

export default function ExpenseScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { upsertExpense, deleteExpense } = useData();
  const expenses = useActiveExpenses();

  const [date, setDate] = useState(todayKey());
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState("");
  const [details, setDetails] = useState<ExpenseDetails>({});
  const [showDetails, setShowDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const detailSum = useMemo(
    () => DETAIL_FIELDS.reduce((acc, f) => acc + (details[f.key] ?? 0), 0),
    [details],
  );
  const effectiveTotal = detailSum > 0 ? detailSum : total;

  const sorted = useMemo(() => [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)), [expenses]);

  function save() {
    if (effectiveTotal <= 0) {
      toast("Informe um valor de despesa.", "error");
      return;
    }
    upsertExpense(date, effectiveTotal, detailSum > 0 ? details : undefined, notes || undefined);
    toast("Despesa salva.", "success");
    setTotal(0);
    setNotes("");
    setDetails({});
    setShowDetails(false);
    setDate(todayKey());
  }

  function loadForEdit(dkey: string) {
    const e = expenses.find((x) => x.date === dkey);
    if (!e) return;
    setDate(e.date);
    setTotal(e.total);
    setNotes(e.notes ?? "");
    setDetails(e.details ?? {});
    setShowDetails(!!e.details);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Despesas" subtitle="Lançar gastos da viagem" back />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} placeholder={todayKey()} icon="calendar" testID="expense-date-input" />
          <MoneyField
            label="Despesa do dia"
            cents={detailSum > 0 ? detailSum : total}
            onChange={setTotal}
            big
            testID="expense-total-input"
            hint={detailSum > 0 ? "Total calculado pelo detalhamento abaixo" : "Valor total do dia de viagem"}
          />

          <Pressable style={s.toggle} onPress={() => setShowDetails((v) => !v)} testID="expense-detail-toggle">
            <Icon name={showDetails ? "chevron-down" : "chevron-right"} size={18} color={colors.brandPrimary} />
            <Text style={s.toggleText}>Detalhar (opcional)</Text>
          </Pressable>

          {showDetails &&
            DETAIL_FIELDS.map((f) => (
              <MoneyField
                key={f.key}
                label={f.label}
                cents={details[f.key] ?? 0}
                onChange={(v) => setDetails((d) => ({ ...d, [f.key]: v }))}
                testID={`expense-${f.key}-input`}
              />
            ))}

          <Field label="Observações" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline testID="expense-notes-input" />
          <Button label="Salvar despesa" icon="check" onPress={save} testID="expense-save-button" />
        </Card>

        <View>
          <SectionTitle>Lançamentos</SectionTitle>
          {sorted.length === 0 ? (
            <EmptyState icon="wallet" title="Nenhuma despesa lançada." />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {sorted.map((e) => (
                <Card key={e.id} style={s.row}>
                  <Pressable style={{ flex: 1 }} onPress={() => loadForEdit(e.date)} testID={`expense-row-${e.id}`}>
                    <Text style={s.rowDate}>{formatDate(e.date)}</Text>
                    {e.notes ? <Text style={s.rowNotes} numberOfLines={1}>{e.notes}</Text> : null}
                  </Pressable>
                  <Text style={s.rowTotal}>{formatBRL(e.total)}</Text>
                  <IconButton name="trash" onPress={() => setConfirmDelete(e.id)} color={colors.error} testID={`expense-delete-${e.id}`} />
                </Card>
              ))}
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      <ConfirmSheet
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Excluir despesa?"
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteExpense(confirmDelete);
          toast("Despesa excluída.", "success");
        }}
        testID="expense-delete-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  toggleText: { fontSize: 15, fontWeight: "800", color: c.brandPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowDate: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  rowNotes: { fontSize: 13, color: c.muted, marginTop: 2 },
  rowTotal: { fontSize: 16, fontWeight: "900", color: c.error },
}));
