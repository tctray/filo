// app/(tabs)/applications.tsx
import SearchBar from "@/components/SearchBar";
import Toast from "@/components/Toast";
import { useJobSearch } from "@/hooks/useMuseSearch";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { MuseJob } from "@/services/museApi";
import type { Application, ApplicationStatus } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Briefcase,
  ExternalLink,
  Eye,
  Plus,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const ALL_STATUSES: ApplicationStatus[] = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
];

const CHIP_LABELS: Record<ApplicationStatus, string> = {
  Saved: "Saved",
  Applied: "Applied",
  Interview: "Intv",
  Offer: "Offer",
  Rejected: "Reject",
};

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Hybrid doc URL resolver for applications.
 * Update these keys to match your real Application shape.
 */
function getAppDocUrls(item: any) {
  const pdfUrl =
    item?.pdfUrl ||
    item?.previewPdfUrl ||
    item?.pdf ||
    item?.attachments?.pdfUrl ||
    item?.resumePdfUrl ||
    "";

  const rtfUrl =
    item?.rtfUrl ||
    item?.fileUrl ||
    item?.rtf ||
    item?.attachments?.rtfUrl ||
    item?.resumeRtfUrl ||
    "";

  return { pdfUrl, rtfUrl };
}

// Muse Dropdown rendered as Modal to escape z-index issues
function MuseSearchModal({
  visible,
  query,
  colors,
  onSelect,
  onClose,
}: {
  visible: boolean;
  query: string;
  colors: any;
  onSelect: (job: MuseJob) => void;
  onClose: () => void;
}) {
  const { jobs, loading, error } = useJobSearch(query);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.dropdownHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.dropdownLabel, { color: colors.textTertiary }]}
                >
                  {loading
                    ? "Searching The Muse…"
                    : error
                      ? "Error loading results"
                      : jobs.length > 0
                        ? `${jobs.length} jobs found`
                        : "No jobs found"}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : error ? (
                <View style={styles.dropdownLoading}>
                  <Text style={{ color: colors.danger, fontSize: 13 }}>
                    Couldn't load results
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={jobs}
                  keyExtractor={(item) => String(item.id)}
                  style={{ maxHeight: 320 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const level = item.levels?.[0]?.name ?? "";
                    const location = item.locations?.[0]?.name ?? "";
                    return (
                      <TouchableOpacity
                        style={[
                          styles.suggestionRow,
                          { borderBottomColor: colors.border },
                        ]}
                        onPress={() => onSelect(item)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.suggestionAvatar,
                            { backgroundColor: colors.accent + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.suggestionAvatarText,
                              { color: colors.accent },
                            ]}
                          >
                            {item.company.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.suggestionInfo}>
                          <Text
                            style={[
                              styles.suggestionRole,
                              { color: colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.suggestionCompany,
                              { color: colors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {item.company.name}
                            {location ? ` · ${location}` : ""}
                          </Text>
                        </View>

                        {level ? (
                          <View
                            style={[
                              styles.suggestionLevel,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.suggestionLevelText,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {level.replace(" Level", "")}
                            </Text>
                          </View>
                        ) : null}

                        <ExternalLink
                          size={14}
                          color={colors.textTertiary}
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// List Card
function ListCard({
  item,
  colors,
  statusColor,
  onPress,
  onView,
  onEdit,
  onDelete,
}: {
  item: Application;
  colors: any;
  statusColor: (s: ApplicationStatus) => string;
  onPress: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
      onPress={onPress}
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
            { backgroundColor: colors.surfacePressed ?? colors.border },
          ]}
        >
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
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
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Trash2 color={colors.danger} size={14} />
        </TouchableOpacity>
      </View>

      <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            {
              backgroundColor: colors.accent + "15",
              borderColor: colors.accent + "30",
            },
          ]}
          onPress={onView}
        >
          <Eye color={colors.accent} size={14} />
          <Text style={[styles.actionBtnText, { color: colors.accent }]}>
            View
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={onEdit}
        >
          <Briefcase color={colors.textSecondary} size={14} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.glowLine,
          { backgroundColor: statusColor(item.status) + "15" },
        ]}
      />
    </TouchableOpacity>
  );
}

// Grid Card
function GridCard({
  item,
  colors,
  statusColor,
  onPress,
  onView,
  onEdit,
  onDelete,
}: {
  item: Application;
  colors: any;
  statusColor: (s: ApplicationStatus) => string;
  onPress: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.gridCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.gridTop}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: statusColor(item.status) },
          ]}
        />
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: colors.surfacePressed ?? colors.border,
              flex: 1,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {item.status}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          style={[
            styles.gridDeleteBtn,
            { backgroundColor: colors.dangerLight },
          ]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Trash2 color={colors.danger} size={12} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.gridInitialWrap,
          { backgroundColor: colors.accent + "18" },
        ]}
      >
        <Text style={[styles.gridInitial, { color: colors.accent }]}>
          {item.company.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text
        style={[styles.gridCompany, { color: colors.text }]}
        numberOfLines={1}
      >
        {item.company}
      </Text>
      <Text
        style={[styles.gridRole, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {item.roleTitle}
      </Text>

      {item.location ? (
        <Text
          style={[styles.gridLocation, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {item.location}
        </Text>
      ) : null}

      <Text style={[styles.gridDate, { color: colors.textTertiary }]}>
        {item.dateApplied
          ? `Applied ${formatDate(item.dateApplied)}`
          : "Not applied yet"}
      </Text>

      <View style={[styles.gridActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.gridActionBtn,
            {
              backgroundColor: colors.accent + "15",
              borderColor: colors.accent + "30",
            },
          ]}
          onPress={onView}
        >
          <Eye color={colors.accent} size={12} />
          <Text style={[styles.gridActionText, { color: colors.accent }]}>
            View
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.gridActionBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={onEdit}
        >
          <Briefcase color={colors.textSecondary} size={12} />
          <Text
            style={[styles.gridActionText, { color: colors.textSecondary }]}
          >
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// Main Screen
export default function ApplicationsScreen() {
  const { colors } = useTheme();
  const { applications, deleteApplication } = useData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
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
    if (statusFilter) result = result.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.roleTitle.toLowerCase().includes(q),
      );
    }
    return result;
  }, [applications, statusFilter, search]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    setShowDropdown(text.trim().length >= 3);
  }, []);

  const handleMuseJobSelect = useCallback(
    (job: MuseJob) => {
      Keyboard.dismiss();
      setShowDropdown(false);
      setSearch("");
      router.push({
        pathname: "/application-editor" as never,
        params: {
          prefill_company: job.company.name,
          prefill_role: job.name,
          prefill_location: job.locations?.[0]?.name ?? "",
          prefill_job_url: job.refs?.landing_page ?? "",
          prefill_level: job.levels?.[0]?.name ?? "",
          prefill_job_description: job.contents ?? "",
        },
      });
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert("Delete Application", `Delete "${title}"?`, [
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

  // Hybrid view:
  // - If app has pdf/rtf -> document-viewer
  // - else -> application-viewer
  const goToView = useCallback(
    (item: Application) => {
      const { pdfUrl, rtfUrl } = getAppDocUrls(item);

      if (pdfUrl || rtfUrl) {
        router.push({
          pathname: "/document-viewer",
          params: {
            title: `${item.company} — ${item.roleTitle}`,
            pdfUrl: pdfUrl ?? "",
            rtfUrl: rtfUrl ?? "",
          },
        } as never);
        return;
      }

      router.push({
        pathname: "/application-viewer" as never,
        params: { id: item.id },
      } as never);
    },
    [router],
  );

  const goToEdit = useCallback(
    (id: string) => {
      router.push({ pathname: "/application-editor" as never, params: { id } });
    },
    [router],
  );

  const EmptyState = (
    <View style={styles.empty}>
      <View
        style={[styles.emptyIcon, { backgroundColor: colors.warningLight }]}
      >
        <Briefcase color={colors.warning} size={36} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {search || statusFilter ? "No results found" : "No applications"}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {statusFilter
          ? `No ${statusFilter.toLowerCase()} applications`
          : "Search a company above or tap + to add manually"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Applications
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
                  viewMode === "list" ? colors.accentText : colors.textSecondary
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
                  viewMode === "grid" ? colors.accentText : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Search company name…"
        />
      </View>

      {/* Always mounted so the debounce hook isn't reset on each keystroke */}
      <MuseSearchModal
        visible={showDropdown}
        query={showDropdown ? search : ""}
        colors={colors}
        onSelect={handleMuseJobSelect}
        onClose={() => setShowDropdown(false)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
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
            All ({applications.length})
          </Text>
        </TouchableOpacity>

        {ALL_STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  statusFilter === s ? colors.accent : colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === s ? null : s)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    statusFilter === s
                      ? colors.accentText
                      : colors.textSecondary,
                },
              ]}
            >
              {CHIP_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {viewMode === "list" ? (
        <FlatList
          key="list"
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
          renderItem={({ item }) => (
            <ListCard
              item={item}
              colors={colors}
              statusColor={statusColor}
              onPress={() => goToView(item)} // 👈 hybrid on tap
              onView={() => goToView(item)} // 👈 hybrid on View button
              onEdit={() => goToEdit(item.id)}
              onDelete={() => handleDelete(item.id, item.roleTitle)}
            />
          )}
        />
      ) : (
        <FlatList
          key="grid"
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
          renderItem={({ item }) => (
            <GridCard
              item={item}
              colors={colors}
              statusColor={statusColor}
              onPress={() => goToView(item)} // 👈 hybrid on tap
              onView={() => goToView(item)} // 👈 hybrid on View button
              onEdit={() => goToEdit(item.id)}
              onDelete={() => handleDelete(item.id, item.roleTitle)}
            />
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => router.push("/application-editor" as never)}
        activeOpacity={0.85}
      >
        <Plus color={colors.accentText} size={24} />
      </TouchableOpacity>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
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
  searchWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: "500" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    paddingTop: 155,
  },
  modalBox: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownLabel: { fontSize: 11, fontWeight: "500", letterSpacing: 0.3 },
  dropdownLoading: { paddingVertical: 20, alignItems: "center" },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  suggestionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionAvatarText: { fontSize: 15, fontWeight: "700" },
  suggestionInfo: { flex: 1 },
  suggestionRole: { fontSize: 13, fontWeight: "600" },
  suggestionCompany: { fontSize: 11, marginTop: 2 },
  suggestionLevel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionLevelText: { fontSize: 10, fontWeight: "500" },

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
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
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
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  glowLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    marginHorizontal: -16,
    marginBottom: -16,
  },

  gridList: { paddingHorizontal: 14, paddingBottom: 120 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    minHeight: 200,
    overflow: "hidden",
  },
  gridTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  gridDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gridInitialWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  gridInitial: { fontSize: 18, fontWeight: "800" },
  gridCompany: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  gridRole: { fontSize: 11, lineHeight: 15, marginBottom: 4 },
  gridLocation: { fontSize: 10, marginBottom: 4 },
  gridDate: { fontSize: 10, marginBottom: 8 },
  gridActions: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: "auto" as any,
  },
  gridActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  gridActionText: { fontSize: 11, fontWeight: "600" },

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
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
