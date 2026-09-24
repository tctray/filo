// app/(tabs)/index.tsx
import { FiloAvatar } from "@/components/FiloAvatar";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { confirmAction, notify } from "@/utils/notify";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Animated,
  FlatList,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Helpers ──
function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}
function formatDisplayDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const EVENT_COLOR: Record<string, string> = {
  followUp: "#60A5FA",
  interview: "#A78BFA",
  deadline: "#F59E0B",
};
const EVENT_LABEL: Record<string, string> = {
  followUp: "Follow-up",
  interview: "Interview",
  deadline: "Deadline",
};

// ── Stat card ──
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
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

type RecentKind = "resume" | "coverletter" | "application";
type RecentEntry = { kind: RecentKind; item: any; key: string };

const KIND_META: Record<
  RecentKind,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  resume: { icon: "document-text-outline", color: "#00C2A8", label: "Resume" },
  coverletter: {
    icon: "mail-outline",
    color: "#60A5FA",
    label: "Cover Letter",
  },
  application: {
    icon: "briefcase-outline",
    color: "#F59E0B",
    label: "Application",
  },
};

const ACTION_WIDTH = 70;
const SNAP_THRESHOLD = 50;
const FULL_OPEN = -(ACTION_WIDTH * 2 + 12); // edit + delete + gap

