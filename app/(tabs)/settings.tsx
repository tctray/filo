// app/(tabs)/settings.tsx
import { FiloAvatar } from "@/components/FiloAvatar";
import {
  saveAvatarUrlToProfile,
  uploadAvatarForCurrentUser,
} from "@/lib/avatarUpload";
import { useAuth } from "@/providers/AuthProvider";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Bell,
  BellOff,
  BookMarked,
  ChevronRight,
  FileText,
  Info,
  LogOut,
  Moon,
  Shield,
  Sun,
  Trash2,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.manifest?.version ?? "1.0.0";

type LocalProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export default function SettingsScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout, refreshProfile } = useAuth() as any;
  const {
    resumes,
    coverLetters,
    jobs,
    applications,
    remindersEnabled,
    setRemindersEnabled,
    clearAllData,
  } = useData() as any;

  const router = useRouter();
  const isDark = mode === "dark";

  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [defaultResumeId, setDefaultResumeId] = useState<string | null>(null);
  const [resumePickerVisible, setResumePickerVisible] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("filo:profile")
      .then((raw) => {
        if (raw) setProfile(JSON.parse(raw));
      })
      .catch(() => {});

    AsyncStorage.getItem("filo:defaultResumeId")
      .then((val) => {
        if (val) setDefaultResumeId(val);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user]);

  const displayName = useMemo(() => {
    const localName = profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
      : "";

    return (
      localName ||
      user?.name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")?.[0] ||
      "Your Name"
    );
  }, [profile, user]);

  const displayEmail = useMemo(() => {
    return profile?.email || user?.email || "your@email.com";
  }, [profile, user]);

  const defaultResume = resumes?.find((r: any) => r.id === defaultResumeId);

  const handleSetDefaultResume = async (id: string) => {
    setDefaultResumeId(id);
    await AsyncStorage.setItem("filo:defaultResumeId", id);
    setResumePickerVisible(false);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } finally {
            router.replace("/login" as never);
          }
        },
      },
    ]);
  };

  const handleRemindersToggle = async () => {
    if (!remindersEnabled) {
      const { requestNotificationPermissions } =
        await import("@/utils/notifications");
      const granted = await requestNotificationPermissions();

      if (!granted) {
        Alert.alert(
          "Permissions Required",
          "Please enable notifications in your device settings to use reminders.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    await setRemindersEnabled(!remindersEnabled);
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Data?",
      "This will permanently delete all resumes, cover letters, applications, and saved jobs from this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              if (typeof clearAllData === "function") {
                await clearAllData();
              } else {
                await AsyncStorage.multiRemove([
                  "filo:resumes",
                  "filo:coverLetters",
                  "filo:applications",
                  "filo:jobs",
                  "filo:remindersEnabled",
                  "filo:profile",
                  "filo:defaultResumeId",
                ]);
              }

              await AsyncStorage.removeItem("filo:profile");
              await AsyncStorage.removeItem("filo:defaultResumeId");

              setProfile(null);
              setDefaultResumeId(null);

              Alert.alert("Done", "All local data has been cleared.");
            } catch (e: any) {
              Alert.alert(
                "Clear failed",
                e?.message ?? "Something went wrong.",
              );
            }
          },
        },
      ],
    );
  };

  const handleChangeAvatar = async () => {
    try {
      setUploadingAvatar(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow Filo to access your photos to set a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const localUri = result.assets[0].uri;

      const { publicUrl } = await uploadAvatarForCurrentUser(localUri);
      await saveAvatarUrlToProfile(publicUrl);
      await refreshProfile();

      setAvatarUrl(publicUrl);

      Alert.alert("Success", "Profile photo updated.");
    } catch (e: any) {
      Alert.alert(
        "Upload failed",
        e?.message ?? "Could not update profile photo.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.avatarRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangeAvatar}
              disabled={uploadingAvatar}
            >
              <FiloAvatar
                colors={colors}
                size={72}
                imageUri={avatarUrl ?? undefined}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.editPhotoBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={handleChangeAvatar}
              disabled={uploadingAvatar}
            >
              <Text
                style={[styles.editPhotoText, { color: colors.textSecondary }]}
              >
                {uploadingAvatar ? "Uploading..." : "Tap photo to change"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileMeta}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {displayName}
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
            >
              {displayEmail}
            </Text>
          </View>

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <StatPill
              value={resumes?.length ?? 0}
              label="Resumes"
              color={colors.accent}
            />
            <View
              style={[styles.statsDivider, { backgroundColor: colors.border }]}
            />
            <StatPill
              value={coverLetters?.length ?? 0}
              label="Letters"
              color={colors.info}
            />
            <View
              style={[styles.statsDivider, { backgroundColor: colors.border }]}
            />
            <StatPill
              value={applications?.length ?? 0}
              label="Applied"
              color={colors.warning}
            />
            <View
              style={[styles.statsDivider, { backgroundColor: colors.border }]}
            />
            <StatPill value={jobs?.length ?? 0} label="Saved" color="#a78bfa" />
          </View>
        </View>

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
                  { backgroundColor: colors.surfacePressed ?? colors.border },
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

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={handleRemindersToggle}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed ?? colors.border },
                ]}
              >
                {remindersEnabled ? (
                  <Bell color={colors.textSecondary} size={17} />
                ) : (
                  <BellOff color={colors.textSecondary} size={17} />
                )}
              </View>
              <View>
                <Text style={[styles.rowText, { color: colors.text }]}>
                  Reminders
                </Text>
                <Text
                  style={[styles.rowSubtext, { color: colors.textTertiary }]}
                >
                  {remindersEnabled
                    ? "Notifications enabled"
                    : "Notifications disabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={handleRemindersToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
              ios_backgroundColor={colors.border}
              pointerEvents={Platform.OS === "android" ? "none" : "auto"}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => setResumePickerVisible(true)}
          >
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed ?? colors.border },
                ]}
              >
                <BookMarked color={colors.textSecondary} size={17} />
              </View>
              <View>
                <Text style={[styles.rowText, { color: colors.text }]}>
                  Default Resume
                </Text>
                <Text
                  style={[styles.rowSubtext, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {defaultResume ? defaultResume.title : "None selected"}
                </Text>
              </View>
            </View>
            <ChevronRight color={colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>

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
                  { backgroundColor: colors.surfacePressed ?? colors.border },
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
                  { backgroundColor: colors.surfacePressed ?? colors.border },
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
                  backgroundColor: colors.surfacePressed ?? colors.border,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.versionText, { color: colors.textSecondary }]}
              >
                {APP_VERSION}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePressed ?? colors.border },
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
                  Profile stored in your account
                </Text>
              </View>
            </View>
          </View>
        </View>

        <SectionLabel label="Danger Zone" colors={colors} />
        <TouchableOpacity
          style={[
            styles.dangerBtn,
            {
              backgroundColor: colors.dangerLight ?? colors.danger + "22",
              borderColor: colors.danger + "40",
            },
          ]}
          onPress={handleClearAll}
          activeOpacity={0.75}
        >
          <Trash2 color={colors.danger} size={18} />
          <Text style={[styles.dangerText, { color: colors.danger }]}>
            Clear All Data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: colors.dangerLight ?? colors.danger + "22",
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

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={resumePickerVisible}
        onRequestClose={() => setResumePickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setResumePickerVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Default Resume
            </Text>
            <Text style={[styles.modalSub, { color: colors.textTertiary }]}>
              Used when applying to jobs from search
            </Text>

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.resumeOption,
                  { borderColor: colors.border },
                  !defaultResumeId && {
                    borderColor: colors.accent,
                    backgroundColor: colors.accent + "10",
                  },
                ]}
                onPress={async () => {
                  setDefaultResumeId(null);
                  await AsyncStorage.removeItem("filo:defaultResumeId");
                  setResumePickerVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.resumeOptionText,
                    { color: !defaultResumeId ? colors.accent : colors.text },
                  ]}
                >
                  None
                </Text>
                {!defaultResumeId && (
                  <ChevronRight color={colors.accent} size={16} />
                )}
              </TouchableOpacity>

              {(resumes ?? []).map((r: any) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.resumeOption,
                    { borderColor: colors.border },
                    defaultResumeId === r.id && {
                      borderColor: colors.accent,
                      backgroundColor: colors.accent + "10",
                    },
                  ]}
                  onPress={() => handleSetDefaultResume(r.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.resumeOptionText,
                        {
                          color:
                            defaultResumeId === r.id
                              ? colors.accent
                              : colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {r.title ?? "Untitled Resume"}
                    </Text>
                    {r.fullName ? (
                      <Text
                        style={[
                          styles.resumeOptionSub,
                          { color: colors.textTertiary },
                        ]}
                        numberOfLines={1}
                      >
                        {r.fullName}
                      </Text>
                    ) : null}
                  </View>
                  {defaultResumeId === r.id && (
                    <ChevronRight color={colors.accent} size={16} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    paddingBottom: 4,
  },
  editPhotoBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editPhotoText: { fontSize: 12, fontWeight: "500" },
  profileMeta: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  profileName: { fontSize: 18, fontWeight: "800" },
  profileEmail: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
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
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
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
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  dangerText: { fontSize: 15, fontWeight: "800" },
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  resumeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  resumeOptionText: { fontSize: 14, fontWeight: "700" },
  resumeOptionSub: { fontSize: 12, marginTop: 2 },
});
