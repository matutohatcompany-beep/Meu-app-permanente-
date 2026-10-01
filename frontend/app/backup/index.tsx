import { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { ConfirmSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, Card, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { useData } from "@/src/db/DataContext";
import { todayKey } from "@/src/logic/date";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function BackupScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, exportJSON, importJSON, resetAll } = useData();
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState<string | null>(null);

  const stats = {
    clients: db.clients.filter((c) => !c.deletedAt).length,
    products: db.products.filter((p) => !p.deletedAt).length,
    sales: db.sales.filter((x) => !x.deletedAt).length,
  };

  async function doExport() {
    setBusy(true);
    try {
      const json = exportJSON();
      const filename = `matuto-backup-${todayKey()}.json`;
      if (Platform.OS === "web") {
        if (typeof document !== "undefined") {
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          toast("Backup baixado.", "success");
        } else {
          await Clipboard.setStringAsync(json);
          toast("Backup copiado para a área de transferência.", "success");
        }
      } else {
        const uri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(uri, json);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Backup Matuto" });
        } else {
          await Clipboard.setStringAsync(json);
          toast("Backup copiado para a área de transferência.", "success");
        }
      }
    } catch {
      toast("Falha ao exportar backup.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function pickAndRead() {
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) {
        setBusy(false);
        return;
      }
      const uri = res.assets[0].uri;
      let content: string;
      if (Platform.OS === "web") {
        content = await (await fetch(uri)).text();
      } else {
        content = await FileSystem.readAsStringAsync(uri);
      }
      setConfirmImport(content);
    } catch {
      toast("Não foi possível ler o arquivo.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Backup" subtitle="Exportar e restaurar dados" back />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={s.statsRow}>
            <Stat label="Clientes" value={stats.clients} />
            <Stat label="Produtos" value={stats.products} />
            <Stat label="Vendas" value={stats.sales} />
          </View>
        </Card>

        <Card>
          <SectionTitle>Fazer backup</SectionTitle>
          <Text style={s.desc}>Gera um arquivo JSON com todos os seus dados. Guarde em local seguro.</Text>
          <Button label="Exportar backup (JSON)" icon="download" onPress={doExport} loading={busy} testID="backup-export-button" />
        </Card>

        <Card>
          <SectionTitle>Restaurar backup</SectionTitle>
          <Text style={s.desc}>Selecione um arquivo JSON exportado anteriormente. Os dados atuais serão substituídos.</Text>
          <Button label="Restaurar backup" icon="upload" variant="secondary" onPress={pickAndRead} loading={busy} testID="backup-import-button" />
        </Card>

        <Card>
          <View style={s.dangerHead}>
            <Icon name="alert" size={18} color={colors.error} />
            <Text style={s.dangerTitle}>Zona de perigo</Text>
          </View>
          <Text style={s.desc}>Apaga todos os dados e volta ao estado inicial.</Text>
          <Button label="Apagar todos os dados" icon="trash" variant="danger" onPress={() => setConfirmReset(true)} testID="backup-reset-button" />
        </Card>
      </ScrollView>

      <ConfirmSheet
        visible={!!confirmImport}
        onClose={() => setConfirmImport(null)}
        title="Restaurar backup?"
        message="Isso substitui todos os dados atuais pelos dados do arquivo."
        confirmLabel="Restaurar"
        onConfirm={() => {
          if (!confirmImport) return;
          const r = importJSON(confirmImport);
          toast(r.ok ? "Backup restaurado com sucesso." : r.error || "Falha ao restaurar.", r.ok ? "success" : "error");
        }}
        testID="backup-import-sheet"
      />
      <ConfirmSheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Apagar todos os dados?"
        message="Esta ação não pode ser desfeita. Faça um backup antes."
        confirmLabel="Apagar tudo"
        danger
        onConfirm={() => {
          resetAll();
          toast("Dados apagados.", "success");
        }}
        testID="backup-reset-sheet"
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "900", color: c.brandPrimary },
  statLabel: { fontSize: 13, color: c.muted, fontWeight: "700", marginTop: 2 },
  desc: { fontSize: 14, color: c.muted, lineHeight: 20, marginBottom: spacing.md, fontWeight: "600" },
  dangerHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  dangerTitle: { fontSize: 17, fontWeight: "900", color: c.error },
}));
