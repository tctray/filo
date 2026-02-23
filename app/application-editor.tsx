import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { ApplicationStatus } from "@/types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function ApplicationEditorScreen() {
  const { colors } = useTheme();
  const {
    applications,
    resumes,
    coverLetters,
    addApplication,
    updateApplication,
  } = useData();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const existing = params.id
    ? applications.find((a) => a.id === params.id)
    : undefined;

  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(existing?.company ?? "");
  const [roleTitle, setRoleTitle] = useState(existing?.roleTitle ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    existing?.status ?? "Saved",
  );
  const [dateApplied, setDateApplied] = useState(existing?.dateApplied ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(
    existing?.followUpDate ?? "",
  );
  const [resumeId, setResumeId] = useState(existing?.resumeId ?? "");
  const [coverLetterId, setCoverLetterId] = useState(
    existing?.coverLetterId ?? "",
  );
  const [showResumeSelect, setShowResumeSelect] = useState(false);
  const [showCoverLetterSelect, setShowCoverLetterSelect] = useState(false);

  const selectedResume = useMemo(
    () => resumes.find((r) => r.id === resumeId),
    [resumes, resumeId],
  );
  const selectedCL = useMemo(
    () => coverLetters.find((c) => c.id === coverLetterId),
    [coverLetters, coverLetterId],
  );

  const statusColor = useCallback(
    (s: ApplicationStatus) => {
      const map: Record<ApplicationStatus, string> = {
        Saved: colors.statusSaved,
        Applied: colors.statusApplied,
        Interview: colors.statusInterview,
        Offer: colors.statusOffer,
        Rejected: colors.statusRejected,
      };
      return map[s];
    },
    [colors],
  );

  const handleSave = useCallback(async () => {
    if (!company.trim() || !roleTitle.trim()) {
      Alert.alert("Error", "Please enter company and role title");
      return;
    }
    try {
      setSaving(true);
      const data = {
        company,
        roleTitle,
        location,
        status,
        dateApplied,
        notes,
        followUpDate,
        resumeId,
        coverLetterId,
      };
      if (existing) {
        await updateApplication(existing.id, data);
      } else {
        await addApplication(data);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [
    company,
    roleTitle,
    location,
    status,
    dateApplied,
    notes,
    followUpDate,
    resumeId,
    coverLetterId,
    existing,
    updateApplication,
    addApplication,
    router,
  ]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Hide native header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Custom top bar ── */}
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        {/* ✅ Close button — always visible */}
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <X color={colors.text} size={22} />
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          {existing ? "Edit Application" : "New Application"}
        </Text>

        {/* Save button top-right */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[
            styles.saveBtn,
            {
              borderColor: colors.accent + "80",
              backgroundColor: colors.accent + "1A",
              opacity: saving ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.saveBtnText, { color: colors.text }]}>
            {saving ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: 130 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Job Details
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Company *"
                placeholderTextColor={colors.textTertiary}
                value={company}
                onChangeText={setCompany}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Role Title *"
                placeholderTextColor={colors.textTertiary}
                value={roleTitle}
                onChangeText={setRoleTitle}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Location (optional)"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Status
              </Text>
              <View style={styles.statusRow}>
                {ALL_STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusChip,
                      { borderColor: statusColor(s) },
                      status === s && { backgroundColor: statusColor(s) },
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: status === s ? "#fff" : statusColor(s) },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Dates
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Date Applied (e.g. 2024-01-15)"
                placeholderTextColor={colors.textTertiary}
                value={dateApplied}
                onChangeText={setDateApplied}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Follow-up Date (optional)"
                placeholderTextColor={colors.textTertiary}
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Linked Documents
              </Text>

              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowResumeSelect(!showResumeSelect)}
              >
                <Text
                  style={[
                    styles.selectText,
                    {
                      color: selectedResume ? colors.text : colors.textTertiary,
                    },
                  ]}
                >
                  {selectedResume
                    ? selectedResume.title
                    : "Select Resume (optional)"}
                </Text>
                <ChevronDown color={colors.textTertiary} size={16} />
              </TouchableOpacity>
              {showResumeSelect && (
                <View
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: colors.surfacePressed,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setResumeId("");
                      setShowResumeSelect(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {resumes.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setResumeId(r.id);
                        setShowResumeSelect(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          {
                            color:
                              resumeId === r.id ? colors.accent : colors.text,
                          },
                        ]}
                      >
                        {r.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.spacer} />

              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowCoverLetterSelect(!showCoverLetterSelect)}
              >
                <Text
                  style={[
                    styles.selectText,
                    { color: selectedCL ? colors.text : colors.textTertiary },
                  ]}
                >
                  {selectedCL
                    ? selectedCL.title
                    : "Select Cover Letter (optional)"}
                </Text>
                <ChevronDown color={colors.textTertiary} size={16} />
              </TouchableOpacity>
              {showCoverLetterSelect && (
                <View
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: colors.surfacePressed,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCoverLetterId("");
                      setShowCoverLetterSelect(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {coverLetters.map((cl) => (
                    <TouchableOpacity
                      key={cl.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCoverLetterId(cl.id);
                        setShowCoverLetterSelect(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          {
                            color:
                              coverLetterId === cl.id
                                ? colors.accent
                                : colors.text,
                          },
                        ]}
                      >
                        {cl.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Notes
              </Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Add notes about this application..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* ✅ Sticky Submit bar */}
          <View
            style={[
              styles.stickyBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
              style={[
                styles.stickySubmit,
                { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[styles.submitBtnText, { color: colors.accentText }]}
              >
                {saving ? "Submitting…" : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20 },

  // ── Custom top bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    marginHorizontal: 8,
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveBtnText: { fontWeight: "900", fontSize: 14 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: { fontSize: 13, fontWeight: "500", marginBottom: 10 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusText: { fontSize: 13, fontWeight: "600" },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  selectText: { fontSize: 14 },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownText: { fontSize: 14 },
  spacer: { height: 10 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },

  // ── Sticky submit ──
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
  },
  stickySubmit: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "900",
  },
});
