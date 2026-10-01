import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { Field, MoneyField, Segmented, SelectButton } from "@/src/components/field";
import { ConfirmSheet, SelectSheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, Card, ScreenHeader } from "@/src/components/ui";
import { useData } from "@/src/db/DataContext";
import { MODA_CATEGORIES, ModaCategory, ProductType } from "@/src/db/types";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ProductForm() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const { db, addProduct, updateProduct, deleteProduct, findProductByCode } = useData();

  const existing = params.id ? db.products.find((p) => p.id === params.id) : undefined;
  const [type, setType] = useState<ProductType>(
    (existing?.type as ProductType) || (params.type as ProductType) || "botina",
  );
  const [code, setCode] = useState(existing?.code ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<ModaCategory | undefined>(existing?.category);
  const [cost, setCost] = useState(existing?.cost ?? 0);
  const [price, setPrice] = useState(existing?.price ?? 0);
  const [sizes, setSizes] = useState((existing?.sizes ?? []).join(", "));
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null);

  const [catSheet, setCatSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);

  function onCodeBlur() {
    if (!existing && code.trim() && !name.trim()) {
      const match = findProductByCode(type, code);
      if (match) {
        setName(match.name);
        if (match.price) setPrice(match.price);
        toast("Produto reconhecido pelo código.", "info");
      }
    }
  }

  async function compress(uri: string): Promise<string> {
    try {
      const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return r.uri;
    } catch {
      return uri;
    }
  }

  async function pickFromGallery() {
    setPhotoSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        toast("Permita o acesso à galeria nas configurações.", "error");
        Linking.openSettings();
      } else {
        toast("Permissão da galeria negada.", "error");
      }
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhotoUri(await compress(res.assets[0].uri));
  }

  async function takePhoto() {
    setPhotoSheet(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        toast("Permita o acesso à câmera nas configurações.", "error");
        Linking.openSettings();
      } else {
        toast("Permissão da câmera negada.", "error");
      }
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhotoUri(await compress(res.assets[0].uri));
  }

  function save() {
    if (!code.trim()) {
      toast("Informe o código.", "error");
      return;
    }
    if (!name.trim()) {
      toast("Informe o nome.", "error");
      return;
    }
    if (type === "moda" && !category) {
      toast("Escolha a categoria.", "error");
      return;
    }
    const sizeArr = sizes
      .split(/[,;/\s]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const payload = {
      type,
      code: code.trim(),
      name: name.trim(),
      category: type === "moda" ? category : undefined,
      cost: type === "moda" ? cost : undefined,
      price,
      sizes: type === "botina" ? sizeArr : undefined,
      photoUri,
    };
    if (existing) {
      updateProduct(existing.id, payload);
      toast("Produto atualizado.", "success");
    } else {
      addProduct(payload as any);
      toast("Produto cadastrado.", "success");
    }
    router.back();
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title={existing ? "Editar produto" : "Novo produto"} back />
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {!existing && (
          <Segmented
            options={[
              { key: "botina", label: "Botina" },
              { key: "moda", label: "Moda Country" },
            ]}
            value={type}
            onChange={(k) => setType(k as ProductType)}
            testID="product-type-segmented"
          />
        )}

        {/* photo */}
        <Pressable style={s.photoBox} onPress={() => setPhotoSheet(true)} testID="product-photo-button">
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" transition={150} />
          ) : (
            <>
              <Icon name="camera" size={28} color={colors.muted} />
              <Text style={s.photoHint}>Adicionar foto (opcional)</Text>
            </>
          )}
        </Pressable>
        {photoUri && (
          <Button label="Remover foto" variant="ghost" size="md" icon="trash" onPress={() => setPhotoUri(null)} testID="product-remove-photo" />
        )}

        <Card style={{ gap: 0 }}>
          <Field
            label="Código"
            value={code}
            onChangeText={setCode}
            placeholder="Ex: B100"
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={onCodeBlur}
            testID="product-code-input"
          />
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Ex: Botina Trabalho Marrom" testID="product-name-input" />

          {type === "moda" && (
            <>
              <SelectButton
                label="Categoria"
                placeholder="Escolher categoria"
                value={category ? MODA_CATEGORIES.find((c) => c.key === category)?.label : undefined}
                onPress={() => setCatSheet(true)}
                testID="product-category-select"
              />
              <MoneyField label="Custo" cents={cost} onChange={setCost} testID="product-cost-input" />
            </>
          )}

          <MoneyField label="Preço de tabela" cents={price} onChange={setPrice} testID="product-price-input" />

          {type === "botina" && (
            <Field
              label="Numerações disponíveis"
              value={sizes}
              onChangeText={setSizes}
              placeholder="Ex: 36, 37, 38, 39, 40"
              hint="Separe por vírgula. O mesmo código serve para vários tamanhos."
              testID="product-sizes-input"
            />
          )}
        </Card>

        <Button label={existing ? "Salvar alterações" : "Cadastrar produto"} icon="check" onPress={save} testID="product-save-button" />
        {existing && (
          <Button label="Excluir produto" variant="danger" icon="trash" onPress={() => setConfirmDelete(true)} testID="product-delete-button" />
        )}
      </KeyboardAwareScrollView>

      <SelectSheet
        visible={catSheet}
        onClose={() => setCatSheet(false)}
        title="Categoria"
        options={MODA_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        onSelect={(k) => setCategory(k as ModaCategory)}
        testID="product-category-sheet"
      />
      <SelectSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        title="Foto do produto"
        options={[
          { key: "camera", label: "Tirar foto" },
          { key: "gallery", label: "Escolher da galeria" },
        ]}
        onSelect={(k) => (k === "camera" ? takePhoto() : pickFromGallery())}
        testID="product-photo-sheet"
      />
      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir produto?"
        message="O produto será removido da lista. Vendas antigas não são afetadas."
        confirmLabel="Excluir"
        danger
        onConfirm={() => {
          if (existing) deleteProduct(existing.id);
          toast("Produto excluído.", "success");
          router.back();
        }}
        testID="product-delete-sheet"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  photoBox: {
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceTertiary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  photoHint: { color: c.muted, fontWeight: "700", fontSize: 14 },
}));
