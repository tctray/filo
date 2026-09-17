// app/job/[id].tsx
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Job, JobStatus } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function JobDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { jobs, updateJob, deleteJob } = useData();

  const job = useMemo(() => jobs.find((j) => j.id === id), [jobs, id]);

  const [company, setCompany] = useState(job?.company ?? "");
  const [roleTitle, setRoleTitle] = useState(job?.roleTitle ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [status, setStatus] = useState<JobStatus>(
    (job?.status as JobStatus) ?? "saved",
  );
  const [jobUrl, setJobUrl] = useState((job as any)?.jobUrl ?? "");
  const [jobDescription, setJobDescription] = useState(
    (job as any)?.jobDescription ?? "",
  );
  const [notes, setNotes] = useState(job?.notes ?? "");
  const [followUpDate, setFollowUpDate] = useState(
    (job as any)?.followUpDate ?? "",
  );
  const [interviewDate, setInterviewDate] = useState(
    (job as any)?.interviewDate ?? "",
  );
  const [deadline, setDeadline] = useState((job as any)?.deadline ?? "");
  const [followUpTime, setFollowUpTime] = useState(
    (job as any)?.followUpTime ?? "",
  );
  const [interviewTime, setInterviewTime] = useState(
    (job as any)?.interviewTime ?? "",
  );
  const [deadlineTime, setDeadlineTime] = useState(
    (job as any)?.deadlineTime ?? "",
  );

  if (!job) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.notFound}>
          <Ionicons
            name="briefcase-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Job not found
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text
              style={[
                { color: colors.accent, fontWeight: "600", fontSize: 15 },
              ]}
            >
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canSave = company.trim().length > 0 && roleTitle.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert("Missing info", "Please enter Company and Role Title.");
      return;
    }
    const patch: Partial<Job> = {
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
    } as any;
    await updateJob(job.id, patch);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert("Delete job?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteJob(job.id);
          router.back();
        },
      },
    ]);
  };

  const inp = (...extra: object[]) => [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
    ...extra,
  ];

  const reminderRows = [
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
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.topIconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[styles.topTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {job.roleTitle}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.topIconBtn}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={colors.danger ?? "#F87171"}
          />
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
          {/* Job details */}
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
              placeholder="Location"
              placeholderTextColor={colors.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
            <TextInput
              style={inp({ marginBottom: 0 })}
              placeholder="Job URL"
              placeholderTextColor={colors.textTertiary}
              value={jobUrl}
              onChangeText={setJobUrl}
              autoCapitalize="none"
            />
          </View>

          {/* Status */}
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

          {/* Description & Notes */}
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

          {/* Reminders */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Reminders
            </Text>
            {reminderRows.map(({ label, date, setDate, time, setTime }) => (
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

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: canSave ? colors.accent : colors.surface,
                borderColor: colors.border,
                opacity: canSave ? 1 : 0.5,
              },
            ]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text
              style={[
                styles.saveBtnText,
                {
                  color: canSave
                    ? (colors.accentText ?? "#fff")
                    : colors.textSecondary,
                },
              ]}
            >
              Save Changes
            </Text>
          </TouchableOpacity>

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
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700" },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16 },
});
