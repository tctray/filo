// app/templates.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { coverLetterTemplates, resumeTemplates } from "@/constants/templates";
import { useTheme } from "@/providers/ThemeProvider";

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
      {title}
    </Text>
  );
}

function TemplateCard({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.meta, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.topTitle, { color: colors.text }]}>Templates</Text>

        <View style={styles.topBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* RESUME TEMPLATES */}
        <SectionHeader title="RESUME TEMPLATES" colors={colors} />
        {resumeTemplates.map((t) => (
          <TemplateCard
            key={t.templateId}
            icon="document-text-outline"
            iconColor={colors.accent}
            iconBg={colors.accent + "18"}
            title={t.title}
            subtitle="Tap to create a new resume"
            onPress={() =>
              router.push({
                pathname: "/resume-editor",
                params: { templateId: t.templateId },
              } as never)
            }
            colors={colors}
          />
        ))}

        <View style={{ height: 14 }} />

        {/* COVER LETTER TEMPLATES */}
        <SectionHeader title="COVER LETTER TEMPLATES" colors={colors} />
        {coverLetterTemplates.map((t) => (
          <TemplateCard
            key={t.templateId}
            icon="mail-outline"
            iconColor={colors.info ?? colors.accent}
            iconBg={(colors.info ?? colors.accent) + "18"}
            title={t.title}
            subtitle={
              t.tone === "formal"
                ? "Professional"
                : t.tone === "bold"
                  ? "Bold"
                  : "Confident"
            }
            onPress={() =>
              router.push({
                pathname: "/coverletter-editor",
                params: { templateId: t.templateId },
              } as never)
            }
            colors={colors}
          />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },
  scroll: { padding: 18, paddingTop: 14, paddingBottom: 30 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 10,
    marginTop: 6,
    marginLeft: 2,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 3 },
});
