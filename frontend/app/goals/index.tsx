import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, MoneyField } from "@/src/components/field";
import { useToast } from "@/src/components/toast";
import { Button, Card, KV, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { useData } from "@/src/db/DataContext";
import { derivedGoal } from "@/src/logic/calculations";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, spacing } from "@/src/theme";

export default function GoalsScreen() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, updateGoals } = useData();
  const g = db.goals;

  const [bootAnnual, setBootAnnual] = useState(g.bootAnnual);
  const [modaAnnual, setModaAnnual] = useState(g.modaAnnual);
  const [tripDays, setTripDays] = useState(String(g.tripDaysPerWeek || 4));

  const previewGoals = {
    ...g,
    bootAnnual,
    modaAnnual,
    tripDaysPerWeek: Number(tripDays) || 4,
    // ignore manual overrides in preview to show the auto split
    bootMonthly: undefined,
    bootWeekly: undefined,
    bootDaily: undefined,
    modaMonthly: undefined,
    modaWeekly: undefined,
    modaDaily: undefined,
  };

  function save() {
    updateGoals({
      bootAnnual,
      modaAnnual,
      tripDaysPerWeek: Number(tripDays) || 4,
      // recalc clears manual overrides
      bootMonthly: undefined,
      bootWeekly: undefined,
      bootDaily: undefined,
      modaMonthly: undefined,
      modaWeekly: undefined,
      modaDaily: undefined,
    });
    toast("Metas salvas e recalculadas.", "success");
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Metas" subtitle="Medidas pelo valor vendido" back />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <SectionTitle>Metas anuais</SectionTitle>
          <MoneyField label="Meta anual · Botinas" cents={bootAnnual} onChange={setBootAnnual} testID="goals-boot-annual" />
          <MoneyField label="Meta anual · Moda Country" cents={modaAnnual} onChange={setModaAnnual} testID="goals-moda-annual" />
          <Field
            label="Dias de viagem por semana"
            value={tripDays}
            onChangeText={(t) => setTripDays(t.replace(/\D/g, ""))}
            keyboardType="number-pad"
            hint="Usado para calcular a meta diária. Padrão: 4"
            testID="goals-trip-days"
          />
        </Card>

        <Card>
          <SectionTitle>Cálculo automático</SectionTitle>
          <Text style={s.note}>Mensal = anual ÷ 12 · Semanal = anual ÷ 52 · Diária = semanal ÷ dias de viagem</Text>
          <View style={s.cols}>
            <View style={s.col}>
              <Text style={s.colTitle}>Botinas</Text>
              <KV label="Mensal" value={formatBRL(derivedGoal(previewGoals, "boot", "month"))} />
              <KV label="Semanal" value={formatBRL(derivedGoal(previewGoals, "boot", "week"))} />
              <KV label="Diária" value={formatBRL(derivedGoal(previewGoals, "boot", "day"))} strong />
            </View>
            <View style={s.col}>
              <Text style={s.colTitle}>Moda</Text>
              <KV label="Mensal" value={formatBRL(derivedGoal(previewGoals, "moda", "month"))} />
              <KV label="Semanal" value={formatBRL(derivedGoal(previewGoals, "moda", "week"))} />
              <KV label="Diária" value={formatBRL(derivedGoal(previewGoals, "moda", "day"))} strong />
            </View>
          </View>
        </Card>

        <Button label="Salvar e recalcular" icon="check" onPress={save} testID="goals-save-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  note: { fontSize: 13, color: c.muted, marginBottom: spacing.md, lineHeight: 19, fontWeight: "600" },
  cols: { flexDirection: "row", gap: spacing.lg },
  col: { flex: 1 },
  colTitle: { fontSize: 14, fontWeight: "900", color: c.brandPrimary, marginBottom: spacing.xs },
}));
