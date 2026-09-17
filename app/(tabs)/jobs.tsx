// app/(tabs)/jobs.tsx
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Job } from "@/types";
import { formatDisplayDate, todayYMD } from "@/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_ORDER: Job["status"][] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];

const STATUS_LABELS: Record<Job["status"], string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

function useStatusColors(
  colors: any,
): Record<Job["status"], { bg: string; text: string; dot: string }> {
  return {
    saved: {
      bg: colors.surface,
      text: colors.textSecondary,
      dot: colors.textTertiary,
    },
    applied: { bg: colors.info + "22", text: colors.info, dot: colors.info },
    interview: { bg: "#A78BFA22", text: "#A78BFA", dot: "#A78BFA" },
    offer: {
      bg: colors.success + "22",
      text: colors.success,
      dot: colors.success,
    },
    rejected: {
      bg: colors.danger + "22",
      text: colors.danger,
      dot: colors.danger,
    },
  };
}

function nextDateLabel(job: Job): string | null {
  const today = todayYMD();
  const candidates: [string | undefined, string][] = [
    [job.interviewDate, "Interview"],
    [job.followUpDate, "Follow-up"],
    [job.deadline, "Deadline"],
  ];
  for (const [date, label] of candidates) {
    if (date && date >= today) return `${label}: ${formatDisplayDate(date)}`;
  }
  return null;
}

// ── Grid Card (2-column) ──
function GridCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { colors } = useTheme();
  const sc = useStatusColors(colors)[job.status];
  const dateLabel = nextDateLabel(job);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      {/* Status dot + badge */}
      <View style={styles.gridTop}>
        <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
        <View style={[styles.gridBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.gridBadgeText, { color: sc.text }]}>
            {STATUS_LABELS[job.status]}
          </Text>
        </View>
      </View>

      {/* Company initial */}
      <View
        style={[
          styles.gridInitialWrap,
          { backgroundColor: colors.accent + "18" },
        ]}
      >
        <Text style={[styles.gridInitial, { color: colors.accent }]}>
          {job.company.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <Text
        style={[styles.gridCompany, { color: colors.text }]}
        numberOfLines={1}
      >
        {job.company}
      </Text>
      <Text
        style={[styles.gridRole, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {job.roleTitle}
      </Text>
      {job.location ? (
        <Text
          style={[styles.gridLocation, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {job.location}
        </Text>
      ) : null}

      {/* Date */}
      {dateLabel ? (
        <View style={[styles.gridDateRow, { borderTopColor: colors.border }]}>
          <Ionicons
            name="calendar-outline"
            size={11}
            color={colors.textTertiary}
          />
          <Text
            style={[styles.gridDateText, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {dateLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ── List Card ──
function ListCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { colors } = useTheme();
  const sc = useStatusColors(colors)[job.status];
  const dateLabel = nextDateLabel(job);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.listAccent, { backgroundColor: sc.dot }]} />

      {/* Initial */}
      <View
        style={[
          styles.listInitialWrap,
          { backgroundColor: colors.accent + "18" },
        ]}
      >
        <Text style={[styles.listInitial, { color: colors.accent }]}>
          {job.company.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.listInfo}>
        <Text
          style={[styles.listCompany, { color: colors.text }]}
          numberOfLines={1}
        >
          {job.company}
        </Text>
        <Text
          style={[styles.listRole, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {job.roleTitle}
        </Text>
        {dateLabel ? (
          <View style={styles.listDateRow}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={colors.textTertiary}
            />
            <Text style={[styles.listDateText, { color: colors.textTertiary }]}>
              {dateLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Badge + chevron */}
      <View style={styles.listRight}>
        <View style={[styles.listBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.listBadgeText, { color: sc.text }]}>
            {STATUS_LABELS[job.status]}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={15}
          color={colors.textTertiary}
          style={{ marginTop: 6 }}
        />
      </View>
    </Pressable>
  );
}

export default function JobsScreen() {
  const { colors } = useTheme();
  const { jobs } = useData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<Job["status"] | "all">(
    "all",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        !search ||
        j.company.toLowerCase().includes(search.toLowerCase()) ||
        j.roleTitle.toLowerCase().includes(search.toLowerCase());
      const matchStatus = activeStatus === "all" || j.status === activeStatus;
      return matchSearch && matchStatus;
    });
  }, [jobs, search, activeStatus]);

  const goToJob = (id: string) =>
    router.push({ pathname: "/job/[id]", params: { id } } as never);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Jobs</Text>
        <View style={styles.headerRight}>
          {/* View toggle */}
          <View
            style={[
              styles.toggleWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
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
                  viewMode === "grid" ? colors.accentText : colors.textSecondary
                }
              />
            </TouchableOpacity>
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
                  viewMode === "list" ? colors.accentText : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
          {/* Add */}
          <TouchableOpacity
            onPress={() => router.push("/job/new" as never)}
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="add" size={22} color={colors.accentText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search jobs..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const active = activeStatus === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveStatus(s)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.accentText : colors.textSecondary },
                ]}
              >
                {s === "all" ? `All (${jobs.length})` : STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid or List */}
      {viewMode === "grid" ? (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          numColumns={2}
          key="grid"
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState colors={colors} />}
          renderItem={({ item }) => (
            <GridCard job={item} onPress={() => goToJob(item.id)} />
          )}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          key="list"
          contentContainerStyle={styles.listList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState colors={colors} />}
          renderItem={({ item }) => (
            <ListCard job={item} onPress={() => goToJob(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState({ colors }: { colors: any }) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name="briefcase-outline"
        size={40}
        color={colors.textTertiary}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No jobs yet
      </Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
        Tap + to add your first job
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: "800" },
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

  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow: { paddingHorizontal: 18, gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: "600" },

  // ── Grid ──
  gridList: { paddingHorizontal: 14, paddingBottom: 100 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    minHeight: 170,
  },
  gridTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  gridBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  gridBadgeText: { fontSize: 10, fontWeight: "700" },
  gridInitialWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gridInitial: { fontSize: 20, fontWeight: "800" },
  gridCompany: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  gridRole: { fontSize: 11, lineHeight: 15, marginBottom: 4 },
  gridLocation: { fontSize: 10, marginBottom: 4 },
  gridDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
    marginTop: "auto" as any,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gridDateText: { fontSize: 10, flex: 1 },

  // ── List ──
  listList: { paddingHorizontal: 18, paddingBottom: 100 },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  listAccent: { width: 4, alignSelf: "stretch" },
  listInitialWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 12,
  },
  listInitial: { fontSize: 18, fontWeight: "800" },
  listInfo: { flex: 1, paddingVertical: 12 },
  listCompany: { fontSize: 14, fontWeight: "700" },
  listRole: { fontSize: 12, marginTop: 2 },
  listDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  listDateText: { fontSize: 11 },
  listRight: { alignItems: "flex-end", paddingRight: 14, paddingVertical: 12 },
  listBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  listBadgeText: { fontSize: 11, fontWeight: "700" },

  // ── Empty ──
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptySub: { fontSize: 14 },
});
