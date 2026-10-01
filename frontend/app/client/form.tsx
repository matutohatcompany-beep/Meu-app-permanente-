import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field, SelectButton } from "@/src/components/field";
import { ConfirmSheet, SelectSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, Card, ScreenHeader } from "@/src/components/ui";
import { useData } from "@/src/db/DataContext";
import { spacing } from "@/src/theme";
import { makeStyles } from "@/src/theme";

const WEEKS = Array.from({ length: 9 }, (_, i) => ({ key: String(i + 1), label: `Semana ${i + 1}` }));

export default function ClientForm() {
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const { db, addClient, updateClient, deleteClient } = useData();

  const existing = params.id ? db.clients.find((c) => c.id === params.id) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [size, setSize] = useState(existing?.size ?? "");
  const [birthday, setBirthday] = useState(existing?.birthday ?? "");
  const [howMet, setHowMet] = useState(existing?.howMet ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [cycleWeek, setCycleWeek] = useState<number | undefined>(existing?.cycleWeek);
  const [address, setAddress] = useState(existing?.address ?? "");
  const [lat, setLat] = useState(existing?.lat != null ? String(existing.lat) : "");
  const [lng, setLng] = useState(existing?.lng != null ? String(existing.lng) : "");

  const [weekSheet, setWeekSheet] = useState(false);
  const [citySheet, setCitySheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    if (!name.trim()) {
      toast("Informe o nome do cliente.", "error");
      return;
    }
    const payload = {
      name: name.trim(),
      whatsapp: whatsapp.trim() || undefined,
      city: city.trim() || undefined,
      size: size.trim() || undefined,
      birthday: birthday.trim() || undefined,
      howMet: howMet.trim() || undefined,
      notes: notes.trim() || undefined,
      cycleWeek,
      address: address.trim() || undefined,
      lat: lat ? Number(lat.replace(",", ".")) : undefined,
      lng: lng ? Number(lng.replace(",", ".")) : undefined,
    };
    if (existing) {
      updateClient(existing.id, payload);
      toast("Cliente atualizado.", "success");
    } else {
      addClient(payload as any);
      toast("Cliente cadastrado.", "success");
    }
    router.back();
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title={existing ? "Editar cliente" : "Novo cliente"} back />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: 0 }}>
          <Field label="Nome *" value={name} onChangeText={setName} placeholder="Nome do cliente" icon="users" testID="client-name-input" />
          <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="(99) 99999-9999" keyboardType="phone-pad" icon="phone" testID="client-whatsapp-input" />
          <Field label="Cidade" value={city} onChangeText={setCity} placeholder="Cidade" icon="pin" testID="client-city-input" />
          {db.cities.length > 0 && (
            <SelectButton placeholder="Usar cidade já cadastrada" value={null} onPress={() => setCitySheet(true)} testID="client-city-select" />
          )}
          <Field label="Tamanho (botina)" value={size} onChangeText={setSize} placeholder="Ex: 40" testID="client-size-input" />
          <Field label="Aniversário" value={birthday} onChangeText={setBirthday} placeholder="Ex: 15/03" testID="client-birthday-input" />
          <Field label="Como te conheceu" value={howMet} onChangeText={setHowMet} placeholder="Indicação, feira, redes..." testID="client-howmet-input" />
          <SelectButton
            label="Semana do ciclo (rota)"
            placeholder="Nenhuma"
            value={cycleWeek ? `Semana ${cycleWeek}` : undefined}
            onPress={() => setWeekSheet(true)}
            testID="client-week-select"
          />
          <Field label="Observações" value={notes} onChangeText={setNotes} placeholder="Anotações livres" multiline testID="client-notes-input" />
        </Card>

        <Card style={{ gap: 0 }}>
          <Field label="Endereço (opcional)" value={address} onChangeText={setAddress} placeholder="Rua, número, bairro" testID="client-address-input" />
          <Field label="Latitude (opcional)" value={lat} onChangeText={setLat} placeholder="-23.5505" keyboardType="numbers-and-punctuation" testID="client-lat-input" />
          <Field label="Longitude (opcional)" value={lng} onChangeText={setLng} placeholder="-46.6333" keyboardType="numbers-and-punctuation" testID="client-lng-input" />
        </Card>

        <Button label={existing ? "Salvar alterações" : "Cadastrar cliente"} icon="check" onPress={save} testID="client-save-button" />
        {existing && (
          <Button label="Excluir cliente" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} testID="client-delete-button" />
        )}
      </KeyboardAwareScrollView>

      <SelectSheet
        visible={weekSheet}
        onClose={() => setWeekSheet(false)}
        title="Semana do ciclo"
        options={WEEKS}
        onSelect={(k) => setCycleWeek(Number(k))}
        testID="client-week-sheet"
      />
      <SelectSheet
        visible={citySheet}
        onClose={() => setCitySheet(false)}
        title="Cidades cadastradas"
        searchable
        options={db.cities.map((ci) => ({ key: ci, label: ci }))}
        onSelect={(k) => setCity(k)}
        testID="client-city-sheet"
      />
      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir cliente?"
        message="O cliente será removido da lista. O histórico de vendas é preservado."
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          if (existing) deleteClient(existing.id);
          toast("Cliente excluído.", "success");
          router.replace("/(tabs)/clients");
        }}
        testID="client-delete-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
}));
