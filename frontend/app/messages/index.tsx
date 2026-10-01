import { useState } from "react";
import { Linking, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field } from "@/src/components/field";
import { BottomSheet, ConfirmSheet, SelectSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, Card, EmptyState, FAB, IconButton, ScreenHeader } from "@/src/components/ui";
import { useActiveClients, useData } from "@/src/db/DataContext";
import { todayKey } from "@/src/logic/date";
import { fillTemplate, onlyDigits } from "@/src/logic/text";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function MessagesScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, addMessage, updateMessage, deleteMessage } = useData();
  const clients = useActiveClients();

  const [edit, setEdit] = useState<null | { id?: string; title: string; body: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const [clientSheet, setClientSheet] = useState(false);

  function openWhatsApp(body: string) {
    setPendingBody(body);
    setClientSheet(true);
  }

  async function copy(body: string) {
    await Clipboard.setStringAsync(body);
    toast("Mensagem copiada.", "success");
  }

  function sendToClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client || pendingBody == null) return;
    const text = fillTemplate(pendingBody, {
      nome: client.name.split(" ")[0],
      cidade: client.city,
      data: todayKey(),
    });
    const digits = onlyDigits(client.whatsapp || "");
    if (!digits) {
      copy(text);
      toast("Cliente sem WhatsApp. Mensagem copiada.", "info");
      return;
    }
    const full = digits.length <= 11 ? `55${digits}` : digits;
    Linking.openURL(`https://wa.me/${full}?text=${encodeURIComponent(text)}`).catch(() =>
      toast("Não foi possível abrir o WhatsApp.", "error"),
    );
  }

  function saveTemplate() {
    if (!edit) return;
    if (!edit.title.trim() || !edit.body.trim()) {
      toast("Preencha título e mensagem.", "error");
      return;
    }
    if (edit.id) updateMessage(edit.id, { title: edit.title.trim(), body: edit.body.trim() });
    else addMessage({ title: edit.title.trim(), body: edit.body.trim() });
    toast("Modelo salvo.", "success");
    setEdit(null);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Mensagens" subtitle="Modelos para WhatsApp" back />
      <View style={{ flex: 1 }}>
        {db.messages.length === 0 ? (
          <EmptyState icon="whatsapp" title="Nenhum modelo." actionLabel="Novo modelo" onAction={() => setEdit({ title: "", body: "" })} />
        ) : (
          <View style={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: insets.bottom + 100 }}>
            <Text style={s.hint}>Use {"{nome}"}, {"{cidade}"}, {"{data}"} e {"{produto}"} para personalizar.</Text>
            {db.messages.map((m) => (
              <Card key={m.id}>
                <View style={s.head}>
                  <Text style={s.title}>{m.title}</Text>
                  <View style={{ flexDirection: "row" }}>
                    <IconButton name="pencil" size={18} onPress={() => setEdit({ id: m.id, title: m.title, body: m.body })} testID={`message-edit-${m.id}`} />
                    <IconButton name="trash" size={18} color={colors.error} onPress={() => setConfirmDelete(m.id)} testID={`message-delete-${m.id}`} />
                  </View>
                </View>
                <Text style={s.body}>{m.body}</Text>
                <View style={s.actions}>
                  <Button label="Abrir no WhatsApp" icon="whatsapp" size="md" onPress={() => openWhatsApp(m.body)} style={{ flex: 1 }} testID={`message-whatsapp-${m.id}`} />
                  <Button label="Copiar" icon="copy" size="md" variant="secondary" onPress={() => copy(m.body)} testID={`message-copy-${m.id}`} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
      <FAB label="Modelo" onPress={() => setEdit({ title: "", body: "" })} testID="messages-add-fab" />

      <BottomSheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar modelo" : "Novo modelo"}>
        <Field label="Título" value={edit?.title ?? ""} onChangeText={(t) => setEdit((e) => (e ? { ...e, title: t } : e))} placeholder="Ex: Pós-venda" testID="message-title-input" />
        <Field label="Mensagem" value={edit?.body ?? ""} onChangeText={(t) => setEdit((e) => (e ? { ...e, body: t } : e))} placeholder="Olá {nome}!" multiline testID="message-body-input" />
        <Button label="Salvar modelo" icon="check" onPress={saveTemplate} testID="message-save-button" />
      </BottomSheet>

      <SelectSheet
        visible={clientSheet}
        onClose={() => setClientSheet(false)}
        title="Enviar para quem?"
        searchable
        options={clients.map((c) => ({ key: c.id, label: c.name, sublabel: c.city }))}
        onSelect={sendToClient}
        emptyLabel="Cadastre clientes primeiro."
        testID="messages-client-sheet"
      />

      <ConfirmSheet
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Excluir modelo?"
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteMessage(confirmDelete);
          toast("Modelo excluído.", "success");
        }}
        testID="message-delete-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  hint: { fontSize: 13, color: c.muted, fontWeight: "600", marginBottom: spacing.xs },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: "900", color: c.onSurface },
  body: { fontSize: 15, color: c.onSurfaceSecondary, lineHeight: 22, marginVertical: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
}));
