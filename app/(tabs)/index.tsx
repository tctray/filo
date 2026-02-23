import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function StatCard({
  icon,
  iconColor,
  value,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: number;
  label: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

function PillButton({
  icon,
  label,
  variant = "ghost",
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant?: "primary" | "ghost";
  onPress?: () => void;
  colors: any;
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: isPrimary ? colors.accent : colors.surface,
          borderColor: isPrimary ? "rgba(255,255,255,0.15)" : colors.border,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isPrimary ? colors.accentText : colors.accent}
      />
      <Text
        style={[
          styles.pillText,
          { color: isPrimary ? colors.accentText : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const { resumes, coverLetters, applications } = useData();
  const router = useRouter();

  // Active = any application not Rejected
  const activeCount = applications.filter(
    (a) => a.status !== "Rejected",
  ).length;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.welcomeSmall, { color: colors.textSecondary }]}>
            Welcome back
          </Text>
          <Text style={[styles.welcomeBig, { color: colors.text }]}>User</Text>
        </View>

        {/* ✅ Live stat counts */}
        <View style={styles.statRow}>
          <StatCard
            icon="document-text-outline"
            iconColor={colors.accent}
            value={resumes.length}
            label="Resumes"
            colors={colors}
          />
          <StatCard
            icon="mail-outline"
            iconColor={colors.info}
            value={coverLetters.length}
            label="Letters"
            colors={colors}
          />
          <StatCard
            icon="briefcase-outline"
            iconColor={colors.warning}
            value={applications.length}
            label="Apps"
            colors={colors}
          />
          <StatCard
            icon="time-outline"
            iconColor={colors.success}
            value={activeCount}
            label="Active"
            colors={colors}
          />
        </View>

        {/* ✅ Wired buttons */}
        <View style={styles.pillRow}>
          <PillButton
            icon="add"
            label="New Resume"
            variant="primary"
            onPress={() => router.push("/resume-editor" as never)}
            colors={colors}
          />
          <PillButton
            icon="add"
            label="New Letter"
            variant="ghost"
            onPress={() => router.push("/coverletter-editor" as never)}
            colors={colors}
          />
          <PillButton
            icon="document-outline"
            label="Templates"
            variant="ghost"
            onPress={() => router.push("/templates" as never)}
            colors={colors}
          />
        </View>

        {/* Empty state — only show when nothing exists yet */}
        {resumes.length === 0 &&
          coverLetters.length === 0 &&
          applications.length === 0 && (
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: colors.accentLight,
                    borderColor: colors.accent + "40",
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Get started
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Create your first resume or browse templates to{"\n"}kickstart
                your job search
              </Text>
            </View>
          )}

        {/* Recent activity — shows once data exists */}
        {(resumes.length > 0 ||
          coverLetters.length > 0 ||
          applications.length > 0) && (
          <View style={styles.recentSection}>
            <Text style={[styles.recentTitle, { color: colors.textSecondary }]}>
              Recent
            </Text>

            {resumes.slice(0, 2).map((r) => (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push({
                    pathname: "/resume-editor",
                    params: { id: r.id },
                  } as never)
                }
                style={({ pressed }) => [
                  styles.recentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View
                  style={[
                    styles.recentIconWrap,
                    { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.recentInfo}>
                  <Text
                    style={[styles.recentName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {(r as any).title ?? "Untitled Resume"}
                  </Text>
                  <Text
                    style={[styles.recentMeta, { color: colors.textTertiary }]}
                  >
                    Resume
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </Pressable>
            ))}

            {coverLetters.slice(0, 2).map((cl) => (
              <Pressable
                key={cl.id}
                onPress={() =>
                  router.push({
                    pathname: "/cover-letter-editor",
                    params: { id: cl.id },
                  } as never)
                }
                style={({ pressed }) => [
                  styles.recentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View
                  style={[
                    styles.recentIconWrap,
                    { backgroundColor: colors.info + "20" },
                  ]}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.info} />
                </View>
                <View style={styles.recentInfo}>
                  <Text
                    style={[styles.recentName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {cl.title ?? "Untitled Cover Letter"}
                  </Text>
                  <Text
                    style={[styles.recentMeta, { color: colors.textTertiary }]}
                  >
                    Cover Letter
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </Pressable>
            ))}

            {applications.slice(0, 2).map((a) => (
              <Pressable
                key={a.id}
                onPress={() =>
                  router.push({
                    pathname: "/application-editor",
                    params: { id: a.id },
                  } as never)
                }
                style={({ pressed }) => [
                  styles.recentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View
                  style={[
                    styles.recentIconWrap,
                    { backgroundColor: colors.warning + "20" },
                  ]}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={18}
                    color={colors.warning}
                  />
                </View>
                <View style={styles.recentInfo}>
                  <Text
                    style={[styles.recentName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {a.company} — {a.roleTitle}
                  </Text>
                  <Text
                    style={[styles.recentMeta, { color: colors.textTertiary }]}
                  >
                    {a.status}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },

  header: { marginBottom: 14 },
  welcomeSmall: { fontSize: 16, fontWeight: "600" },
  welcomeBig: { fontSize: 34, fontWeight: "800", marginTop: 2 },

  statRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 6 },

  pillRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  pill: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pillText: { fontWeight: "700", fontSize: 12 },

  emptyWrap: {
    marginTop: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  emptySub: {
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
    fontSize: 14,
  },

  recentSection: { marginTop: 28 },
  recentTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 2,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 14, fontWeight: "600" },
  recentMeta: { fontSize: 12, marginTop: 2 },
});
