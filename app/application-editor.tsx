// app/application-editor.tsx
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { ApplicationStatus } from "@/types";
import { extractTextFromFile } from "@/utils/parseDocument";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Briefcase,
  Building2,
  ChevronDown,
  DollarSign,
  FileText,
  Globe,
  MapPin,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
const WORK_TYPES = ["remote", "hybrid", "onsite"] as const;
const SALARY_TYPES = ["annual", "hourly"] as const;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJobDescription(text: string) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: {
    company?: string;
    roleTitle?: string;
    location?: string;
    notes?: string;
    jobDescription?: string;
    salaryMin?: string;
    salaryMax?: string;
    workType?: "remote" | "hybrid" | "onsite";
    hiringManager?: string;
  } = {};

  const titlePatterns = [
    /^(?:job\s*title|position|role|title)[:\s]+(.+)/im,
    /(?:hiring|looking for|seeking)\s+(?:a|an)\s+(.+?)(?:\s+to|\s+who|\s+at|\.|$)/im,
    /^(senior|junior|lead|staff|principal|mid[- ]level)?\s*([a-z][a-z\s\/\-]+(?:engineer|developer|designer|manager|analyst|specialist|coordinator|director|officer|lead|architect|consultant|scientist|writer|strategist|associate|intern))/im,
  ];
  for (const pat of titlePatterns) {
    const m = text.match(pat);
    if (m) {
      result.roleTitle = (m[2] ? `${m[1] ?? ""} ${m[2]}` : m[1])
        .trim()
        .replace(/\s+/g, " ");
      break;
    }
  }
  if (!result.roleTitle) {
    for (const line of lines.slice(0, 5)) {
      if (
        line.length < 80 &&
        /engineer|developer|designer|manager|analyst|specialist|director|coordinator|lead|architect|scientist|writer|strategist|associate|intern/i.test(
          line,
        )
      ) {
        result.roleTitle = line;
        break;
      }
    }
  }

  const companyPatterns = [
    /^(?:company|employer|organization|org|about\s+us)[:\s]+(.+)/im,
    /(?:at|join|for)\s+([A-Z][A-Za-z0-9\s&,\.]+?)(?:\s+is|\s+are|\s+we|\s*,|\s*\.|\s*\n)/m,
    /([A-Z][A-Za-z0-9\s&]+?)\s+is\s+(?:hiring|looking|seeking|a\s+(?:growing|leading|global))/m,
  ];
  for (const pat of companyPatterns) {
    const m = text.match(pat);
    if (m && m[1] && m[1].trim().length > 1 && m[1].trim().length < 60) {
      result.company = m[1].trim().replace(/\s+/g, " ");
      break;
    }
  }

  const locationPatterns = [
    /^(?:location|office|work\s*location|workplace)[:\s]+(.+)/im,
    /\b(remote|hybrid|on[- ]?site|in[- ]?office)\b/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Za-z]+))\s*(?:\(|–|-|$|\n)/m,
    /\b([A-Z][a-z]+,\s*[A-Z]{2})\b/,
  ];
  for (const pat of locationPatterns) {
    const m = text.match(pat);
    if (m) {
      result.location = m[1].trim();
      break;
    }
  }

  if (/\bremote\b/i.test(text)) result.workType = "remote";
  else if (/\bhybrid\b/i.test(text)) result.workType = "hybrid";
  else if (/\bon[- ]?site\b|\bin[- ]?office\b/i.test(text))
    result.workType = "onsite";

  // Basic "$120,000 - $160,000" parsing
  const salaryMatch = text.match(/\$\s*([\d,]+)\s*(?:[-–]\s*\$\s*([\d,]+))?/);
  if (salaryMatch) {
    result.salaryMin = salaryMatch[1].replace(/,/g, "");
    if (salaryMatch[2]) result.salaryMax = salaryMatch[2].replace(/,/g, "");
  }

  const hmMatch = text.match(
    /(?:hiring manager|contact|recruiter)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/im,
  );
  if (hmMatch) result.hiringManager = hmMatch[1].trim();

  result.jobDescription = text.slice(0, 1200).trim();

  const noteSections: string[] = [];
  const reqMatch = text.match(
    /(?:requirements?|qualifications?|what\s+you['']?ll\s+(?:need|bring)|must\s+have)[:\s]*\n((?:.+\n?){1,8})/im,
  );
  if (reqMatch) {
    const bullets = reqMatch[1]
      .split(/\n/)
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l.length > 10)
      .slice(0, 3);
    if (bullets.length)
      noteSections.push("Requirements: " + bullets.join("; ") + ".");
  }
  result.notes = noteSections.length
    ? noteSections.join(" ")
    : lines
        .filter((l) => l.length > 40)
        .slice(0, 2)
        .join(" ")
        .slice(0, 300);

  return result;
}

