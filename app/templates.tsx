import { coverLetterTemplates, resumeTemplates } from "@/mocks/templates";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, FileText, Mail } from "lucide-react-native";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const { addResume, addCoverLetter } = useData();
  const router = useRouter();

  const handleUseResumeTemplate = async (idx: number) => {
    const template = resumeTemplates[idx];
    const created = await addResume({
      ...template,
      isDraft: true,
      title: `${template.title}`,
    });
    if (created) {
      Alert.alert(
        "Template Applied",
        `"${template.title}" has been created. You can now edit it.`,
        [
          {
            text: "Edit Now",
            onPress: () =>
              router.replace({
                pathname: "/resume-editor" as never,
                params: { id: created.id },
              }),
          },
          { text: "Later", style: "cancel", onPress: () => router.back() },
        ],
      );
    }
  };

  const handleUseCoverLetterTemplate = async (idx: number) => {
    const template = coverLetterTemplates[idx];
    const created = await addCoverLetter({
      ...template,
      title: `${template.title}`,
    });
    if (created) {
      Alert.alert(
        "Template Applied",
        `"${template.title}" has been created. You can now edit it.`,
        [
          {
            text: "Edit Now",
            onPress: () =>
              router.replace({
                pathname: "/cover-letter-editor" as never,
                params: { id: created.id },
              }),
          },
          { text: "Later", style: "cancel", onPress: () => router.back() },
        ],
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          Templates
        </Text>
        {/* Spacer to keep title centered */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Resume Templates
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Start with a pre-filled template and customize it to your needs
          </Text>

          {resumeTemplates.map((tmpl, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.templateCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleUseResumeTemplate(idx)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.templateIcon,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <FileText color={colors.accent} size={22} />
              </View>
              <View style={styles.templateInfo}>
                <Text style={[styles.templateTitle, { color: colors.text }]}>
                  {tmpl.title}
                </Text>
                <Text
                  style={[styles.templateMeta, { color: colors.textTertiary }]}
                >
                  {tmpl.experience.length} experience · {tmpl.skills.length}{" "}
                  skills
                  {tmpl.education.length > 0
                    ? ` · ${tmpl.education.length} education`
                    : ""}
                </Text>
              </View>
              <ArrowRight color={colors.textTertiary} size={18} />
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Cover Letter Templates
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Choose a tone and style that matches your personality
          </Text>

          {coverLetterTemplates.map((tmpl, idx) => {
            const toneColors: Record<string, string> = {
              formal: colors.info,
              confident: colors.warning,
              bold: colors.statusInterview,
            };
            const toneBgColors: Record<string, string> = {
              formal: colors.infoLight,
              confident: colors.warningLight,
              bold: colors.successLight,
            };
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.templateCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleUseCoverLetterTemplate(idx)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.templateIcon,
                    { backgroundColor: toneBgColors[tmpl.tone] },
                  ]}
                >
                  <Mail color={toneColors[tmpl.tone]} size={22} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateTitle, { color: colors.text }]}>
                    {tmpl.title}
                  </Text>
                  <Text
                    style={[
                      styles.templateMeta,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {tmpl.tone.charAt(0).toUpperCase() + tmpl.tone.slice(1)}{" "}
                    tone · {tmpl.company}
                  </Text>
                </View>
                <ArrowRight color={colors.textTertiary} size={18} />
              </TouchableOpacity>
            );
          })}

          <View style={styles.bottomPad} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Custom top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
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
  },

  scroll: {
    paddingVertical: 20,
  },
  // Centers content on wide screens, fills on phones
  inner: {
    paddingHorizontal: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },

  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  sectionDesc: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  templateInfo: { flex: 1 },
  templateTitle: { fontSize: 15, fontWeight: "600" },
  templateMeta: { fontSize: 12, marginTop: 2 },
  divider: { height: 32 },
  bottomPad: { height: 40 },
});
