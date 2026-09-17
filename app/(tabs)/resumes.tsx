// app/(tabs)/resumes.tsx
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── List Card ──
function ListCard({
  item,
  colors,
  onPress,
  onDelete,
}: {
  item: any;
  colors: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.listCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.listIconWrap, { backgroundColor: colors.accent + "18" }]}
      >
        <Ionicons
          name="document-text-outline"
          size={20}
          color={colors.accent}
        />
      </View>

      <View style={styles.listInfo}>
        <Text
          style={[styles.listTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title ?? "Untitled Resume"}
        </Text>
        <Text style={[styles.listMeta, { color: colors.textTertiary }]}>
          {item.fullName ? `${item.fullName} · ` : ""}
          {formatDate(item.updatedAt)}
        </Text>
      </View>

      <View style={styles.listActions}>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={8}
          style={[
            styles.listIconBtn,
            { backgroundColor: "#EF444415", borderColor: "#EF444430" },
          ]}
        >
          <Ionicons name="trash-outline" size={15} color="#EF4444" />
        </TouchableOpacity>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );
}

// ── Grid Card ──
function GridCard({
  item,
  colors,
  onPress,
  onDelete,
}: {
  item: any;
  colors: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.gridCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.gridTop}>
        <View
          style={[
            styles.gridInitialWrap,
            { backgroundColor: colors.accent + "18" },
          ]}
        >
          <Text style={[styles.gridInitial, { color: colors.accent }]}>
            {initials(item.title ?? "R")}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={8}
          style={[styles.gridIconBtn, { backgroundColor: "#EF444415" }]}
        >
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <Text
        style={[styles.gridTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {item.title ?? "Untitled Resume"}
      </Text>

      {item.fullName ? (
        <Text
          style={[styles.gridSub, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.fullName}
        </Text>
      ) : null}

      <Text style={[styles.gridDate, { color: colors.textTertiary }]}>
        {formatDate(item.updatedAt)}
      </Text>

      {item.skills?.length > 0 && (
        <View style={[styles.gridSkillRow, { borderTopColor: colors.border }]}>
          <Text
            style={[styles.gridSkillText, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {item.skills.slice(0, 3).join(" · ")}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ResumesTab() {
  const { colors, mode } = useTheme();
  const { resumes, deleteResume } = useData();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const sorted = useMemo(
    () =>
      [...(resumes ?? [])].sort(
        (a, b) =>
          new Date(b.updatedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? 0).getTime(),
      ),
    [resumes],
  );

  const handleDelete = (item: any) => {
    Alert.alert(
      "Delete Resume?",
      `"${item.title ?? "Untitled"}" will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await (deleteResume as any)(item.id);
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message);
            }
          },
        },
      ],
    );
  };

  const goToViewer = (item: any) => {
    router.push({
      pathname: "/resume-viewer",
      params: { id: item.id },
    } as never);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Resumes
        </Text>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.toggleWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setViewMode("list")}
              style={[
                styles.toggleBtn,
                viewMode === "list" && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={
                  viewMode === "list"
                    ? (colors.accentText ?? "#fff")
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode("grid")}
              style={[
                styles.toggleBtn,
                viewMode === "grid" && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={
                  viewMode === "grid"
                    ? (colors.accentText ?? "#fff")
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/resume-editor" as never)}
            style={[styles.newBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={18}
              color={colors.accentText ?? "#fff"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No resumes yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
            Tap + to create your first resume
          </Text>
        </View>
      ) : viewMode === "list" ? (
        <FlatList
          key="list"
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListCard
              item={item}
              colors={colors}
              onPress={() => goToViewer(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="grid"
          data={sorted}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <GridCard
              item={item}
              colors={colors}
              onPress={() => goToViewer(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleWrap: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: { padding: 18, gap: 10 },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  listIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: "700" },
  listMeta: { fontSize: 12, marginTop: 2 },
  listActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  listIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContainer: { padding: 18, paddingBottom: 40 },
  gridRow: { gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14 },
  gridTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  gridInitialWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gridInitial: { fontSize: 16, fontWeight: "800" },
  gridIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gridTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  gridSub: { fontSize: 12, marginBottom: 4 },
  gridDate: { fontSize: 11, marginBottom: 8 },
  gridSkillRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  gridSkillText: { fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptySub: { fontSize: 14 },
});
