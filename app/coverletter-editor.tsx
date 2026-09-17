// app/coverletter-editor.tsx
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FileText } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { coverLetterTemplates } from "@/constants/templates";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { extractTextFromFile } from "@/utils/parseDocument";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseCoverLetterText(text: string): {
  jobTitle?: string;
  company?: string;
  hiringManager?: string;
  body?: string;
} {
  const result: {
    jobTitle?: string;
    company?: string;
    hiringManager?: string;
    body?: string;
  } = {};

  const hiringMatch = text.match(
    /(?:dear|to:|attention:?)\s+([A-Za-z\s\.]+?)(?:,|\n|$)/i,
  );
  if (hiringMatch) {
    const raw = hiringMatch[1].trim();
    if (raw.toLowerCase() !== "hiring manager" && raw.length < 60)
      result.hiringManager = raw;
  }

  const companyMatch = text.match(
    /(?:at|to|joining|for)\s+([A-Z][A-Za-z0-9\s&,\.]+?)(?:\s+is|\s+as|\s+to|\s+and|\.|,|\n)/m,
  );
  if (companyMatch && companyMatch[1].trim().length < 60)
    result.company = companyMatch[1].trim();

  const titleMatch = text.match(
    /(?:position of|role of|applying for(?: the)?|interested in(?: the)?)\s+([A-Za-z][A-Za-z\s\/\-]+?)(?:\s+at|\s+role|\s+position|\.|,|\n)/i,
  );
  if (titleMatch && titleMatch[1].trim().length < 80)
    result.jobTitle = titleMatch[1].trim();

  result.body = text.trim().slice(0, 3000);
  return result;
}

export default function CoverLetterEditorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; templateId?: string }>();
  const { coverLetters, addCoverLetter, updateCoverLetter } = useData();

  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  const existing = useMemo(() => {
    if (!params.id) return null;
    return coverLetters.find((c) => c.id === params.id) ?? null;
  }, [params.id, coverLetters]);

  const initialValues = useMemo(() => {
    if (existing)
      return {
        title: existing.title ?? "",
        jobTitle: existing.jobTitle ?? "",
        company: existing.company ?? "",
        hiringManager: existing.hiringManager ?? "",
        body: existing.body ?? "",
        tone: existing.tone ?? "formal",
      };
    if (params.templateId) {
      const t = coverLetterTemplates.find(
        (x) => x.templateId === params.templateId,
      );
      if (t)
        return {
          title: t.title ?? "",
          jobTitle: t.jobTitle ?? "",
          company: t.company ?? "",
          hiringManager: t.hiringManager ?? "",
          body: t.body ?? "",
          tone: t.tone ?? "formal",
        };
    }
    return {
      title: "",
      jobTitle: "",
      company: "",
      hiringManager: "",
      body: "",
      tone: "formal" as const,
    };
  }, [existing?.id, params.templateId]);

  const [title, setTitle] = useState(initialValues.title);
  const [jobTitle, setJobTitle] = useState(initialValues.jobTitle);
  const [company, setCompany] = useState(initialValues.company);
  const [hiringManager, setHiringManager] = useState(
    initialValues.hiringManager,
  );
  const [body, setBody] = useState(initialValues.body);

  const prevIdRef = useRef(params.id);
  useEffect(() => {
    if (params.id && params.id !== prevIdRef.current) {
      prevIdRef.current = params.id;
      setTitle(existing?.title ?? "");
      setJobTitle(existing?.jobTitle ?? "");
      setCompany(existing?.company ?? "");
      setHiringManager(existing?.hiringManager ?? "");
      setBody(existing?.body ?? "");
    }
  }, [params.id, existing]);

  const handleUploadAndParse = async () => {
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
        Alert.alert(
          "Couldn't read file",
          "Try a PDF or DOCX with selectable text.",
        );
        return;
      }

      const data = parseCoverLetterText(text);
      if (data.company) setCompany(data.company);
      if (data.jobTitle) setJobTitle(data.jobTitle);
      if (data.hiringManager) setHiringManager(data.hiringManager);
      if (data.body) setBody(data.body);

      // Auto-set title from filename if empty
      if (!title.trim() && file.name)
        setTitle(file.name.replace(/\.(pdf|docx|doc|txt)$/i, "").trim());

      Alert.alert("Fields Filled", "Review and edit before saving.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Could not read the file.");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Title is required.");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (existing) {
        await updateCoverLetter({
          ...existing,
          title: title.trim(),
          jobTitle: jobTitle.trim() || undefined,
          company: company.trim() || undefined,
          hiringManager: hiringManager.trim() || "",
          body: body ?? "",
          updatedAt: now,
        });
      } else {
        await addCoverLetter({
          id: uid(),
          title: title.trim(),
          jobTitle: jobTitle.trim() || "",
          company: company.trim() || "",
          hiringManager: hiringManager.trim() || "",
          tone: initialValues.tone,
          body: body ?? "",
          createdAt: now,
          updatedAt: now,
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>
          {existing
            ? "Edit Letter"
            : params.templateId
              ? "From Template"
              : "New Letter"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.topBtn}
        >
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.accent }]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Upload to fill fields */}
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
                {parsing ? "Reading file…" : "Upload Cover Letter"}
              </Text>
              <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                Upload .rtf for best results
              </Text>
            </View>
          </Pressable>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Professional Cover Letter"
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Job Title
          </Text>
          <TextInput
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="e.g. Software Engineer"
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Company
          </Text>
          <TextInput
            value={company}
            onChangeText={setCompany}
            placeholder="e.g. Acme Corp"
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Hiring Manager
          </Text>
          <TextInput
            value={hiringManager}
            onChangeText={setHiringManager}
            placeholder="e.g. Hiring Manager"
            placeholderTextColor={colors.textTertiary}
            style={inputStyle}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Body
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your cover letter here..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[inputStyle, styles.textarea]}
          />

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
  topBtn: { width: 52, alignItems: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" },
  saveBtnText: { fontSize: 16, fontWeight: "700" },
  scroll: { padding: 18 },
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
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  textarea: { minHeight: 220, textAlignVertical: "top", paddingTop: 12 },
});
