import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Field, MoneyField, SelectButton, Stepper } from "@/src/components/field";
import { ConfirmSheet, SelectSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Badge, Button, Card, EmptyState, IconButton, KV, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { NewSaleItemInput, useActiveClients, useActiveProducts, useData } from "@/src/db/DataContext";
import { Product, ProductType, SALE_LOCATIONS } from "@/src/db/types";
import { finalizeItem, rollUpSale } from "@/src/logic/calculations";
import { formatDate, formatDateLong, todayKey } from "@/src/logic/date";
import { formatBRL } from "@/src/logic/money";
import { newId } from "@/src/db/ids";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

interface EditItem extends NewSaleItemInput {
  key: string;
}

export default function SaleDetail() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, correctSale, deleteSale } = useData();
  const clients = useActiveClients();
  const products = useActiveProducts();

  const sale = db.sales.find((x) => x.id === id && !x.deletedAt);

  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState<string | null>(sale?.clientId ?? null);
  const [dateStr, setDateStr] = useState(sale ? sale.date.slice(0, 10) : todayKey());
  const [items, setItems] = useState<EditItem[]>(
    sale ? sale.items.map((it) => ({ ...it, key: it.id })) : [],
  );
  const [clientSheet, setClientSheet] = useState(false);
  const [sizeSheetFor, setSizeSheetFor] = useState<string | null>(null);
  const [productSheet, setProductSheet] = useState<ProductType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totals = useMemo(
    () =>
      rollUpSale(
        items.map((it) =>
          finalizeItem({
            id: it.key,
            productType: it.productType,
            productId: it.productId,
            code: it.code,
            name: it.name,
            category: it.category,
            size: it.size,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            unitCost: it.unitCost,
            commissionPct: it.commissionPct,
            total: 0,
          }),
        ),
      ),
    [items],
  );

  if (!sale) {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Venda" back />
        <EmptyState icon="cart" title="Venda não encontrada." />
      </View>
    );
  }

  const client = clients.find((c) => c.id === clientId);

  function patchItem(key: string, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function addProduct(p: Product, type: ProductType) {
    setItems((prev) => [
      ...prev,
      {
        key: newId("ei"),
        productType: type,
        productId: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        size: undefined,
        quantity: 1,
        unitPrice: p.price,
        unitCost: type === "moda" ? p.cost : undefined,
        commissionPct: type === "botina" ? db.config.commissionPct : undefined,
      },
    ]);
  }

  function saveCorrection() {
    if (items.length === 0) {
      toast("A venda precisa de ao menos um item.", "error");
      return;
    }
    const iso = new Date(`${dateStr}T12:00:00`);
    correctSale(sale!.id, {
      date: isNaN(iso.getTime()) ? sale!.date : iso.toISOString(),
      clientId,
      clientName: client?.name ?? sale!.clientName,
      city: client?.city ?? sale!.city,
      location: sale!.location,
      payment: sale!.payment,
      items: items.map(({ key, ...rest }) => rest),
    });
    toast("Venda corrigida.", "success");
    setEditing(false);
  }

  const locationLabel = sale.location ? SALE_LOCATIONS.find((l) => l.key === sale.location)?.label : null;
  const sizeItem = sizeSheetFor ? items.find((i) => i.key === sizeSheetFor) : null;
  const sizeOptions = sizeItem
    ? (products.find((p) => p.id === sizeItem.productId)?.sizes ?? []).map((z) => ({ key: z, label: z }))
    : [];

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={editing ? "Corrigir venda" : "Detalhe da venda"}
        subtitle={formatDate(sale.date)}
        back
        right={
          !editing ? (
            <IconButton name="pencil" onPress={() => setEditing(true)} testID="sale-edit-button" />
          ) : undefined
        }
      />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {!editing ? (
          <>
            <Card>
              <KV label="Cliente" value={sale.clientName || "Cliente avulso"} />
              <KV label="Data" value={formatDateLong(sale.date)} />
              {sale.city ? <KV label="Cidade" value={sale.city} /> : null}
              {locationLabel ? <KV label="Local" value={locationLabel} /> : null}
            </Card>

            <View>
              <SectionTitle>Itens</SectionTitle>
              <View style={{ gap: spacing.sm }}>
                {sale.items.map((it) => (
                  <Card key={it.id}>
                    <View style={s.itemHead}>
                      <Badge label={it.productType === "botina" ? "Botina" : "Moda"} tone={it.productType === "botina" ? "neutral" : "accent"} />
                      <Text style={s.itemCode}>{it.code}</Text>
                    </View>
                    <Text style={s.itemName}>{it.name}{it.size ? ` · nº ${it.size}` : ""}</Text>
                    <KV label="Quantidade" value={String(it.quantity)} />
                    <KV label="Preço unitário" value={formatBRL(it.unitPrice)} />
                    <KV label="Total" value={formatBRL(it.total)} strong />
                    {it.productType === "moda" && (
                      <>
                        <KV label="Custo (registrado)" value={formatBRL(it.unitCost ?? 0)} tone="muted" />
                        <KV label="Lucro" value={formatBRL(it.profit ?? 0)} tone="success" />
                      </>
                    )}
                    {it.productType === "botina" && (
                      <KV label={`Comissão (${it.commissionPct}%)`} value={formatBRL(it.commission ?? 0)} tone="success" />
                    )}
                  </Card>
                ))}
              </View>
            </View>

            <Card>
              <KV label="Total botinas" value={formatBRL(sale.bootTotal)} />
              <KV label="Comissão botinas" value={formatBRL(sale.bootCommission)} tone="success" />
              <KV label="Total moda" value={formatBRL(sale.modaTotal)} />
              <KV label="Lucro moda" value={formatBRL(sale.modaProfit)} tone="success" />
              <View style={s.sep} />
              <KV label="Ganho da venda" value={formatBRL(sale.grossGain)} strong tone="success" />
            </Card>

            <Button label="Corrigir venda" icon="pencil" onPress={() => setEditing(true)} testID="sale-correct-button" />
            <Button label="Excluir venda" icon="trash" variant="danger" onPress={() => setConfirmDelete(true)} testID="sale-delete-button" />
          </>
        ) : (
          <>
            <Card>
              <SelectButton label="Cliente" icon="users" placeholder="Selecionar cliente" value={client?.name} onPress={() => setClientSheet(true)} testID="sale-edit-client" />
              <Field label="Data (AAAA-MM-DD)" value={dateStr} onChangeText={setDateStr} icon="calendar" testID="sale-edit-date" />
            </Card>

            <View>
              <SectionTitle right={
                <View style={{ flexDirection: "row", gap: spacing.xs }}>
                  <IconButton name="boot" bg={colors.brandTertiary} onPress={() => setProductSheet("botina")} testID="sale-add-botina" />
                  <IconButton name="shirt" bg={colors.brandTertiary} onPress={() => setProductSheet("moda")} testID="sale-add-moda" />
                </View>
              }>Itens</SectionTitle>
              <View style={{ gap: spacing.sm }}>
                {items.map((it) => (
                  <Card key={it.key}>
                    <View style={s.itemHead}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
                        <Badge label={it.productType === "botina" ? "Botina" : "Moda"} tone={it.productType === "botina" ? "neutral" : "accent"} />
                        <Text style={s.itemName} numberOfLines={1}>{it.code} · {it.name}</Text>
                      </View>
                      <IconButton name="trash" size={18} color={colors.error} onPress={() => removeItem(it.key)} testID={`sale-remove-${it.key}`} />
                    </View>
                    {it.productType === "botina" && (
                      <SelectButton placeholder="Numeração" value={it.size} onPress={() => setSizeSheetFor(it.key)} testID={`sale-size-${it.key}`} />
                    )}
                    <Text style={s.miniLabel}>Quantidade</Text>
                    <View style={{ marginBottom: spacing.sm }}>
                      <Stepper value={it.quantity} onChange={(n) => patchItem(it.key, { quantity: n })} testID={`sale-qty-${it.key}`} />
                    </View>
                    <MoneyField label="Preço unitário" cents={it.unitPrice} onChange={(v) => patchItem(it.key, { unitPrice: v })} testID={`sale-price-${it.key}`} />
                    {it.productType === "botina" && (
                      <Field
                        label="Comissão aplicada (%)"
                        value={String(it.commissionPct ?? db.config.commissionPct)}
                        onChangeText={(t) => patchItem(it.key, { commissionPct: Number(t.replace(/[^\d.,]/g, "").replace(",", ".")) || 0 })}
                        keyboardType="decimal-pad"
                        testID={`sale-commission-${it.key}`}
                      />
                    )}
                  </Card>
                ))}
              </View>
            </View>

            <Card>
              <KV label="Total" value={formatBRL(totals.bootTotal + totals.modaTotal)} strong />
              <KV label="Ganho" value={formatBRL(totals.grossGain)} tone="success" strong />
            </Card>

            <Button label="Salvar correção" icon="check" onPress={saveCorrection} testID="sale-save-correction" />
            <Button label="Cancelar" variant="ghost" onPress={() => {
              setEditing(false);
              setItems(sale.items.map((it) => ({ ...it, key: it.id })));
              setClientId(sale.clientId ?? null);
              setDateStr(sale.date.slice(0, 10));
            }} testID="sale-cancel-correction" />
          </>
        )}
      </KeyboardAwareScrollView>

      <SelectSheet
        visible={clientSheet}
        onClose={() => setClientSheet(false)}
        title="Selecionar cliente"
        searchable
        options={clients.map((c) => ({ key: c.id, label: c.name, sublabel: c.city }))}
        onSelect={(k) => setClientId(k)}
        testID="sale-client-sheet"
      />
      <SelectSheet
        visible={!!sizeSheetFor}
        onClose={() => setSizeSheetFor(null)}
        title="Numeração"
        options={sizeOptions}
        onSelect={(k) => sizeSheetFor && patchItem(sizeSheetFor, { size: k })}
        testID="sale-size-sheet"
      />
      <SelectSheet
        visible={!!productSheet}
        onClose={() => setProductSheet(null)}
        title="Adicionar produto"
        searchable
        options={products.filter((p) => p.type === productSheet).map((p) => ({ key: p.id, label: `${p.code} · ${p.name}`, sublabel: formatBRL(p.price) }))}
        onSelect={(k) => {
          const p = products.find((x) => x.id === k);
          if (p && productSheet) addProduct(p, productSheet);
        }}
        testID="sale-product-sheet"
      />

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir venda?"
        message="A venda será removida. Outras vendas não são afetadas."
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          deleteSale(sale.id);
          toast("Venda excluída.", "success");
          router.back();
        }}
        testID="sale-delete-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  itemHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  itemCode: { fontSize: 12, fontWeight: "900", color: c.brandPrimary },
  itemName: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginBottom: spacing.xs, flexShrink: 1 },
  miniLabel: { fontSize: 14, fontWeight: "700", color: c.onSurfaceSecondary, marginBottom: 6 },
  sep: { height: 1, backgroundColor: c.divider, marginVertical: spacing.sm },
}));