// ── Swipeable row (pure Animated + PanResponder, no GestureHandler) ──
function SwipeableRow({
  entry,
  colors,
  onPress,
  onEdit,
  onDelete,
}: {
  entry: RecentEntry;
  colors: any;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = KIND_META[entry.kind];
  const translateX = useRef(new Animated.Value(0)).current;
  const lastX = useRef(0);
  const isOpen = useRef(false);

  const snapTo = (toValue: number) => {
    lastX.current = toValue;
    isOpen.current = toValue !== 0;
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        translateX.setOffset(lastX.current);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        // Only allow swiping left (negative) or closing
        const next = Math.max(FULL_OPEN, Math.min(0, g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        const current = lastX.current + g.dx;
        if (g.dx < -SNAP_THRESHOLD || current < FULL_OPEN / 2) {
          snapTo(FULL_OPEN);
        } else {
          snapTo(0);
        }
      },
    }),
  ).current;

  const getName = () => {
    if (entry.kind === "resume" || entry.kind === "coverletter")
      return entry.item.title ?? "Untitled";
    return `${entry.item.company ?? ""} — ${entry.item.roleTitle ?? ""}`;
  };
  const getSub = () =>
    entry.kind === "application" ? (entry.item.status ?? "") : meta.label;

  // Action button opacity — fade in as row slides
  const actionsOpacity = translateX.interpolate({
    inputRange: [FULL_OPEN, FULL_OPEN / 2, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Action buttons sit at right, card slides over them */}
      <Animated.View style={[styles.actionsWrap, { opacity: actionsOpacity }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            snapTo(0);
            onEdit();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
          onPress={() => {
            snapTo(0);
            onDelete();
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* The card itself */}
      <Animated.View
        style={{ transform: [{ translateX }], zIndex: 1 }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => {
            if (isOpen.current) {
              snapTo(0);
              return;
            }
            onPress();
          }}
          activeOpacity={0.75}
          style={[
            styles.recentCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.recentIconWrap,
              { backgroundColor: meta.color + "20" },
            ]}
          >
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={styles.recentInfo}>
            <Text
              style={[styles.recentName, { color: colors.text }]}
              numberOfLines={1}
            >
              {getName()}
            </Text>
            <Text style={[styles.recentMeta, { color: colors.textTertiary }]}>
              {getSub()}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const { user } = useAuth() as any;
  const {
    resumes,
    coverLetters,
    applications,
    deleteResume,
    deleteCoverLetter,
    deleteApplication,
  } = useData();
  const router = useRouter();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState<string>("");
  const clearKey = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem("filo:profile")
      .then((raw) => {
        if (raw) {
          const p = JSON.parse(raw);
          setFirstName(p.firstName ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const interviewCount = useMemo(
    () => (applications ?? []).filter((a) => a.status === "Interview").length,
    [applications],
  );

  const upcomingEvents = useMemo(() => {
    const today = todayYMD();
    const events: {
      date: string;
      type: string;
      company: string;
      roleTitle: string;
      appId: string;
    }[] = [];
    for (const app of applications ?? []) {
      const a = app as any;
      for (const c of [
        { date: a.followUpDate, type: "followUp" },
        { date: a.interviewDate, type: "interview" },
        { date: a.deadline, type: "deadline" },
      ]) {
        if (c.date && c.date >= today)
          events.push({
            date: c.date,
            type: c.type,
            company: app.company,
            roleTitle: app.roleTitle,
            appId: app.id,
          });
      }
    }
    return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [applications]);

  const displayFirstName = useMemo(() => {
    if (firstName) return firstName;
    const metaName = user?.name || user?.user_metadata?.name;
    if (metaName) return metaName.split(" ")[0];
    return "";
  }, [firstName, user]);

  const allRecent = useMemo<RecentEntry[]>(() => {
    const entries: RecentEntry[] = [
      ...(resumes ?? []).map((item) => ({
        kind: "resume" as RecentKind,
        item,
        key: `resume-${item.id}`,
      })),
      ...(coverLetters ?? []).map((item) => ({
        kind: "coverletter" as RecentKind,
        item,
        key: `cl-${item.id}`,
      })),
      ...(applications ?? []).map((item) => ({
        kind: "application" as RecentKind,
        item,
        key: `app-${item.id}`,
      })),
    ];
    return entries
      .sort(
        (a, b) =>
          new Date(b.item.updatedAt ?? 0).getTime() -
          new Date(a.item.updatedAt ?? 0).getTime(),
      )
      .slice(0, 8);
  }, [resumes, coverLetters, applications]);

  const recentItems = useMemo(
    () => allRecent.filter((e) => !dismissed.has(e.key)),
    [allRecent, dismissed],
  );

  const confirmClear = () => {
    if (recentItems.length === 0) return;
    confirmAction(
      "Clear Recent?",
      "This hides items from the recent list. Your data won't be deleted.",
      () => {
        clearKey.current += 1;
        setDismissed(new Set(allRecent.map((e) => e.key)));
      },
      "Clear",
    );
  };

  const onPressRecent = useCallback(
    (entry: RecentEntry) => {
      if (entry.kind === "resume")
        router.push({
          pathname: "/resume-editor",
          params: { id: entry.item.id },
        } as never);
      if (entry.kind === "coverletter")
        router.push({
          pathname: "/coverletter-editor",
          params: { id: entry.item.id },
        } as never);
      if (entry.kind === "application")
        router.push({
          pathname: "/application-editor",
          params: { id: entry.item.id },
        } as never);
    },
    [router],
  );

  const onDeleteRecent = useCallback(
    (entry: RecentEntry) => {
      const { kind, item } = entry;
      const name =
        kind === "application"
          ? `${item.company} — ${item.roleTitle}`
          : (item.title ?? "this item");
      confirmAction(
        `Delete ${KIND_META[kind].label}?`,
        `"${name}" will be permanently deleted.`,
        async () => {
          try {
            if (kind === "resume") await (deleteResume as any)(item.id);
            if (kind === "coverletter")
              await (deleteCoverLetter as any)(item.id);
            if (kind === "application")
              await (deleteApplication as any)(item.id);
          } catch (e: any) {
            notify("Delete failed", e?.message ?? "Could not delete.");
          }
        },
      );
    },
    [deleteResume, deleteCoverLetter, deleteApplication],
  );

  type Row =
    | { type: "header" }
    | { type: "calendar_section" }
    | { type: "recent_header" }
    | { type: "recent_empty" }
    | { type: "recent_item"; entry: RecentEntry }
    | { type: "footer" };

  const listData = useMemo<Row[]>(
    () => [
      { type: "header" },
      { type: "calendar_section" },
      { type: "recent_header" },
      ...(recentItems.length === 0
        ? [{ type: "recent_empty" } as Row]
        : recentItems.map((entry) => ({ type: "recent_item", entry }) as Row)),
      { type: "footer" },
    ],
    [recentItems],
  );

  const renderItem = ({ item }: { item: Row }) => {
    switch (item.type) {
      case "header":
        return (
          <View style={styles.headerBlock}>
            <View style={styles.welcomeRow}>
              <View>
                <Text
                  style={[styles.welcomeSmall, { color: colors.textSecondary }]}
                >
                  {displayFirstName
                    ? `Welcome back, ${displayFirstName}`
                    : "Welcome back"}
                </Text>
                <Text style={[styles.welcomeBig, { color: colors.text }]}>
                  Filo
                </Text>
              </View>
              <FiloAvatar
                colors={colors}
                size={54}
                imageUri={user?.avatar_url ?? undefined}
              />
            </View>
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
                iconColor="#60A5FA"
                value={coverLetters.length}
                label="Letters"
                colors={colors}
              />
              <StatCard
                icon="briefcase-outline"
                iconColor="#F59E0B"
                value={applications.length}
                label="Applied"
                colors={colors}
              />
              <StatCard
                icon="mic-outline"
                iconColor="#A78BFA"
                value={interviewCount}
                label="Interviews"
                colors={colors}
              />
            </View>
            <View style={styles.pillRow}>
              <TouchableOpacity
                onPress={() => router.push("/resume-editor" as never)}
                style={[styles.pill, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={colors.accentText ?? "#fff"}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: colors.accentText ?? "#fff" },
                  ]}
                >
                  Resume
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/coverletter-editor" as never)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.accent} />
                <Text style={[styles.pillText, { color: colors.text }]}>
                  Letter
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/application-editor" as never)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.accent} />
                <Text style={[styles.pillText, { color: colors.text }]}>
                  Application
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case "calendar_section":
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/calendar" as never)}
            style={styles.calendarTapWrap}
          >
            <View style={styles.calendarSection}>
              <View style={styles.calendarHeader}>
                <Text
                  style={[styles.sectionLabel, { color: colors.textTertiary }]}
                >
                  UPCOMING
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Calendar
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.accent}
                  />
                </View>
              </View>
              {upcomingEvents.length === 0 ? (
                <View
                  style={[
                    styles.calendarEmpty,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.calendarEmptyText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    No upcoming events
                  </Text>
                </View>
              ) : (
                upcomingEvents.map((e, i) => (
                  <TouchableOpacity
                    key={`${e.appId}-${e.type}-${i}`}
                    onPress={() =>
                      router.push({
                        pathname: "/application-editor",
                        params: { id: e.appId },
                      } as never)
                    }
                    activeOpacity={0.75}
                    style={[
                      styles.eventRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.eventDot,
                        { backgroundColor: EVENT_COLOR[e.type] },
                      ]}
                    />
                    <View style={styles.eventInfo}>
                      <Text
                        style={[styles.eventCompany, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {e.company}
                      </Text>
                      <Text
                        style={[
                          styles.eventRole,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {e.roleTitle}
                      </Text>
                    </View>
                    <View style={styles.eventRight}>
                      <Text
                        style={[
                          styles.eventType,
                          { color: EVENT_COLOR[e.type] },
                        ]}
                      >
                        {EVENT_LABEL[e.type]}
                      </Text>
                      <Text
                        style={[
                          styles.eventDate,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {formatDisplayDate(e.date)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </TouchableOpacity>
        );

      case "recent_header":
        return (
          <View style={styles.recentHeaderRow}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              RECENT
            </Text>
            {recentItems.length > 0 && (
              <TouchableOpacity
                onPress={confirmClear}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={{
                    color: colors.danger ?? "#F87171",
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case "recent_empty":
        return (
          <Text style={[styles.emptyRecent, { color: colors.textTertiary }]}>
            Create a resume, cover letter, or application to see it here.
          </Text>
        );

      case "recent_item":
        return (
          <SwipeableRow
            entry={item.entry}
            colors={colors}
            onPress={() => onPressRecent(item.entry)}
            onEdit={() => onPressRecent(item.entry)}
            onDelete={() => onDeleteRecent(item.entry)}
          />
        );

      case "footer":
        return <View style={{ height: 40 }} />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
      />
      <FlatList
        data={listData}
        keyExtractor={(item, i) =>
          item.type === "recent_item" ? item.entry.key : `${item.type}-${i}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },

  headerBlock: { marginBottom: 16 },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  welcomeSmall: { fontSize: 16, fontWeight: "600" },
  welcomeBig: { fontSize: 34, fontWeight: "800", marginTop: 2 },

  statRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  statLabel: { fontSize: 11, marginTop: 4 },

  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontWeight: "700", fontSize: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  calendarTapWrap: { borderRadius: 16 },
  calendarSection: { marginBottom: 20 },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calendarEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  calendarEmptyText: { fontSize: 13 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventInfo: { flex: 1 },
  eventCompany: { fontSize: 13, fontWeight: "600" },
  eventRole: { fontSize: 11, marginTop: 1 },
  eventRight: { alignItems: "flex-end" },
  eventType: { fontSize: 11, fontWeight: "700" },
  eventDate: { fontSize: 11, marginTop: 2 },

  recentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyRecent: { fontSize: 13, marginBottom: 12 },

  // Swipeable row
  swipeContainer: { marginBottom: 10 },
  actionsWrap: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    zIndex: 0,
  },
  actionBtn: {
    width: ACTION_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // zIndex keeps card on top of action buttons so it slides over them
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    zIndex: 1,
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
