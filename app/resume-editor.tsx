// app/resume-editor.tsx
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FileText, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { v4 as uuidv4 } from "uuid";

import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { extractTextFromFile } from "@/utils/parseDocument";

// Cross-platform alert: Alert.alert() is a silent no-op on web, so we
// fall back to window.alert() there. Native keeps using Alert.alert().
function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

type ResumeDraft = {
  id?: string;
  title: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    id: string;
    company: string;
    title: string;
    start?: string;
    end?: string;
    bullets: string[];
  }>;
  folder?: string;
};

function uid(prefix?: string) {
  if (prefix === "exp") return uuidv4();
  return uuidv4();
}

function parseResumeText(text: string): Partial<ResumeDraft> {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const result: Partial<ResumeDraft> = {};

  for (const line of lines.slice(0, 5)) {
    if (
      line.length < 40 &&
      /^[A-Za-z]/.test(line) &&
      !line.includes("@") &&
      !/\d{3}/.test(line)
    ) {
      result.fullName = line;
      break;
    }
  }

  const emailMatch = text.match(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  );
  if (emailMatch) result.email = emailMatch[0];

  const phoneMatch = text.match(
    /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/,
  );
  if (phoneMatch) result.phone = phoneMatch[0].trim();

  const locationMatch = text.match(
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})\b/,
  );
  if (locationMatch) result.location = locationMatch[1];

  const summaryMatch = text.match(
    /(?:summary|objective|profile|about)[:\s]*\n?((?:.+\n?){1,4})/i,
  );
  if (summaryMatch)
    result.summary = summaryMatch[1].replace(/\n/g, " ").trim().slice(0, 400);

  const skillsMatch = text.match(
    /(?:skills?|technologies|tools|tech stack)[:\s]*\n?((?:.+\n?){1,6})/i,
  );
  if (skillsMatch) {
    const skills = skillsMatch[1]
      .split(/[,\n•·|\/]/)
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter((s) => s.length > 1 && s.length < 40);
    if (skills.length) result.skills = skills.slice(0, 20);
  }

  const expSection = text.match(
    /(?:experience|work history|employment)[:\s]*\n([\s\S]+?)(?=\n(?:education|skills|projects|certifications)|$)/i,
  );
  if (expSection) {
    const roles: ResumeDraft["experience"] = [];
    const roleBlocks = expSection[1].split(/\n(?=[A-Z][^\n]{0,60}\n)/);
    for (const block of roleBlocks.slice(0, 5)) {
      const blockLines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (blockLines.length < 2) continue;
      const dateMatch = block.match(
        /(\w+\.?\s+\d{4})\s*[–\-—to]+\s*(\w+\.?\s+\d{4}|present|current)/i,
      );
      const bullets = blockLines
        .filter((l) => /^[•\-*]/.test(l))
        .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
        .filter((l) => l.length > 5)
        .slice(0, 4);
      roles.push({
        id: uid("exp"),
        company: blockLines[0] ?? "",
        title: blockLines[1] ?? "",
        start: dateMatch?.[1] ?? "",
        end: dateMatch?.[2] ?? "",
        bullets: bullets.length ? bullets : [""],
      });
    }
    if (roles.length) result.experience = roles;
  }

  return result;
}

