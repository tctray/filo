// components/PdfAttachment.tsx
// Tappable attachment row that opens the PDF viewer

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  uri: string;
  name?: string;
  /** Show as a full card row (default) or compact inline */
  variant?: "card" | "inline";
};

export default function PdfAttachment({ uri, name, variant = "card" }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  const fileName = name ?? uri.split("/").pop() ?? "Document.pdf";

  const handleOpen = () => {
    router.push({
      pathname: "/pdf-viewer" as never,
      params: { uri, name: fileName },
    });
  };

  if (variant === "inline") {
    return (
      <TouchableOpacity
        onPress={handleOpen}
        style={styles.inline}
        activeOpacity={0.7}
      >
        <Ionicons
          name="document-text-outline"
          size={16}
          color={colors.accent}
        />
        <Text
          style={[styles.inlineText, { color: colors.accent }]}
          numberOfLines={1}
        >
          {fileName}
        </Text>
        <Ionicons name="open-outline" size={14} color={colors.accent} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handleOpen}
      activeOpacity={0.75}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: colors.accent + "18" }]}
      >
        <Ionicons name="document-text" size={22} color={colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {fileName}
        </Text>
        <Text style={[styles.sub, { color: colors.textTertiary }]}>
          Tap to view PDF
        </Text>
      </View>
      <View style={[styles.openBtn, { backgroundColor: colors.accent }]}>
        <Ionicons name="eye-outline" size={16} color={colors.accentText} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 2 },
  openBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  inlineText: { flex: 1, fontSize: 13 },
});
