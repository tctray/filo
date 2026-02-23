import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  FileText,
  Info,
  LogOut,
  Moon,
  Shield,
  Sun,
  User,
} from "lucide-react-native";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { resumes, coverLetters, applications } = useData();
  const router = useRouter();

  const isDark = mode === "dark";

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/login" as never);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ── */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.avatarRing, { borderColor: colors.accent + "40" }]}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.accentLight }]}
            >
              <User color={colors.accent} size={26} />
            </View>
          </View>

          <View style={styles.profileMeta}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.name ?? "Your Name"}
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
            >
              {user?.email ?? "your@email.com"}
            </Text>
          </View>

          {/* Stats strip */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <StatPill
              value={resumes.length}
              label="Resumes"
              color={colors.accent}
            />
            <View
              style={[styles.statsDivider, { backgroundColor: colors.border }]}
            />
            <StatPill
              value={coverLetters.length}
              label="Letters"
              color={colors.info}
            />
            <View
              style={[styles.statsDivider, { backgroundColor: colors.border }]}
            />
            <StatPill
              value={applications.length}
              label="Apps"
              color={colors.warning}
            />
          </View>
        </View>

        {/* ── Preferences ── */}
        <SectionLabel label="Preferences" colors={colors} />
        <View
          style={[
            styles.group,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed },
                ]}
              >
                {isDark ? (
                  <Moon color={colors.textSecondary} size={17} />
                ) : (
                  <Sun color={colors.textSecondary} size={17} />
                )}
              </View>
              <Text style={[styles.rowText, { color: colors.text }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={colors.border}
              pointerEvents={Platform.OS === "android" ? "none" : "auto"}
            />
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        <SectionLabel label="Content" colors={colors} />
        <View
          style={[
            styles.group,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/templates" as never)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed },
                ]}
              >
                <FileText color={colors.textSecondary} size={17} />
              </View>
              <Text style={[styles.rowText, { color: colors.text }]}>
                Templates
              </Text>
            </View>
            <ChevronRight color={colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <SectionLabel label="About" colors={colors} />
        <View
          style={[
            styles.group,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed },
                ]}
              >
                <Info color={colors.textSecondary} size={17} />
              </View>
              <Text style={[styles.rowText, { color: colors.text }]}>
                Version
              </Text>
            </View>
            <View
              style={[
                styles.versionBadge,
                {
                  backgroundColor: colors.surfacePressed,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.versionText, { color: colors.textSecondary }]}
              >
                1.0.0
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed },
                ]}
              >
                <Shield color={colors.textSecondary} size={17} />
              </View>
              <View>
                <Text style={[styles.rowText, { color: colors.text }]}>
                  Data Privacy
                </Text>
                <Text
                  style={[styles.rowSubtext, { color: colors.textTertiary }]}
                >
                  Stored locally on your device
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: colors.dangerLight,
              borderColor: colors.danger + "40",
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut color={colors.danger} size={18} />
          <Text style={[styles.signOutText, { color: colors.danger }]}>
            Sign Out
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },

  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
    overflow: "hidden",
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    margin: 16,
    marginBottom: 0,
    alignSelf: "flex-start",
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMeta: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  profileName: { fontSize: 18, fontWeight: "800" },
  profileEmail: { fontSize: 13, marginTop: 2 },

  statsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statPill: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
    fontWeight: "500",
  },
  statsDivider: { width: StyleSheet.hairlineWidth, marginVertical: 10 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },

  group: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { fontSize: 15, fontWeight: "500" },
  rowSubtext: { fontSize: 12, marginTop: 1 },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  versionText: { fontSize: 12, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
  bottomPad: { height: 40 },
});
