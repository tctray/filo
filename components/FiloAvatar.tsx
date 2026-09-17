// components/FiloAvatar.tsx
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type FiloAvatarProps = {
  colors: any;
  size?: number;
  imageUri?: string;
  name?: string;
};

export function FiloAvatar({
  colors,
  size = 48,
  imageUri,
  name,
}: FiloAvatarProps) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "F";

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: colors.border,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${colors.accent}20`,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            color: colors.accent,
            fontSize: size * 0.36,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  initial: {
    fontWeight: "800",
  },
});
