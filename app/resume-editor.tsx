// app/resume-editor.tsx
//
// FULL Resume Editor screen (Expo Router) with:
// ✅ Close (X) button — rendered IN layout (always visible)
// ✅ Upload PDF/DOCX that auto-saves (creates/updates) and returns to Resumes
// ✅ Manual edit fields
// ✅ Header "Save" button
// ✅ Sticky bottom "Submit" button (always visible)
// ✅ Uses your DataProvider: resumes, addResume, updateResume

import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FileText, Upload, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Resume } from "@/types";

type ResumeDraft = {
  id?: string;
  title: string;

  uploadedFile?: {
    name: string;
    uri: string;
    mimeType?: string;
    size?: number;
  } | null;

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

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function stripExt(name: string) {
  return name.replace(/\.(pdf|docx|doc)$/i, "");
}

export default function ResumeEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const params = useLocalSearchParams<{ id?: string }>();
  const resumeId = typeof params.id === "string" ? params.id : undefined;
  const isEditing = Boolean(resumeId);

  const data = useData();
  const { resumes, addResume, updateResume } = data;

  type Data = ReturnType<typeof useData>;
  type AddResumeInput = Parameters<Data["addResume"]>[0];
  type UpdateResumeInput = Parameters<Data["updateResume"]>[1];

  const existingResume: Resume | undefined = useMemo(() => {
    if (!resumeId) return undefined;
    return resumes.find((r) => r.id === resumeId);
  }, [resumeId, resumes]);

  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<ResumeDraft>(() => ({
    title: "Untitled Resume",
    uploadedFile: null,
    skills: [],
    experience: [],
  }));

  useEffect(() => {
    if (!isEditing) return;

    if (!existingResume) {
      Alert.alert("Not found", "That resume could not be loaded.");
      router.back();
      return;
    }

    setDraft({
      id: existingResume.id,
      title: (existingResume as any).title ?? "Untitled Resume",
      folder: (existingResume as any).folder,
      uploadedFile: (existingResume as any).uploadedFile ?? null,
      fullName: (existingResume as any).fullName ?? "",
      email: (existingResume as any).email ?? "",
      phone: (existingResume as any).phone ?? "",
      location: (existingResume as any).location ?? "",
      summary: (existingResume as any).summary ?? "",
      skills: Array.isArray((existingResume as any).skills)
        ? (existingResume as any).skills
        : [],
      experience: Array.isArray((existingResume as any).experience)
        ? (existingResume as any).experience
        : [],
    });
  }, [isEditing, existingResume, router]);

  const setField = useCallback(
    <K extends keyof ResumeDraft>(key: K, value: ResumeDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const pickFileAndAutoSave = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;

      const uploadedFile = {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      };

      const autoTitle =
        stripExt(file.name || "Uploaded Resume").trim() || "Uploaded Resume";

      setSaving(true);

      if (isEditing && draft.id) {
        const nextTitle = draft.title?.trim() ? draft.title.trim() : autoTitle;
        const payload: UpdateResumeInput = {
          ...(draft as any),
          title: nextTitle,
          uploadedFile,
        };
        await updateResume(draft.id, payload);
      } else {
        const payload: AddResumeInput = {
          title: autoTitle,
          uploadedFile,
        } as any;
        await addResume(payload);
      }

      setSaving(false);
      router.back();
    } catch (e: any) {
      setSaving(false);
      Alert.alert("Upload failed", e?.message ?? "Could not pick a document.");
    }
  }, [addResume, updateResume, router, isEditing, draft]);

  const onSave = useCallback(async () => {
    try {
      const title = draft.title.trim();
      if (!title) {
        Alert.alert("Missing title", "Please name your resume.");
        return;
      }

      setSaving(true);

      const payloadBase = {
        title,
        folder: draft.folder,
        uploadedFile: draft.uploadedFile ?? undefined,
        fullName: draft.fullName ?? "",
        email: draft.email ?? "",
        phone: draft.phone ?? "",
        location: draft.location ?? "",
        summary: draft.summary ?? "",
        skills: draft.skills,
        experience: draft.experience,
      };

      if (isEditing && draft.id) {
        await updateResume(
          draft.id,
          payloadBase as unknown as UpdateResumeInput,
        );
      } else {
        await addResume(payloadBase as unknown as AddResumeInput);
      }

      router.back();
    } catch (e: any) {
      Alert.alert("Submit failed", e?.message ?? "Could not save your resume.");
    } finally {
      setSaving(false);
    }
  }, [addResume, updateResume, draft, isEditing, router]);

  // Skills
  const [skillInput, setSkillInput] = useState("");
  const addSkill = useCallback(() => {
    const raw = skillInput.trim();
    if (!raw) return;
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setDraft((prev) => {
      const existing = new Set(prev.skills.map((s) => s.toLowerCase()));
      const next = [...prev.skills];
      for (const p of parts) {
        if (!existing.has(p.toLowerCase())) next.push(p);
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

  // Experience
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
          const bullets = [...(r.bullets ?? [])];
          bullets[idx] = value;
          return { ...r, bullets };
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
        const bullets = [...(r.bullets ?? [])];
        bullets.splice(idx, 1);
        if (bullets.length === 0) bullets.push("");
        return { ...r, bullets };
      }),
    }));
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Hide any native header — we draw our own */}
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

        {/* Save button top-right */}
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
            {/* Title */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.label, { color: colors.textTertiary }]}>
                Resume Title
              </Text>
              <TextInput
                value={draft.title}
                onChangeText={(t) => setField("title", t)}
                placeholder="e.g., Web Designer / Developer Resume"
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

            {/* Upload */}
            <Pressable
              onPress={pickFileAndAutoSave}
              disabled={saving}
              style={[
                styles.upload,
                {
                  borderColor: colors.accent + "80",
                  backgroundColor: colors.accent + "12",
                  opacity: saving ? 0.7 : 1,
                },
              ]}
            >
              {draft.uploadedFile ? (
                <Upload color={colors.accent} size={18} />
              ) : (
                <FileText color={colors.accent} size={18} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadTitle, { color: colors.text }]}>
                  Upload PDF or DOCX
                </Text>
                <Text
                  style={[styles.uploadSub, { color: colors.textTertiary }]}
                  numberOfLines={1}
                >
                  Pick a file → saved immediately → back to Resumes
                </Text>
              </View>
            </Pressable>

            {/* Details */}
            <View
              style={[
                styles.section,
                { borderColor: colors.border, backgroundColor: colors.surface },
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
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Skills
              </Text>
              <View
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <TextInput
                  value={skillInput}
                  onChangeText={setSkillInput}
                  placeholder="React, Tailwind, Accessibility…"
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
                { borderColor: colors.border, backgroundColor: colors.surface },
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

          {/* Sticky Submit bar */}
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

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },

  label: { fontSize: 12, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  textArea: { minHeight: 110, textAlignVertical: "top" },

  upload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  uploadTitle: { fontSize: 14, fontWeight: "800" as const },
  uploadSub: { fontSize: 12, marginTop: 2 },

  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900" as const },

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

  expCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },

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

  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveBtnText: { fontWeight: "900" as const },

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
