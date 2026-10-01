import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { Icon, IconName } from "@/src/components/icon";
import { useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();
  const tab = (name: IconName) => ({
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <Icon name={name} size={24} color={color} strokeWidth={focused ? 2.6 : 2} />
    ),
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
          paddingTop: 6,
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", ...tab("home") }} />
      <Tabs.Screen name="sell" options={{ title: "Vender", ...tab("cart") }} />
      <Tabs.Screen name="clients" options={{ title: "Clientes", ...tab("users") }} />
      <Tabs.Screen name="products" options={{ title: "Produtos", ...tab("package") }} />
      <Tabs.Screen name="more" options={{ title: "Mais", ...tab("more") }} />
    </Tabs>
  );
}
