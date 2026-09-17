// app/job/new.tsx
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Job, JobStatus } from "@/types";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NewJobInput = Omit<Job, "id" | "createdAt" | "updatedAt">;

const STATUSES: JobStatus[] = [
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
];
const STATUS_COLORS: Record<JobStatus, string> = {
  saved: "#94A3B8",
  applied: "#60A5FA",
  interview: "#A78BFA",
  offer: "#34D399",
  rejected: "#F87171",
};

export default function NewJobScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { addJob } = useData();

  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<JobStatus>("saved");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");

  const canSave = useMemo(
    () => company.trim().length > 0 && roleTitle.trim().length > 0,
    [company, roleTitle],
  );

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert("Missing info", "Please enter Company and Role Title.");
      return;
    }
    const draft: NewJobInput = {
      company: company.trim(),
      roleTitle: roleTitle.trim(),
      location: location.trim() || undefined,
      status,
      jobUrl: jobUrl.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      notes: notes.trim() || undefined,
      followUpDate: followUpDate || undefined,
      interviewDate: interviewDate || undefined,
      deadline: deadline || undefined,
      followUpTime: followUpTime || undefined,
      interviewTime: interviewTime || undefined,
      deadlineTime: deadlineTime || undefined,
    };
    try {
      await addJob(draft);
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  };

  const handleClear = () => {
    setCompany("");
    setRoleTitle("");
    setLocation("");
    setStatus("saved");
    setJobUrl("");
    setJobDescription("");
    setNotes("");
    setFollowUpDate("");
    setInterviewDate("");
    setDeadline("");
    setFollowUpTime("");
    setInterviewTime("");
    setDeadlineTime("");
  };

  const inp = (extra?: object) => [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
    extra,
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topSide}>
          <Text style={[styles.topSideText, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>New Job</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={styles.topSide}
        >
          <Text
            style={[
              styles.topSideText,
              { color: canSave ? colors.accent : colors.textTertiary },
            ]}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
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
              style={inp()}
              placeholder="Company *"
              placeholderTextColor={colors.textTertiary}
              value={company}
              onChangeText={setCompany}
            />
            <TextInput
              style={inp()}
              placeholder="Role Title *"
              placeholderTextColor={colors.textTertiary}
              value={roleTitle}
              onChangeText={setRoleTitle}
            />
            <TextInput
              style={inp()}
              placeholder="Location (optional)"
              placeholderTextColor={colors.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
            <TextInput
              style={inp({ marginBottom: 0 })}
              placeholder="Job URL (optional)"
              placeholderTextColor={colors.textTertiary}
              value={jobUrl}
              onChangeText={setJobUrl}
              autoCapitalize="none"
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
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.statusChip,
                    { borderColor: STATUS_COLORS[s] },
                    status === s && { backgroundColor: STATUS_COLORS[s] },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: status === s ? "#fff" : STATUS_COLORS[s] },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
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
              Description & Notes
            </Text>
            <TextInput
              style={inp(styles.multiline)}
              placeholder="Job description..."
              placeholderTextColor={colors.textTertiary}
              value={jobDescription}
              onChangeText={setJobDescription}
              multiline
              textAlignVertical="top"
            />
            <TextInput
              style={inp({ ...styles.multiline, marginBottom: 0 })}
              placeholder="Notes..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Reminders (optional)
            </Text>

            {[
              {
                label: "Follow-up",
                date: followUpDate,
                setDate: setFollowUpDate,
                time: followUpTime,
                setTime: setFollowUpTime,
              },
              {
                label: "Interview",
                date: interviewDate,
                setDate: setInterviewDate,
                time: interviewTime,
                setTime: setInterviewTime,
              },
              {
                label: "Deadline",
                date: deadline,
                setDate: setDeadline,
                time: deadlineTime,
                setTime: setDeadlineTime,
              },
            ].map(({ label, date, setDate, time, setTime }) => (
              <View key={label}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textTertiary }]}
                >
                  {label}
                </Text>
                <View style={styles.dateTimeRow}>
                  <TextInput
                    style={inp({ flex: 2, marginBottom: 10 })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    value={date}
                    onChangeText={setDate}
                  />
                  <TextInput
                    style={inp({ flex: 1, marginBottom: 10 })}
                    placeholder="09:00 AM"
                    placeholderTextColor={colors.textTertiary}
                    value={time}
                    onChangeText={setTime}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={handleClear}
            >
              <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: canSave ? colors.accent : colors.border,
                  opacity: canSave ? 1 : 0.6,
                },
              ]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text
                style={[
                  styles.btnText,
                  {
                    color: canSave
                      ? (colors.accentText ?? "#fff")
                      : colors.textSecondary,
                  },
                ]}
              >
                Save Job
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topSide: { width: 64 },
  topSideText: { fontSize: 16, fontWeight: "600" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 28 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  multiline: { height: 80, paddingTop: 10, textAlignVertical: "top" },
  dateTimeRow: { flexDirection: "row", gap: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "700" },
});
