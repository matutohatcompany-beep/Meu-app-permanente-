import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { MoneyField, SelectButton, Segmented, Stepper } from "@/src/components/field";
import { ConfirmSheet, SelectSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Badge, Button, Card, IconButton, KV, ScreenHeader, SectionTitle } from "@/src/components/ui";
import { NewSaleItemInput, useActiveClients, useActiveProducts, useActiveSales, useData } from "@/src/db/DataContext";
import { Product, ProductType, SALE_LOCATIONS, SaleLocation } from "@/src/db/types";
import { finalizeItem, lastPriceForClientProduct, rollUpSale } from "@/src/logic/calculations";
import { formatBRL } from "@/src/logic/money";
import { formatDate } from "@/src/logic/date";
import { newId } from "@/src/db/ids";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

interface DraftItem extends NewSaleItemInput {
  key: string;
}

export default function SellScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { db, addSale, undoLastSale } = useData();
  const clients = useActiveClients();
  const products = useActiveProducts();
  const sales = useActiveSales();

  // sale meta
  const [clientId, setClientId] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [location, setLocation] = useState<SaleLocation | null>(null);
  const [payment, setPayment] = useState<string>("");
  const [items, setItems] = useState<DraftItem[]>([]);

  // item draft
  const [type, setType] = useState<ProductType>("botina");
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);

  // sheets
  const [sheet, setSheet] = useState<null | "client" | "city" | "location" | "product" | "size">(null);
  const [confirmUndo, setConfirmUndo] = useState(false);

  const client = clients.find((c) => c.id === clientId) || null;

  const lastPrice = useMemo(
    () => (product ? lastPriceForClientProduct(sales, clientId, product.id) : null),
    [sales, clientId, product],
  );

  const belowCost = type === "moda" && product?.cost != null && price < product.cost && price > 0;

  // live preview of the current draft item
  const draftPreview = useMemo(() => {
    if (!product) return null;
    return finalizeItem({
      id: "draft",
      productType: type,
      productId: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      size: size ?? undefined,
      quantity: qty,
      unitPrice: price,
      unitCost: type === "moda" ? product.cost : undefined,
      commissionPct: type === "botina" ? db.config.commissionPct : undefined,
      total: 0,
    });
  }, [product, type, size, qty, price, db.config.commissionPct]);

  const cartTotals = useMemo(() => {
    const finalized = items.map((it) =>
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
    );
    return rollUpSale(finalized);
  }, [items]);

  function selectProduct(p: Product) {
    setProduct(p);
    setPrice(p.price);
    setSize(null);
  }

  function resetDraft() {
    setProduct(null);
    setSize(null);
    setQty(1);
    setPrice(0);
  }

  function addItem() {
    if (!product) {
      toast("Selecione um produto.", "error");
      return;
    }
    if (type === "botina" && product.sizes && product.sizes.length > 0 && !size) {
      toast("Escolha a numeração.", "error");
      return;
    }
    if (qty <= 0) {
      toast("Quantidade deve ser maior que zero.", "error");
      return;
    }
    const draft: DraftItem = {
      key: newId("draft"),
      productType: type,
      productId: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      size: size ?? undefined,
      quantity: qty,
      unitPrice: price,
      unitCost: type === "moda" ? product.cost : undefined,
      commissionPct: type === "botina" ? db.config.commissionPct : undefined,
    };
    setItems((prev) => [...prev, draft]);
    resetDraft();
    toast("Item adicionado.", "success");
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function finalize() {
    if (!clientId) {
      toast("Selecione o cliente.", "error");
      setSheet("client");
      return;
    }
    if (items.length === 0) {
      toast("Adicione ao menos um item.", "error");
      return;
    }
    addSale({
      clientId,
      clientName: client?.name,
      city: city ?? client?.city,
      location: location ?? undefined,
      payment: payment || undefined,
      items: items.map(({ key, ...rest }) => rest),
    });
    toast("Venda registrada! 🎉", "success");
    setItems([]);
    resetDraft();
    setClientId(null);
    setCity(null);
    setLocation(null);
    setPayment("");
  }

  const productOptions = products
    .filter((p) => p.type === type)
    .map((p) => ({ key: p.id, label: `${p.code} · ${p.name}`, sublabel: formatBRL(p.price) }));

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Nova venda"
        subtitle={formatDate(new Date())}
        right={
          <IconButton name="undo" onPress={() => setConfirmUndo(true)} testID="sell-undo-button" color={colors.error} />
        }
      />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sale meta */}
        <Card>
          <SelectButton
            label="Cliente"
            icon="users"
            placeholder="Selecionar cliente"
            value={client?.name}
            onPress={() => setSheet("client")}
            testID="sell-client-select"
          />
          <SelectButton
            label="Cidade"
            icon="pin"
            placeholder={client?.city || "Selecionar cidade"}
            value={city || client?.city}
            onPress={() => setSheet("city")}
            testID="sell-city-select"
          />
          <SelectButton
            label="Local da venda"
            icon="route"
            placeholder="Selecionar local"
            value={location ? SALE_LOCATIONS.find((l) => l.key === location)?.label : undefined}
            onPress={() => setSheet("location")}
            testID="sell-location-select"
          />
        </Card>

        {/* Item builder */}
        <Card>
          <SectionTitle>Adicionar item</SectionTitle>
          <View style={{ marginBottom: spacing.md }}>
            <Segmented
              options={[
                { key: "botina", label: "Botina" },
                { key: "moda", label: "Moda Country" },
              ]}
              value={type}
              onChange={(k) => {
                setType(k as ProductType);
                resetDraft();
              }}
              testID="sell-type-segmented"
            />
          </View>

          <SelectButton
            label="Produto (código)"
            icon="package"
            placeholder="Selecionar produto"
            value={product ? `${product.code} · ${product.name}` : undefined}
            onPress={() => {
              if (productOptions.length === 0) {
                toast("Cadastre um produto primeiro.", "error");
                return;
              }
              setSheet("product");
            }}
            testID="sell-product-select"
          />

          {product && (
            <>
              {type === "botina" && product.sizes && product.sizes.length > 0 && (
                <SelectButton
                  label="Numeração"
                  placeholder="Escolher numeração"
                  value={size}
                  onPress={() => setSheet("size")}
                  testID="sell-size-select"
                />
              )}

              <Text style={s.fieldLabel}>Quantidade</Text>
              <View style={{ marginBottom: spacing.md }}>
                <Stepper value={qty} onChange={setQty} testID="sell-qty-stepper" />
              </View>

              <MoneyField
                label="Preço de venda (unitário)"
                cents={price}
                onChange={setPrice}
                big
                testID="sell-price-input"
                tone={belowCost ? "error" : "default"}
                hint={
                  product.price !== price
                    ? `Preço de tabela: ${formatBRL(product.price)}`
                    : undefined
                }
              />

              {belowCost && (
                <View style={s.warning} testID="sell-below-cost-warning">
                  <Icon name="alert" size={18} color={colors.onWarning} />
                  <Text style={s.warningText}>ATENÇÃO: preço abaixo do custo</Text>
                </View>
              )}

              {lastPrice && (
                <View style={s.lastPrice} testID="sell-last-price">
                  <Icon name="history" size={16} color={colors.info} />
                  <Text style={s.lastPriceText}>
                    Último preço deste cliente: {formatBRL(lastPrice.unitPrice)} ({formatDate(lastPrice.date)})
                  </Text>
                </View>
              )}

              {/* discrete profit / commission */}
              {draftPreview && (
                <View style={s.draftTotals}>
                  <Text style={s.draftTotal}>Total do item: {formatBRL(draftPreview.total)}</Text>
                  {type === "moda" && (
                    <Text style={s.draftProfit}>
                      Lucro: {formatBRL(draftPreview.profit ?? 0)}
                    </Text>
                  )}
                  {type === "botina" && (
                    <Text style={s.draftProfit}>
                      Comissão ({draftPreview.commissionPct}%): {formatBRL(draftPreview.commission ?? 0)}
                    </Text>
                  )}
                </View>
              )}

              <Button label="Adicionar item" icon="plus" onPress={addItem} testID="sell-add-item-button" style={{ marginTop: spacing.sm }} />
            </>
          )}
        </Card>

        {/* Cart */}
        {items.length > 0 && (
          <Card>
            <SectionTitle right={<Text style={s.cartCount}>{items.length} item(ns)</Text>}>Carrinho</SectionTitle>
            {items.map((it) => {
              const fin = finalizeItem({
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
              });
              return (
                <View key={it.key} style={s.cartItem}>
                  <View style={{ flex: 1 }}>
                    <View style={s.cartItemTop}>
                      <Badge label={it.productType === "botina" ? "Botina" : "Moda"} tone={it.productType === "botina" ? "neutral" : "accent"} />
                      <Text style={s.cartCode}>{it.code}</Text>
                    </View>
                    <Text style={s.cartName} numberOfLines={1}>
                      {it.name}
                      {it.size ? ` · nº ${it.size}` : ""}
                    </Text>
                    <Text style={s.cartMeta}>
                      {it.quantity} × {formatBRL(it.unitPrice)} = {formatBRL(fin.total)}
                    </Text>
                  </View>
                  <IconButton name="trash" onPress={() => removeItem(it.key)} color={colors.error} testID={`sell-remove-${it.key}`} />
                </View>
              );
            })}
            <View style={s.sep} />
            <KV label="Total botinas" value={formatBRL(cartTotals.bootTotal)} />
            <KV label="Total moda" value={formatBRL(cartTotals.modaTotal)} />
            <KV label="Ganho (comissão + lucro)" value={formatBRL(cartTotals.grossGain)} tone="success" strong />
          </Card>
        )}

        <Button
          label={`Finalizar venda · ${formatBRL(cartTotals.bootTotal + cartTotals.modaTotal)}`}
          icon="check"
          onPress={finalize}
          disabled={items.length === 0}
          testID="sell-finalize-button"
        />
      </KeyboardAwareScrollView>

      {/* Sheets */}
      <SelectSheet
        visible={sheet === "client"}
        onClose={() => setSheet(null)}
        title="Selecionar cliente"
        searchable
        options={clients.map((c) => ({ key: c.id, label: c.name, sublabel: c.city }))}
        onSelect={(k) => {
          setClientId(k);
          const c = clients.find((x) => x.id === k);
          if (c?.city) setCity(c.city);
        }}
        emptyLabel="Nenhum cliente. Cadastre na aba Clientes."
        testID="sell-client-sheet"
      />
      <SelectSheet
        visible={sheet === "city"}
        onClose={() => setSheet(null)}
        title="Selecionar cidade"
        searchable
        options={db.cities.map((ci) => ({ key: ci, label: ci }))}
        onSelect={(k) => setCity(k)}
        emptyLabel="Nenhuma cidade. Adicione ao cadastrar clientes."
        testID="sell-city-sheet"
      />
      <SelectSheet
        visible={sheet === "location"}
        onClose={() => setSheet(null)}
        title="Local da venda"
        options={SALE_LOCATIONS.map((l) => ({ key: l.key, label: l.label }))}
        onSelect={(k) => setLocation(k as SaleLocation)}
        testID="sell-location-sheet"
      />
      <SelectSheet
        visible={sheet === "product"}
        onClose={() => setSheet(null)}
        title="Selecionar produto"
        searchable
        options={productOptions}
        onSelect={(k) => {
          const p = products.find((x) => x.id === k);
          if (p) selectProduct(p);
        }}
        testID="sell-product-sheet"
      />
      <SelectSheet
        visible={sheet === "size"}
        onClose={() => setSheet(null)}
        title="Numeração"
        options={(product?.sizes ?? []).map((z) => ({ key: z, label: z }))}
        onSelect={(k) => setSize(k)}
        testID="sell-size-sheet"
      />

      <ConfirmSheet
        visible={confirmUndo}
        onClose={() => setConfirmUndo(false)}
        title="Desfazer última venda?"
        message="A última venda confirmada será desfeita. As outras vendas não são afetadas."
        confirmLabel="Desfazer última venda"
        danger
        onConfirm={() => {
          const undone = undoLastSale();
          toast(undone ? "Última venda desfeita." : "Não há vendas para desfazer.", undone ? "success" : "info");
        }}
        testID="sell-undo-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  fieldLabel: { fontSize: 14, fontWeight: "700", color: c.onSurfaceSecondary, marginBottom: 6 },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.warning,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: { color: c.onWarning, fontWeight: "900", fontSize: 14 },
  lastPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lastPriceText: { color: c.onSurfaceTertiary, fontWeight: "700", fontSize: 13, flexShrink: 1 },
  draftTotals: { marginBottom: spacing.sm },
  draftTotal: { fontSize: 15, fontWeight: "800", color: c.onSurface },
  draftProfit: { fontSize: 13, color: c.muted, fontWeight: "700", marginTop: 2 },
  cartCount: { fontSize: 13, color: c.muted, fontWeight: "700" },
  cartItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  cartItemTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cartCode: { fontSize: 12, fontWeight: "900", color: c.brandPrimary },
  cartName: { fontSize: 15, fontWeight: "800", color: c.onSurface, marginTop: 2 },
  cartMeta: { fontSize: 13, color: c.muted, fontWeight: "600", marginTop: 1 },
  sep: { height: 1, backgroundColor: c.divider, marginVertical: spacing.sm },
}));
