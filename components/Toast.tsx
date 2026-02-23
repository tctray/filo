import { useTheme } from "@/providers/ThemeProvider";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

type ToastType = "success" | "error" | "info";

type ToastProps = {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss: () => void;
};

export default function Toast({
  visible,
  message,
  type = "success",
  onDismiss,
}: ToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    opacity.setValue(0);
    translateY.setValue(12);
  }, [visible, opacity, translateY]);

  if (!visible) return null;

  const bg =
    type === "error"
      ? (colors.dangerLight ?? colors.surface)
      : type === "info"
        ? (colors.infoLight ?? colors.surface)
        : (colors.successLight ?? colors.surface);

  const fg =
    type === "error"
      ? (colors.danger ?? colors.text)
      : type === "info"
        ? (colors.info ?? colors.text)
        : (colors.success ?? colors.text);

  return (
    <Pressable style={styles.wrap} onPress={onDismiss}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: bg,
            borderColor: colors.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: fg }]} />
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
          {message}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
  },
});
