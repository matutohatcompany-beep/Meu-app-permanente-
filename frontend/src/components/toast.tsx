import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, IconName } from "@/src/components/icon";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type ToastKind = "success" | "error" | "info";

interface ToastState {
  message: string;
  kind: ToastKind;
}

const ToastCtx = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  const show = useCallback(
    (message: string, kind: ToastKind = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, kind });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          () => setToast(null),
        );
      }, 2600);
    },
    [opacity],
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const iconFor: Record<ToastKind, IconName> = {
    success: "check",
    error: "alert",
    info: "info",
  };
  const colorFor: Record<ToastKind, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { opacity, top: insets.top + spacing.md }]}
          testID="app-toast"
        >
          <View style={styles.toast}>
            <View style={[styles.dot, { backgroundColor: colorFor[toast.kind] }]}>
              <Icon name={iconFor[toast.kind]} size={16} color={colors.onSurfaceInverse} />
            </View>
            <Text style={styles.text} numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

const useStyles = makeStyles((c) => ({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceInverse,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    maxWidth: 460,
    ...StyleSheet.flatten({
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    }),
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: c.onSurfaceInverse, fontSize: 15, fontWeight: "600", flexShrink: 1 },
}));
