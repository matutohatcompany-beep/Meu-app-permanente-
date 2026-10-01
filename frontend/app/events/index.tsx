import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field } from "@/src/components/field";
import { BottomSheet, ConfirmSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, Card, EmptyState, FAB, IconButton, ScreenHeader } from "@/src/components/ui";
import { useData } from "@/src/db/DataContext";
import { formatDate, todayKey } from "@/src/logic/date";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function EventsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, addEvent, deleteEvent } = useData();

  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState(todayKey());
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sorted = useMemo(() => [...db.events].sort((a, b) => (a.date < b.date ? -1 : 1)), [db.events]);

  function save() {
    if (!name.trim()) {
      toast("Informe o nome do evento.", "error");
      return;
    }
    addEvent({ name: name.trim(), city: city.trim() || undefined, date, notes: notes.trim() || undefined });
    toast("Evento cadastrado.", "success");
    setName("");
    setCity("");
    setNotes("");
    setDate(todayKey());
    setSheet(false);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Eventos Country" subtitle="Calendário de eventos" back />
      <View style={{ flex: 1 }}>
        {sorted.length === 0 ? (
          <EmptyState icon="gift" title="Nenhum evento cadastrado." actionLabel="Novo evento" onAction={() => setSheet(true)} />
        ) : (
          <View style={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: insets.bottom + 100 }}>
            {sorted.map((e) => (
              <Card key={e.id} style={s.row}>
                <View style={s.dateBox}>
                  <Text style={s.dateText}>{formatDate(e.date)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{e.name}</Text>
                  <Text style={s.meta}>{[e.city, e.notes].filter(Boolean).join(" · ") || "—"}</Text>
                </View>
                <IconButton name="trash" size={18} color={colors.error} onPress={() => setConfirmDelete(e.id)} testID={`event-delete-${e.id}`} />
              </Card>
            ))}
          </View>
        )}
      </View>
      <FAB label="Evento" onPress={() => setSheet(true)} testID="events-add-fab" />

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Novo evento">
        <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: Festa do Peão" testID="event-name-input" />
        <Field label="Cidade" value={city} onChangeText={setCity} placeholder="Cidade" testID="event-city-input" />
        <Field label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} placeholder={todayKey()} testID="event-date-input" />
        <Field label="Observação" value={notes} onChangeText={setNotes} placeholder="Opcional" multiline testID="event-notes-input" />
        <Button label="Salvar evento" icon="check" onPress={save} testID="event-save-button" />
      </BottomSheet>

      <ConfirmSheet
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Excluir evento?"
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteEvent(confirmDelete);
          toast("Evento excluído.", "success");
        }}
        testID="event-delete-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateBox: { backgroundColor: c.brandTertiary, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, alignItems: "center" },
  dateText: { fontSize: 13, fontWeight: "900", color: c.brandPrimary },
  name: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  meta: { fontSize: 13, color: c.muted, marginTop: 2, fontWeight: "600" },
}));