function SectionHeader({
  icon,
  label,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  colors: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

export default function ApplicationEditorScreen() {
  const { colors } = useTheme();
  const {
    applications,
    resumes,
    coverLetters,
    addApplication,
    updateApplication,
  } = useData();
  const { syncOnSave } = useCalendarSync();
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string;
    prefill_company?: string;
    prefill_role?: string;
    prefill_location?: string;
    prefill_job_url?: string;
    prefill_level?: string;
    prefill_job_description?: string;
  }>();

  const existing = params.id
    ? applications.find((a) => a.id === params.id)
    : undefined;
  const ex = existing as any;

  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [company, setCompany] = useState(
    existing?.company ?? params.prefill_company ?? "",
  );
  const [roleTitle, setRoleTitle] = useState(
    existing?.roleTitle ?? params.prefill_role ?? "",
  );
  const [location, setLocation] = useState(
    existing?.location ?? params.prefill_location ?? "",
  );
  const [status, setStatus] = useState<ApplicationStatus>(
    existing?.status ?? "Saved",
  );

  // ✅ FIX: prefill jobUrl from Muse params if new
  const [jobUrl, setJobUrl] = useState(
    ex?.jobUrl ?? params.prefill_job_url ?? "",
  );

  const [workType, setWorkType] = useState<"remote" | "hybrid" | "onsite" | "">(
    ex?.workType ?? "",
  );

  const [salaryMin, setSalaryMin] = useState(ex?.salaryMin ?? "");
  const [salaryMax, setSalaryMax] = useState(ex?.salaryMax ?? "");
  const [salaryType, setSalaryType] = useState<"annual" | "hourly">(
    ex?.salaryType ?? "annual",
  );

  const [companySize, setCompanySize] = useState(ex?.companySize ?? "");
  const [hiringManager, setHiringManager] = useState(ex?.hiringManager ?? "");
  const [referral, setReferral] = useState(ex?.referral ?? "");

  const [dateApplied, setDateApplied] = useState(existing?.dateApplied ?? "");
  const [interviewDate, setInterviewDate] = useState(ex?.interviewDate ?? "");
  const [followUpDate, setFollowUpDate] = useState(
    existing?.followUpDate ?? "",
  );
  const [deadline, setDeadline] = useState(ex?.deadline ?? "");

  const [jobDescription, setJobDescription] = useState(
    ex?.jobDescription ?? params.prefill_job_description ?? "",
  );

  const [notes, setNotes] = useState(existing?.notes ?? "");

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

  // ✅ OPTIONAL QUALITY FIX:
  // When coming from Muse, parse the HTML description once to auto-fill salary/workType/location.
  useEffect(() => {
    if (existing) return; // don’t override existing records
    const html = params.prefill_job_description;
    if (!html) return;

    // only auto-fill if these are empty (so we don’t overwrite manual edits)
    const shouldParse =
      (!salaryMin && !salaryMax) ||
      !workType ||
      (!location && !params.prefill_location);

    if (!shouldParse) return;

    const parsed = parseJobDescription(stripHtml(html));
    if (!salaryMin && parsed.salaryMin) setSalaryMin(parsed.salaryMin);
    if (!salaryMax && parsed.salaryMax) setSalaryMax(parsed.salaryMax);
    if (!workType && parsed.workType) setWorkType(parsed.workType);
    if (!location && parsed.location) setLocation(parsed.location);
    if (!hiringManager && parsed.hiringManager)
      setHiringManager(parsed.hiringManager);
    // notes + description already prefilled; leave them alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadAndParse = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
          "text/rtf",
          "application/rtf",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;

      setParsing(true);
      const text = await extractTextFromFile(
        file.uri,
        file.mimeType ?? undefined,
      );

      if (!text.trim()) {
        Alert.alert("Couldn't read file", "Try a different format.");
        return;
      }

      const data = parseJobDescription(text);
      if (data.company) setCompany(data.company);
      if (data.roleTitle) setRoleTitle(data.roleTitle);
      if (data.location) setLocation(data.location);
      if (data.notes) setNotes(data.notes);
      if (data.jobDescription) setJobDescription(data.jobDescription);
      if (data.salaryMin) setSalaryMin(data.salaryMin);
      if (data.salaryMax) setSalaryMax(data.salaryMax);
      if (data.workType) setWorkType(data.workType);
      if (data.hiringManager) setHiringManager(data.hiringManager);

      Alert.alert(
        "Fields Filled",
        "Review and edit the details before saving.",
      );
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not read the file.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!company.trim() || !roleTitle.trim()) {
      Alert.alert("Error", "Please enter company and role title");
      return;
    }
    try {
      setSaving(true);
      const now = new Date().toISOString();
      const appId = existing?.id ?? uid();

      const payload = {
        company,
        roleTitle,
        location,
        status,
        jobUrl,
        jobDescription,
        salaryMin,
        salaryMax,
        salaryType,
        workType: workType || undefined,
        companySize,
        hiringManager,
        referral,
        dateApplied,
        interviewDate,
        followUpDate,
        deadline,
        notes,
        resumeId,
        coverLetterId,
        updatedAt: now,
      };

      if (existing) {
        await updateApplication({ ...existing, ...payload });
      } else {
        await addApplication({ id: appId, createdAt: now, ...payload } as any);
      }

      setTimeout(() => {
        syncOnSave({
          id: appId,
          company,
          roleTitle,
          interviewDate: interviewDate || undefined,
          followUpDate: followUpDate || undefined,
          deadline: deadline || undefined,
        }).catch((e) => console.warn("[CalendarSync]", e));
      }, 0);

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
    jobUrl,
    jobDescription,
    salaryMin,
    salaryMax,
    salaryType,
    workType,
    companySize,
    hiringManager,
    referral,
    dateApplied,
    interviewDate,
    followUpDate,
    deadline,
    notes,
    resumeId,
    coverLetterId,
    existing,
    syncOnSave,
    router,
  ]);

  const surf = colors.inputBackground ?? colors.surface;
  const inp = [
    styles.input,
    { backgroundColor: surf, color: colors.text, borderColor: colors.border },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
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
            {/* Upload */}
            <TouchableOpacity
              onPress={handleUploadAndParse}
              disabled={parsing}
              activeOpacity={0.8}
              style={[
                styles.actionRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: parsing ? 0.6 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.actionIconWrap,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <FileText color={colors.accent} size={18} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {parsing ? "Reading file…" : "Upload Job Description"}
                </Text>
                <Text
                  style={[styles.actionSub, { color: colors.textSecondary }]}
                >
                  Auto-fills fields from .docx, .rtf, .txt
                </Text>
              </View>
            </TouchableOpacity>

            {/* Job Details */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<Briefcase color={colors.accent} size={15} />}
                label="Job Details"
                colors={colors}
              />
              <TextInput
                style={inp}
                placeholder="Company *"
                placeholderTextColor={colors.textTertiary}
                value={company}
                onChangeText={setCompany}
              />
              <TextInput
                style={inp}
                placeholder="Role Title *"
                placeholderTextColor={colors.textTertiary}
                value={roleTitle}
                onChangeText={setRoleTitle}
              />
              <TextInput
                style={inp}
                placeholder="Location"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={setLocation}
              />
              <TextInput
                style={[inp, { marginBottom: 10 }]}
                placeholder="Job URL"
                placeholderTextColor={colors.textTertiary}
                value={jobUrl}
                onChangeText={setJobUrl}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Work Type
              </Text>
              <View style={styles.chipRow}>
                {WORK_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setWorkType(workType === t ? "" : t)}
                    style={[
                      styles.chip,
                      {
                        borderColor: colors.border,
                        backgroundColor:
                          workType === t ? colors.accent : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            workType === t
                              ? (colors.accentText ?? "#fff")
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Compensation */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<DollarSign color={colors.accent} size={15} />}
                label="Compensation"
                colors={colors}
              />
              <View style={styles.chipRow}>
                {SALARY_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSalaryType(t)}
                    style={[
                      styles.chip,
                      {
                        borderColor: colors.border,
                        backgroundColor:
                          salaryType === t ? colors.accent : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            salaryType === t
                              ? (colors.accentText ?? "#fff")
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[inp, styles.halfInput]}
                  placeholder="Min ($)"
                  placeholderTextColor={colors.textTertiary}
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[inp, styles.halfInput]}
                  placeholder="Max ($)"
                  placeholderTextColor={colors.textTertiary}
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Company Info */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<Building2 color={colors.accent} size={15} />}
                label="Company Info"
                colors={colors}
              />
              <TextInput
                style={inp}
                placeholder="Company Size (e.g. Startup, 50-200, Enterprise)"
                placeholderTextColor={colors.textTertiary}
                value={companySize}
                onChangeText={setCompanySize}
              />
              <TextInput
                style={[inp, { marginBottom: 0 }]}
                placeholder="Hiring Manager / Recruiter"
                placeholderTextColor={colors.textTertiary}
                value={hiringManager}
                onChangeText={setHiringManager}
              />
            </View>

            {/* Referral */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<Users color={colors.accent} size={15} />}
                label="Referral"
                colors={colors}
              />
              <TextInput
                style={[inp, { marginBottom: 0 }]}
                placeholder="Referred by (name or LinkedIn)"
                placeholderTextColor={colors.textTertiary}
                value={referral}
                onChangeText={setReferral}
              />
            </View>

            {/* Status */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<MapPin color={colors.accent} size={15} />}
                label="Status"
                colors={colors}
              />
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

            {/* Dates */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<Globe color={colors.accent} size={15} />}
                label="Dates"
                colors={colors}
              />
              <TextInput
                style={inp}
                placeholder="Date Applied (YYYY-MM-DD)"
                placeholderTextColor={colors.textTertiary}
                value={dateApplied}
                onChangeText={setDateApplied}
              />
              <TextInput
                style={inp}
                placeholder="Interview Date (YYYY-MM-DD)"
                placeholderTextColor={colors.textTertiary}
                value={interviewDate}
                onChangeText={setInterviewDate}
              />
              <TextInput
                style={inp}
                placeholder="Follow-up Date (YYYY-MM-DD)"
                placeholderTextColor={colors.textTertiary}
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
              <TextInput
                style={[inp, { marginBottom: 0 }]}
                placeholder="Deadline (YYYY-MM-DD)"
                placeholderTextColor={colors.textTertiary}
                value={deadline}
                onChangeText={setDeadline}
              />
            </View>

            {/* Linked Documents */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<FileText color={colors.accent} size={15} />}
                label="Linked Documents"
                colors={colors}
              />
              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  { backgroundColor: surf, borderColor: colors.border },
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
                      backgroundColor: colors.surface,
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

              <View style={{ height: 10 }} />

              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  { backgroundColor: surf, borderColor: colors.border },
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
                      backgroundColor: colors.surface,
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

            {/* Job Description */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<FileText color={colors.accent} size={15} />}
                label="Job Description"
                colors={colors}
              />
              <TextInput
                style={[
                  styles.bigTextInput,
                  {
                    backgroundColor: surf,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Paste the full job description here..."
                placeholderTextColor={colors.textTertiary}
                value={jobDescription}
                onChangeText={setJobDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Notes */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <SectionHeader
                icon={<User color={colors.accent} size={15} />}
                label="Notes"
                colors={colors}
              />
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: surf,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Interview prep, contacts, personal notes..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

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
                style={[
                  styles.submitBtnText,
                  { color: colors.accentText ?? "#fff" },
                ]}
              >
                {saving ? "Saving…" : "Save Application"}
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "700" },
  actionSub: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldLabel: { fontSize: 11, fontWeight: "500", marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
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
  bigTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 160,
    lineHeight: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },
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
  submitBtnText: { fontSize: 16, fontWeight: "900" },
});
