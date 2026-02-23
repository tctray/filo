import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { CoverLetterTone, UploadedFile } from "@/types";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FileText, Upload, X } from "lucide-react-native";
import { useCallback, useState } from "react";
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

const TONES: { value: CoverLetterTone; label: string; desc: string }[] = [
  { value: "formal", label: "Formal", desc: "Professional and traditional" },
  {
    value: "confident",
    label: "Confident",
    desc: "Assertive and self-assured",
  },
  { value: "bold", label: "Bold", desc: "Direct and energetic" },
];

export default function CoverLetterEditorScreen() {
  const { colors } = useTheme();
  const { coverLetters, addCoverLetter, updateCoverLetter } = useData();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const existing = params.id
    ? coverLetters.find((c) => c.id === params.id)
    : undefined;

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(
    existing?.title ?? "Untitled Cover Letter",
  );
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle ?? "");
  const [company, setCompany] = useState(existing?.company ?? "");
  const [hiringManager, setHiringManager] = useState(
    existing?.hiringManager ?? "",
  );
  const [tone, setTone] = useState<CoverLetterTone>(existing?.tone ?? "formal");
  const [body, setBody] = useState(existing?.body ?? "");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | undefined>(
    existing?.uploadedFile,
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }
    try {
      setSaving(true);
      const data = {
        title,
        jobTitle,
        company,
        hiringManager,
        tone,
        body,
        uploadedFile,
      };
      if (existing) {
        await updateCoverLetter(existing.id, data);
      } else {
        await addCoverLetter(data);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [
    title,
    jobTitle,
    company,
    hiringManager,
    tone,
    body,
    uploadedFile,
    existing,
    updateCoverLetter,
    addCoverLetter,
    router,
  ]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? "application/pdf",
          size: asset.size,
        });
        if (title === "Untitled Cover Letter") {
          setTitle(asset.name.replace(/\.(pdf|docx)$/i, ""));
        }
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick file.");
    }
  }, [title]);

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
          {existing ? "Edit Cover Letter" : "New Cover Letter"}
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
            <TextInput
              style={[
                styles.titleInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Cover letter title"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            {uploadedFile && (
              <View
                style={[
                  styles.uploadedFileCard,
                  {
                    backgroundColor: colors.infoLight,
                    borderColor: colors.info + "30",
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.uploadedFileTappable}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/file-viewer" as any,
                      params: {
                        uri: uploadedFile.uri,
                        name: uploadedFile.name,
                        mimeType: uploadedFile.mimeType,
                        size: uploadedFile.size?.toString() ?? "",
                      },
                    })
                  }
                >
                  <View
                    style={[
                      styles.uploadedFileIcon,
                      { backgroundColor: colors.info + "20" },
                    ]}
                  >
                    {uploadedFile.mimeType.includes("pdf") ? (
                      <FileText color={colors.info} size={22} />
                    ) : (
                      <Upload color={colors.info} size={22} />
                    )}
                  </View>
                  <View style={styles.uploadedFileInfo}>
                    <Text
                      style={[styles.uploadedFileName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {uploadedFile.name}
                    </Text>
                    <Text
                      style={[
                        styles.uploadedFileMeta,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {uploadedFile.mimeType.includes("pdf") ? "PDF" : "DOCX"}
                      {uploadedFile.size
                        ? ` · ${(uploadedFile.size / 1024).toFixed(1)} KB`
                        : ""}
                      {" · Tap to view"}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setUploadedFile(undefined)}>
                  <X color={colors.textTertiary} size={16} />
                </TouchableOpacity>
              </View>
            )}

            {!uploadedFile && !existing && (
              <TouchableOpacity
                style={[styles.uploadBtn, { borderColor: colors.info }]}
                onPress={handlePickFile}
                activeOpacity={0.7}
              >
                <Upload color={colors.info} size={18} />
                <Text style={[styles.uploadBtnText, { color: colors.info }]}>
                  Upload PDF or DOCX
                </Text>
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Details
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
                placeholder="Job Title"
                placeholderTextColor={colors.textTertiary}
                value={jobTitle}
                onChangeText={setJobTitle}
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
                placeholder="Company / Organization"
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
                placeholder="Hiring Manager Name (optional)"
                placeholderTextColor={colors.textTertiary}
                value={hiringManager}
                onChangeText={setHiringManager}
              />
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Tone
              </Text>
              <View style={styles.toneRow}>
                {TONES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.toneOption,
                      {
                        borderColor:
                          tone === t.value ? colors.accent : colors.border,
                      },
                      tone === t.value && {
                        backgroundColor: colors.accentLight,
                      },
                    ]}
                    onPress={() => setTone(t.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toneLabel,
                        {
                          color: tone === t.value ? colors.accent : colors.text,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text
                      style={[styles.toneDesc, { color: colors.textTertiary }]}
                    >
                      {t.desc}
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
                Body
              </Text>
              <TextInput
                style={[
                  styles.bodyInput,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Write your cover letter here..."
                placeholderTextColor={colors.textTertiary}
                value={body}
                onChangeText={setBody}
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

  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 20,
  },
  uploadedFileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  uploadedFileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadedFileTappable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  uploadedFileInfo: { flex: 1 },
  uploadedFileName: { fontSize: 14, fontWeight: "500" },
  uploadedFileMeta: { fontSize: 12, marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  uploadBtnText: { fontSize: 14, fontWeight: "500" },
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
  toneRow: { gap: 8 },
  toneOption: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  toneLabel: { fontSize: 15, fontWeight: "600" },
  toneDesc: { fontSize: 12, marginTop: 2 },
  bodyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 240,
    lineHeight: 22,
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