// ── Resume Preview ──
function ResumePreview({ draft, colors }: { draft: ResumeDraft; colors: any }) {
  return (
    <ScrollView
      contentContainerStyle={[
        previewStyles.container,
        { backgroundColor: colors.surface },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={previewStyles.header}>
        {draft.fullName ? (
          <Text style={[previewStyles.name, { color: colors.text }]}>
            {draft.fullName}
          </Text>
        ) : (
          <Text style={[previewStyles.name, { color: colors.textTertiary }]}>
            {draft.title}
          </Text>
        )}
        <View style={previewStyles.contactRow}>
          {draft.email ? (
            <Text
              style={[previewStyles.contact, { color: colors.textSecondary }]}
            >
              {draft.email}
            </Text>
          ) : null}
          {draft.email && draft.phone ? (
            <Text
              style={[previewStyles.contact, { color: colors.textTertiary }]}
            >
              ·
            </Text>
          ) : null}
          {draft.phone ? (
            <Text
              style={[previewStyles.contact, { color: colors.textSecondary }]}
            >
              {draft.phone}
            </Text>
          ) : null}
          {(draft.email || draft.phone) && draft.location ? (
            <Text
              style={[previewStyles.contact, { color: colors.textTertiary }]}
            >
              ·
            </Text>
          ) : null}
          {draft.location ? (
            <Text
              style={[previewStyles.contact, { color: colors.textSecondary }]}
            >
              {draft.location}
            </Text>
          ) : null}
        </View>
      </View>

      {draft.summary ? (
        <View style={previewStyles.section}>
          <Text
            style={[
              previewStyles.sectionTitle,
              { color: colors.accent, borderBottomColor: colors.accent + "40" },
            ]}
          >
            Summary
          </Text>
          <Text style={[previewStyles.body, { color: colors.text }]}>
            {draft.summary}
          </Text>
        </View>
      ) : null}

      {draft.experience.length > 0 ? (
        <View style={previewStyles.section}>
          <Text
            style={[
              previewStyles.sectionTitle,
              { color: colors.accent, borderBottomColor: colors.accent + "40" },
            ]}
          >
            Experience
          </Text>
          {draft.experience.map((role) => (
            <View key={role.id} style={previewStyles.roleBlock}>
              <View style={previewStyles.roleHeader}>
                <Text style={[previewStyles.roleTitle, { color: colors.text }]}>
                  {role.title || "Role Title"}
                </Text>
                {role.start || role.end ? (
                  <Text
                    style={[
                      previewStyles.roleDates,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {[role.start, role.end].filter(Boolean).join(" – ")}
                  </Text>
                ) : null}
              </View>
              {role.company ? (
                <Text
                  style={[
                    previewStyles.roleCompany,
                    { color: colors.textSecondary },
                  ]}
                >
                  {role.company}
                </Text>
              ) : null}
              {role.bullets.filter(Boolean).map((b, i) => (
                <View key={i} style={previewStyles.bulletRow}>
                  <Text
                    style={[previewStyles.bulletDot, { color: colors.accent }]}
                  >
                    •
                  </Text>
                  <Text
                    style={[previewStyles.bulletText, { color: colors.text }]}
                  >
                    {b}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {draft.skills.length > 0 ? (
        <View style={previewStyles.section}>
          <Text
            style={[
              previewStyles.sectionTitle,
              { color: colors.accent, borderBottomColor: colors.accent + "40" },
            ]}
          >
            Skills
          </Text>
          <View style={previewStyles.skillsWrap}>
            {draft.skills.map((s) => (
              <View
                key={s}
                style={[
                  previewStyles.skillPill,
                  {
                    backgroundColor: colors.accent + "18",
                    borderColor: colors.accent + "30",
                  },
                ]}
              >
                <Text
                  style={[previewStyles.skillText, { color: colors.accent }]}
                >
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {draft.experience.length === 0 &&
      draft.skills.length === 0 &&
      !draft.summary &&
      !draft.fullName ? (
        <Text style={[previewStyles.empty, { color: colors.textTertiary }]}>
          Fill in the form to see your resume preview here.
        </Text>
      ) : null}
    </ScrollView>
  );
}

export default function ResumeEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const resumeId = typeof params.id === "string" ? params.id : undefined;
  const isEditing = Boolean(resumeId);

  const { resumes, addResume, updateResume } = useData();

  const existingResume = useMemo(() => {
    if (!resumeId) return undefined;
    return resumes.find((r) => r.id === resumeId);
  }, [resumeId, resumes]);

  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [draft, setDraft] = useState<ResumeDraft>(() => ({
    title: "Untitled Resume",
    skills: [],
    experience: [],
  }));

  useEffect(() => {
    if (!isEditing) return;
    if (!existingResume) {
      notify("Not found", "That resume could not be loaded.");
      router.back();
      return;
    }
    const r = existingResume as any;
    setDraft({
      id: r.id,
      title: r.title ?? "Untitled Resume",
      folder: r.folder,
      fullName: r.fullName ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      location: r.location ?? "",
      summary: r.summary ?? "",
      skills: Array.isArray(r.skills) ? r.skills : [],
      experience: Array.isArray(r.experience) ? r.experience : [],
    });
  }, [isEditing, existingResume, router]);

  const setField = useCallback(
    <K extends keyof ResumeDraft>(key: K, value: ResumeDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Upload & Parse ──
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
        notify("Couldn't read file", "Try a .docx, .rtf, or .txt file.");
        return;
      }

      const data = parseResumeText(text);
      setDraft((prev) => ({
        ...prev,
        title:
          prev.title === "Untitled Resume" && file.name
            ? file.name.replace(/\.(pdf|docx|doc|rtf|txt)$/i, "").trim()
            : prev.title,
        fullName: data.fullName ?? prev.fullName,
        email: data.email ?? prev.email,
        phone: data.phone ?? prev.phone,
        location: data.location ?? prev.location,
        summary: data.summary ?? prev.summary,
        skills: data.skills?.length ? data.skills : prev.skills,
        experience: data.experience?.length ? data.experience : prev.experience,
      }));

      notify(
        "Resume Parsed",
        "Fields filled from your file. Review and edit before saving.",
      );
    } catch (e: any) {
      notify("Upload failed", e?.message ?? "Could not read the file.");
    } finally {
      setParsing(false);
    }
  }, []);

  const onSave = useCallback(async () => {
    try {
      const title = draft.title.trim();
      if (!title) {
        notify("Missing title", "Please name your resume.");
        return;
      }
      setSaving(true);
      const payload = {
        ...(draft.id ? { id: draft.id } : { id: uid() }),
        title,
        folder: draft.folder,
        fullName: draft.fullName ?? "",
        email: draft.email ?? "",
        phone: draft.phone ?? "",
        location: draft.location ?? "",
        summary: draft.summary ?? "",
        skills: draft.skills,
        experience: draft.experience,
        updatedAt: new Date().toISOString(),
      };
      if (isEditing) {
        await updateResume(payload as any);
      } else {
        await addResume({
          ...payload,
          createdAt: new Date().toISOString(),
        } as any);
      }
      router.back();
    } catch (e: any) {
      notify("Submit failed", e?.message ?? "Could not save your resume.");
    } finally {
      setSaving(false);
    }
  }, [addResume, updateResume, draft, isEditing, router]);

  const [skillInput, setSkillInput] = useState("");
  const addSkill = useCallback(() => {
    const raw = skillInput.trim();
    if (!raw) return;
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setDraft((prev) => {
      const ex = new Set(prev.skills.map((s) => s.toLowerCase()));
      const next = [...prev.skills];
      for (const p of parts) {
        if (!ex.has(p.toLowerCase())) next.push(p);
      }
      return { ...prev, skills: next };
    });
    setSkillInput("");
  }, [skillInput]);

  const removeSkill = useCallback((skill: string) => {
    setDraft((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  }, []);

  const addRole = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: uid("exp"),
          company: "",
          title: "",
          start: "",
          end: "",
          bullets: [""],
        },
      ],
    }));
  }, []);

  const updateRole = useCallback(
    (id: string, patch: Partial<ResumeDraft["experience"][number]>) => {
      setDraft((prev) => ({
        ...prev,
        experience: prev.experience.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      }));
    },
    [],
  );

  const removeRole = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.filter((r) => r.id !== id),
    }));
  }, []);

  const updateBullet = useCallback(
    (roleId: string, idx: number, value: string) => {
      setDraft((prev) => ({
        ...prev,
        experience: prev.experience.map((r) => {
          if (r.id !== roleId) return r;
          const b = [...(r.bullets ?? [])];
          b[idx] = value;
          return { ...r, bullets: b };
        }),
      }));
    },
    [],
  );

  const addBullet = useCallback((roleId: string) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((r) =>
        r.id === roleId ? { ...r, bullets: [...(r.bullets ?? []), ""] } : r,
      ),
    }));
  }, []);

  const removeBullet = useCallback((roleId: string, idx: number) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((r) => {
        if (r.id !== roleId) return r;
        const b = [...(r.bullets ?? [])];
        b.splice(idx, 1);
        if (b.length === 0) b.push("");
        return { ...r, bullets: b };
      }),
    }));
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <X color={colors.text} size={22} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          {isEditing ? "Edit Resume" : "New Resume"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={[
              styles.toggleWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Pressable
              onPress={() => setViewMode("edit")}
              style={[
                styles.toggleBtn,
                viewMode === "edit" && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={15}
                color={
                  viewMode === "edit"
                    ? (colors.accentText ?? "#fff")
                    : colors.textSecondary
                }
              />
            </Pressable>
            <Pressable
              onPress={() => setViewMode("preview")}
              style={[
                styles.toggleBtn,
                viewMode === "preview" && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="eye-outline"
                size={15}
                color={
                  viewMode === "preview"
                    ? (colors.accentText ?? "#fff")
                    : colors.textSecondary
                }
              />
            </Pressable>
          </View>
          <Pressable
            onPress={onSave}
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
          </Pressable>
        </View>
      </View>

      {viewMode === "preview" ? (
        <ResumePreview draft={draft} colors={colors} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={[styles.container, { paddingBottom: 130 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Upload & Parse ── */}
              <Pressable
                onPress={handleUploadAndParse}
                disabled={parsing}
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
                    {parsing ? "Reading file…" : "Upload Resume"}
                  </Text>
                  <Text
                    style={[styles.actionSub, { color: colors.textSecondary }]}
                  >
                    Auto-fills fields from .docx, .rtf, .txt
                  </Text>
                </View>
              </Pressable>

              {/* Title */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.textTertiary }]}>
                  Resume Title
                </Text>
                <TextInput
                  value={draft.title}
                  onChangeText={(t) => setField("title", t)}
                  placeholder="e.g., Software Engineer Resume"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfacePressed,
                    },
                  ]}
                />
              </View>

              {/* Details */}
              <View
                style={[
                  styles.section,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Details
                </Text>
                <Field
                  label="Full Name"
                  value={draft.fullName ?? ""}
                  onChange={(t) => setField("fullName", t)}
                  colors={colors}
                />
                <Field
                  label="Email"
                  value={draft.email ?? ""}
                  onChange={(t) => setField("email", t)}
                  colors={colors}
                  keyboardType="email-address"
                />
                <Field
                  label="Phone"
                  value={draft.phone ?? ""}
                  onChange={(t) => setField("phone", t)}
                  colors={colors}
                  keyboardType="phone-pad"
                />
                <Field
                  label="Location"
                  value={draft.location ?? ""}
                  onChange={(t) => setField("location", t)}
                  colors={colors}
                />
                <Text
                  style={[
                    styles.label,
                    { color: colors.textTertiary, marginTop: 10 },
                  ]}
                >
                  Summary
                </Text>
                <TextInput
                  value={draft.summary ?? ""}
                  onChangeText={(t) => setField("summary", t)}
                  placeholder="2–4 sentence summary..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfacePressed,
                    },
                  ]}
                />
              </View>

              {/* Skills */}
              <View
                style={[
                  styles.section,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Skills
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <TextInput
                    value={skillInput}
                    onChangeText={setSkillInput}
                    placeholder="React, Tailwind…"
                    placeholderTextColor={colors.textTertiary}
                    onSubmitEditing={addSkill}
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.surfacePressed,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={addSkill}
                    style={[
                      styles.addPill,
                      {
                        borderColor: colors.accent + "80",
                        backgroundColor: colors.accent + "1A",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                        fontSize: 18,
                      }}
                    >
                      ＋
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.chipsWrap}>
                  {draft.skills.length === 0 ? (
                    <Text style={{ color: colors.textTertiary }}>
                      No skills yet.
                    </Text>
                  ) : (
                    draft.skills.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => removeSkill(s)}
                        style={[
                          styles.chip,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surfacePressed,
                          },
                        ]}
                      >
                        <Text style={{ color: colors.text, fontWeight: "700" }}>
                          {s}
                        </Text>
                        <Text
                          style={{
                            color: colors.textTertiary,
                            fontWeight: "900",
                            marginLeft: 6,
                          }}
                        >
                          ×
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>

              {/* Experience */}
              <View
                style={[
                  styles.section,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Experience
                  </Text>
                  <Pressable
                    onPress={addRole}
                    style={[
                      styles.smallBtn,
                      {
                        borderColor: colors.accent + "80",
                        backgroundColor: colors.accent + "1A",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      + Add Role
                    </Text>
                  </Pressable>
                </View>
                {draft.experience.length === 0 ? (
                  <Text style={{ color: colors.textTertiary, marginTop: 8 }}>
                    No roles yet.
                  </Text>
                ) : (
                  draft.experience.map((role) => (
                    <View
                      key={role.id}
                      style={[
                        styles.expCard,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfacePressed,
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          Role
                        </Text>
                        <Pressable
                          onPress={() => removeRole(role.id)}
                          style={[
                            styles.smallBtnDanger,
                            {
                              borderColor: "#ff707099",
                              backgroundColor: "#ff70701a",
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "800",
                              fontSize: 12,
                            }}
                          >
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                      <Field
                        label="Company"
                        value={role.company}
                        onChange={(t) => updateRole(role.id, { company: t })}
                        colors={colors}
                      />
                      <Field
                        label="Title"
                        value={role.title}
                        onChange={(t) => updateRole(role.id, { title: t })}
                        colors={colors}
                      />
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Start"
                            value={role.start ?? ""}
                            onChange={(t) => updateRole(role.id, { start: t })}
                            colors={colors}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="End"
                            value={role.end ?? ""}
                            onChange={(t) => updateRole(role.id, { end: t })}
                            colors={colors}
                          />
                        </View>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 10,
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          Bullets
                        </Text>
                        <Pressable
                          onPress={() => addBullet(role.id)}
                          style={[
                            styles.smallBtn,
                            {
                              borderColor: colors.accent + "80",
                              backgroundColor: colors.accent + "1A",
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: "800",
                              fontSize: 12,
                            }}
                          >
                            + Add Bullet
                          </Text>
                        </Pressable>
                      </View>
                      {role.bullets.map((b, idx) => (
                        <View
                          key={`${role.id}_${idx}`}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <Text
                            style={{ color: colors.textTertiary, fontSize: 18 }}
                          >
                            •
                          </Text>
                          <TextInput
                            value={b}
                            onChangeText={(t) => updateBullet(role.id, idx, t)}
                            placeholder="Did X using Y → result Z"
                            placeholderTextColor={colors.textTertiary}
                            style={[
                              styles.input,
                              {
                                flex: 1,
                                color: colors.text,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                              },
                            ]}
                          />
                          <Pressable
                            onPress={() => removeBullet(role.id, idx)}
                            hitSlop={10}
                          >
                            <Text
                              style={{
                                color: colors.textTertiary,
                                fontWeight: "900",
                              }}
                            >
                              ✕
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ))
                )}
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
              <Pressable
                onPress={onSave}
                disabled={saving}
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
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  colors: any;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surfacePressed,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20 },
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
  saveBtnText: { fontWeight: "900" },
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  section: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "900" },
  addPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  expCard: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  smallBtnDanger: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
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

const previewStyles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 60 },
  header: { alignItems: "center", marginBottom: 20, paddingBottom: 16 },
  name: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
  },
  contact: { fontSize: 12 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingBottom: 6,
    marginBottom: 10,
    borderBottomWidth: 1.5,
  },
  body: { fontSize: 13, lineHeight: 20 },
  roleBlock: { marginBottom: 12 },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  roleDates: { fontSize: 11 },
  roleCompany: { fontSize: 12, marginTop: 1, marginBottom: 4 },
  bulletRow: { flexDirection: "row", gap: 6, marginTop: 3 },
  bulletDot: { fontSize: 12, marginTop: 1 },
  bulletText: { fontSize: 12, lineHeight: 18, flex: 1 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skillText: { fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 60, fontSize: 14 },
});
