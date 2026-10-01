import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Badge, EmptyState, FAB, ScreenHeader } from "@/src/components/ui";
import { Segmented } from "@/src/components/field";
import { useActiveProducts } from "@/src/db/DataContext";
import { MODA_CATEGORIES, Product, ProductType } from "@/src/db/types";
import { formatBRL } from "@/src/logic/money";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ProductsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const products = useActiveProducts();
  const [type, setType] = useState<ProductType>("botina");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const base = products.filter((p) => p.type === type);
    if (!q) return base;
    const needle = q.toLowerCase();
    return base.filter(
      (p) =>
        p.code.toLowerCase().includes(needle) ||
        p.name.toLowerCase().includes(needle) ||
        (p.category &&
          MODA_CATEGORIES.find((c) => c.key === p.category)?.label.toLowerCase().includes(needle)),
    );
  }, [products, type, q]);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Produtos" subtitle={`${products.length} cadastrado${products.length === 1 ? "" : "s"}`} />
      <View style={s.controls}>
        <Segmented
          options={[
            { key: "botina", label: "Botinas" },
            { key: "moda", label: "Moda Country" },
          ]}
          value={type}
          onChange={(k) => setType(k as ProductType)}
          testID="products-type-segmented"
        />
        <View style={s.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Pesquisar por código ou nome"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            testID="products-search"
          />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100, gap: spacing.sm }}
        renderItem={({ item }) => <ProductRow product={item} onPress={() => router.push(`/product/form?id=${item.id}`)} />}
        ListEmptyComponent={
          <EmptyState
            icon="package"
            title={type === "botina" ? "Nenhuma botina cadastrada." : "Nenhum produto cadastrado."}
            subtitle="Cadastre seu primeiro produto para começar a vender."
            actionLabel="Novo produto"
            onAction={() => router.push(`/product/form?type=${type}`)}
            testID="products-empty"
          />
        }
        keyboardShouldPersistTaps="handled"
      />
      <FAB
        label="Produto"
        onPress={() => router.push(`/product/form?type=${type}`)}
        testID="products-add-fab"
      />
    </View>
  );
}

function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const cat = MODA_CATEGORIES.find((c) => c.key === product.category)?.label;
  return (
    <Pressable
      testID={`product-row-${product.id}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
    >
      <View style={s.thumb}>
        {product.photoUri ? (
          <Image source={{ uri: product.photoUri }} style={s.thumbImg} contentFit="cover" transition={150} />
        ) : (
          <Icon name={product.type === "botina" ? "boot" : "shirt"} size={24} color={colors.muted} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.rowTop}>
          <Text style={s.code}>{product.code}</Text>
          {cat && <Badge label={cat} />}
        </View>
        <Text style={s.name} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={s.rowBottom}>
          <Text style={s.price}>{formatBRL(product.price)}</Text>
          {product.type === "moda" && product.cost != null && (
            <Text style={s.cost}>custo {formatBRL(product.cost)}</Text>
          )}
          {product.type === "botina" && product.sizes && product.sizes.length > 0 && (
            <Text style={s.cost}>nº {product.sizes.join(", ")}</Text>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={20} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: { flex: 1, fontSize: 16, color: c.onSurface },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
  },
  thumb: {
    width: 56, height: 56, borderRadius: radius.md, backgroundColor: c.surfaceTertiary,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  thumbImg: { width: 56, height: 56 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  code: { fontSize: 13, fontWeight: "900", color: c.brandPrimary },
  name: { fontSize: 16, fontWeight: "800", color: c.onSurface, marginTop: 1 },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: 2 },
  price: { fontSize: 15, fontWeight: "900", color: c.onSurface },
  cost: { fontSize: 13, color: c.muted, fontWeight: "600" },
}));
