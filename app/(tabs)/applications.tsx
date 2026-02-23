import SearchBar from "@/components/SearchBar";
import Toast from "@/components/Toast";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Application, ApplicationStatus } from "@/types";

import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Briefcase, Plus, Trash2 } from "lucide-react-native";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ALL_STATUSES: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ApplicationsScreen() {
  const { colors } = useTheme();
  const { applications, deleteApplication } = useData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(
    null,
  );
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as const,
  });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message, type: "success" });
  }, []);

  const statusColor = useCallback(
    (status: ApplicationStatus) => {
      const map: Record<ApplicationStatus, string> = {
        Saved: colors.statusSaved,
        Applied: colors.statusApplied,
        Interview: colors.statusInterview,
        Offer: colors.statusOffer,
        Rejected: colors.statusRejected,
      };
      return map[status];
    },
    [colors],
  );

  const filtered = useMemo(() => {
    let result = applications;

    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.roleTitle.toLowerCase().includes(q) ||
          (a.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [applications, statusFilter, search]);

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert("Delete Application", `Delete application for "${title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteApplication(id);
            showToast("Application deleted");
          },
        },
      ]);
    },
    [deleteApplication, showToast],
  );

  const renderItem = useCallback(
    ({ item }: { item: Application }) => (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.cardShadow,
          },
        ]}
        onPress={() =>
          router.push({
            pathname: "/application-editor" as never,
            params: { id: item.id },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: statusColor(item.status) },
            ]}
          />

          <View style={styles.cardInfo}>
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.roleTitle}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
              {item.company}
              {item.location ? ` · ${item.location}` : ""}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusColor(item.status) }]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {item.dateApplied
              ? `Applied ${formatDate(item.dateApplied)}`
              : "Not yet applied"}
          </Text>

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.dangerLight }]}
            onPress={() => handleDelete(item.id, item.roleTitle)}
            activeOpacity={0.8}
          >
            <Trash2 color={colors.danger} size={14} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.glowLine,
            { backgroundColor: statusColor(item.status) + "15" },
          ]}
        />
      </TouchableOpacity>
    ),
    [colors, router, statusColor, handleDelete],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Applications",
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.accent,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              activeOpacity={0.8}
            >
              <ArrowLeft color={colors.accent} size={22} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search company or role..."
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  statusFilter === null ? colors.accent : colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setStatusFilter(null)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    statusFilter === null
                      ? colors.accentText
                      : colors.textSecondary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {ALL_STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                { borderColor: statusColor(s), borderWidth: 1 },
                statusFilter === s && { backgroundColor: statusColor(s) },
              ]}
              onPress={() => setStatusFilter(statusFilter === s ? null : s)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === s ? "#fff" : statusColor(s) },
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.warningLight },
                ]}
              >
                <Briefcase color={colors.warning} size={36} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {search || statusFilter
                  ? "No results found"
                  : "No applications"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {statusFilter
                  ? `No ${statusFilter.toLowerCase()} applications`
                  : "Track your job applications here"}
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/application-editor" as never)}
          activeOpacity={0.85}
          testID="add-application"
        >
          <Plus color={colors.accentText} size={24} />
        </TouchableOpacity>

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: { fontSize: 12, fontWeight: "500" as const },

  list: { padding: 20, paddingTop: 0, paddingBottom: 120 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600" as const },
  cardMeta: { fontSize: 12, marginTop: 2 },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "600" as const },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { fontSize: 12 },

  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  glowLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    marginHorizontal: -16,
    marginBottom: -16,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 7,
  },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const, marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
