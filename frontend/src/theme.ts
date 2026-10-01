// Design tokens — "Matuto / Renan Vendas". Rustic country modern, leather/earth
// tones with a strong amber accent, high contrast for outdoor/sun readability.
// Light scheme only (intentional: maximum contrast under sunlight).

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FAF6EF", // warm parchment canvas
  onSurface: "#231812", // espresso text
  surfaceSecondary: "#FFFFFF", // cards
  onSurfaceSecondary: "#2E2017",
  surfaceTertiary: "#F1E7D7", // inputs, chips
  onSurfaceTertiary: "#5A4634",
  surfaceInverse: "#2A1C10", // dark leather (headers, snackbars)
  onSurfaceInverse: "#FAF6EF",
  muted: "#8B7560", // captions, placeholders

  // Brand (saddle leather)
  brand: "#8A4A1E",
  onBrand: "#FFFFFF",
  brandPrimary: "#8A4A1E", // primary CTA, active tab
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#EADDC8", // sand, secondary CTA
  onBrandSecondary: "#3A2A1C",
  brandTertiary: "#F3E8D6", // chips, tags
  onBrandTertiary: "#5A4634",

  // Accent (amber / ochre) — highlights, progress, emphasis
  accent: "#E08A1E",
  onAccent: "#231812",

  // Status
  success: "#2E7D32",
  onSuccess: "#FFFFFF",
  warning: "#C77700",
  onWarning: "#FFFFFF",
  error: "#B3261E",
  onError: "#FFFFFF",
  info: "#1565C0",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E4D7C2",
  borderStrong: "#C9B698",
  divider: "#EADDC8",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Shared spacing / radius scale (8pt grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};
