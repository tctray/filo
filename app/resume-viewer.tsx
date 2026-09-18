// app/resume-viewer.tsx
import PdfAttachment from "@/components/PdfAttachment";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { jsPDF } from "jspdf";
import React, { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function buildResumeHtml(resume: any): string {
  const h = (resume.header ?? {}) as {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  const experience = resume.experience ?? [];
  const education = resume.education ?? [];
  const skills: string[] = resume.skills ?? [];
  const certifications = resume.certifications ?? [];
  const projects = resume.projects ?? [];
  const links: string[] = h.links ?? [];
  const contactParts = [h.email, h.phone, h.location, ...links]
    .filter(Boolean)
    .join("  ·  ");

  const expHtml = experience
    .map(
      (exp: any) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${exp.title ?? ""}</span>
        <span class="entry-dates">${[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}</span>
      </div>
      <div class="entry-sub">${exp.company ?? ""}</div>
      <ul>${(exp.bullets ?? [])
        .filter(Boolean)
        .map((b: string) => `<li>${b}</li>`)
        .join("")}</ul>
    </div>`,
    )
    .join("");

  const eduHtml = education
    .map(
      (edu: any) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${edu.institution ?? ""}</span>
        <span class="entry-dates">${[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}</span>
      </div>
      <div class="entry-sub">${[edu.degree, edu.field].filter(Boolean).join(", ")}</div>
    </div>`,
    )
    .join("");

  const certHtml = certifications
    .map(
      (c: any) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${c.name ?? ""}</span>
        <span class="entry-dates">${c.date ?? ""}</span>
      </div>
      ${c.issuer ? `<div class="entry-sub">${c.issuer}</div>` : ""}
    </div>`,
    )
    .join("");

  const projectHtml = projects
    .map(
      (p: any) => `
    <div class="entry">
      <div class="entry-title">${p.name ?? ""}</div>
      ${p.description ? `<div class="entry-sub">${p.description}</div>` : ""}
      ${
        (p.technologies ?? []).filter(Boolean).length > 0
          ? `<div class="skills-wrap">${p.technologies
              .filter(Boolean)
              .map((t: string) => `<span class="skill">${t}</span>`)
              .join("")}</div>`
          : ""
      }
    </div>`,
    )
    .join("");

  const skillsHtml =
    skills.filter(Boolean).length > 0
      ? `<div class="skills-wrap">${skills
          .filter(Boolean)
          .map((s) => `<span class="skill">${s}</span>`)
          .join("")}</div>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; color:#1a1a1a; padding:40px 48px; line-height:1.5; }
      h1 { font-size:22px; font-weight:800; letter-spacing:0.3px; text-align:center; }
      .contact { text-align:center; color:#555; font-size:10px; margin-top:4px; margin-bottom:24px; }
      .section { margin-bottom:18px; }
      .section-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.4px; color:#2563eb; border-bottom:1.5px solid #2563eb40; padding-bottom:4px; margin-bottom:10px; }
      .entry { margin-bottom:10px; }
      .entry-header { display:flex; justify-content:space-between; align-items:baseline; }
      .entry-title { font-size:12px; font-weight:700; }
      .entry-dates { font-size:10px; color:#777; }
      .entry-sub { font-size:11px; color:#444; font-weight:600; margin-top:1px; margin-bottom:4px; }
      ul { padding-left:16px; margin-top:4px; }
      li { margin-bottom:2px; font-size:11px; line-height:1.5; }
      .summary { font-size:11px; line-height:1.7; color:#333; }
      .skills-wrap { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
      .skill { background:#eff6ff; border:1px solid #bfdbfe; border-radius:20px; padding:2px 10px; font-size:10px; font-weight:600; color:#2563eb; }
    </style></head><body>
    <h1>${h.name || resume.title || "Resume"}</h1>
    ${contactParts ? `<div class="contact">${contactParts}</div>` : ""}
    ${resume.summary?.trim() ? `<div class="section"><div class="section-title">Summary</div><div class="summary">${resume.summary}</div></div>` : ""}
    ${skills.filter(Boolean).length > 0 ? `<div class="section"><div class="section-title">Skills</div>${skillsHtml}</div>` : ""}
    ${experience.length > 0 ? `<div class="section"><div class="section-title">Experience</div>${expHtml}</div>` : ""}
    ${education.length > 0 ? `<div class="section"><div class="section-title">Education</div>${eduHtml}</div>` : ""}
    ${certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div>${certHtml}</div>` : ""}
    ${projects.length > 0 ? `<div class="section"><div class="section-title">Projects</div>${projectHtml}</div>` : ""}
    </body></html>`;
}

// ─────────────────────────────────────────────
// Web-only PDF export (expo-print opens a print dialog on web instead
// of downloading a file, so we build a plain-text PDF client-side with
// jsPDF here). Native platforms keep using buildResumeHtml + expo-print
// + expo-sharing, untouched, below in handleExportPdf.
// ─────────────────────────────────────────────
function buildResumePdfText(resume: any): { title: string; text: string } {
  const h = (resume.header ?? {}) as {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  const experience = resume.experience ?? [];
  const education = resume.education ?? [];
  const skills: string[] = resume.skills ?? [];
  const certifications = resume.certifications ?? [];
  const projects = resume.projects ?? [];
  const links: string[] = h.links ?? [];

  const lines: string[] = [];
  const contactParts = [h.email, h.phone, h.location, ...links].filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join("  ·  "));
  lines.push("");

  if (resume.summary?.trim()) {
    lines.push("SUMMARY");
    lines.push(resume.summary.trim());
    lines.push("");
  }

  if (skills.filter(Boolean).length) {
    lines.push("SKILLS");
    lines.push(skills.filter(Boolean).join(", "));
    lines.push("");
  }

  if (experience.length) {
    lines.push("EXPERIENCE");
    for (const exp of experience) {
      const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
      lines.push(`${exp.title ?? ""}${dates ? "  (" + dates + ")" : ""}`);
      if (exp.company) lines.push(exp.company);
      for (const b of exp.bullets ?? []) {
        if (b) lines.push(`• ${b}`);
      }
      lines.push("");
    }
  }

  if (education.length) {
    lines.push("EDUCATION");
    for (const edu of education) {
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      lines.push(`${edu.institution ?? ""}${dates ? "  (" + dates + ")" : ""}`);
      const sub = [edu.degree, edu.field].filter(Boolean).join(", ");
      if (sub) lines.push(sub);
      lines.push("");
    }
  }

  if (certifications.length) {
    lines.push("CERTIFICATIONS");
    for (const c of certifications) {
      lines.push(`${c.name ?? ""}${c.date ? "  (" + c.date + ")" : ""}`);
      if (c.issuer) lines.push(c.issuer);
      lines.push("");
    }
  }

  if (projects.length) {
    lines.push("PROJECTS");
    for (const p of projects) {
      lines.push(p.name ?? "");
      if (p.description) lines.push(p.description);
      const tech = (p.technologies ?? []).filter(Boolean).join(", ");
      if (tech) lines.push(tech);
      lines.push("");
    }
  }

  return {
    title: h.name || resume.title || "Resume",
    text: lines.join("\n").trim(),
  };
}

function downloadResumePdfWeb(resume: any) {
  const { title, text } = buildResumePdfText(resume);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 54;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - marginX * 2;
  const lineHeight = 15;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(title, maxWidth);
  for (const line of titleLines) {
    doc.text(line, marginX, y);
    y += 22;
  }
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  for (const para of text.split("\n")) {
    if (para.trim() === "") {
      y += lineHeight * 0.6;
      continue;
    }
    const lines = doc.splitTextToSize(para, maxWidth);
    for (const line of lines) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 64;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  }

  const safeName = (title || "resume").replace(/[^\w\- ]+/g, "").trim();
  doc.save(`${safeName || "resume"}.pdf`);
}

function SectionBlock({
  title,
  colors,
  children,
}: {
  title: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View
        style={[
          styles.sectionHeader,
          { borderBottomColor: colors.accent + "60" },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Bullet({ text, colors }: { text: string; colors: any }) {
  if (!text?.trim()) return null;
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: colors.accent }]} />
      <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

function Chip({ text, colors }: { text: string; colors: any }) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.accent + "18",
          borderColor: colors.accent + "35",
        },
      ]}
    >
      <Text style={[styles.chipText, { color: colors.accent }]}>{text}</Text>
    </View>
  );
}

// ── Android-friendly action sheet ──
function ActionMenu({
  visible,
  onClose,
  onExport,
  onEdit,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onEdit: () => void;
  colors: any;
}) {
  if (!visible) return null;
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.menuCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onExport();
            }}
          >
            <Ionicons name="share-outline" size={18} color={colors.accent} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Export as PDF
            </Text>
          </TouchableOpacity>
          <View
            style={[styles.menuDivider, { backgroundColor: colors.border }]}
          />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onEdit();
            }}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Edit Resume
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function ResumeViewerScreen() {
  const { colors } = useTheme();
  const { resumes } = useData();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const resume = resumes.find((r) => r.id === id);
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!resume) return;
    try {
      setExporting(true);

      if (Platform.OS === "web") {
        downloadResumePdfWeb(resume);
        return;
      }

      const html = buildResumeHtml(resume);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing not available", `PDF saved to: ${uri}`);
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${resume.title ?? "Resume"}`,
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not generate PDF.");
    } finally {
      setExporting(false);
    }
  }, [resume]);

  const handleEdit = useCallback(() => {
    router.push({
      pathname: "/resume-editor",
      params: { id: resume?.id },
    } as never);
  }, [resume, router]);

  const handleMorePress = useCallback(() => {
    console.log("more pressed");
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Export as PDF", "Edit Resume"],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) handleExportPdf();
          if (idx === 2) handleEdit();
        },
      );
    } else {
      setMenuVisible(true);
    }
  }, [handleExportPdf, handleEdit]);

  if (!resume) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.notFound}>
          <Ionicons
            name="document-outline"
            size={40}
            color={colors.textTertiary}
          />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Resume not found
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.accent }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const h = (resume.header ?? {}) as {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  const links: string[] = h.links ?? [];
  const experience = resume.experience ?? [];
  const education = resume.education ?? [];
  const skills: string[] = resume.skills ?? [];
  const certifications = resume.certifications ?? [];
  const projects = resume.projects ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[styles.topTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {resume.title ?? "Resume"}
        </Text>
        <TouchableOpacity
          onPress={handleMorePress}
          disabled={exporting}
          style={styles.topBtn}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.text}
            />
          )}
        </TouchableOpacity>
      </View>

      <ActionMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onExport={handleExportPdf}
        onEdit={handleEdit}
        colors={colors}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.heroName, { color: colors.text }]}>
            {h.name || resume.title || "Untitled Resume"}
          </Text>
          <View style={styles.contactRow}>
            {h.email ? (
              <View style={styles.contactItem}>
                <Ionicons
                  name="mail-outline"
                  size={13}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.contactText, { color: colors.textSecondary }]}
                >
                  {h.email}
                </Text>
              </View>
            ) : null}
            {h.phone ? (
              <View style={styles.contactItem}>
                <Ionicons
                  name="call-outline"
                  size={13}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.contactText, { color: colors.textSecondary }]}
                >
                  {h.phone}
                </Text>
              </View>
            ) : null}
            {h.location ? (
              <View style={styles.contactItem}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.contactText, { color: colors.textSecondary }]}
                >
                  {h.location}
                </Text>
              </View>
            ) : null}
          </View>
          {links.length > 0 && (
            <View style={styles.linksRow}>
              {links.filter(Boolean).map((l, i) => (
                <View key={i} style={styles.contactItem}>
                  <Ionicons
                    name="link-outline"
                    size={13}
                    color={colors.accent}
                  />
                  <Text
                    style={[styles.contactText, { color: colors.accent }]}
                    numberOfLines={1}
                  >
                    {l}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {resume.summary?.trim() ? (
          <SectionBlock title="SUMMARY" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {resume.summary}
            </Text>
          </SectionBlock>
        ) : null}

        {skills.filter(Boolean).length > 0 ? (
          <SectionBlock title="SKILLS" colors={colors}>
            <View style={styles.chipWrap}>
              {skills.filter(Boolean).map((s, i) => (
                <Chip key={i} text={s} colors={colors} />
              ))}
            </View>
          </SectionBlock>
        ) : null}

        {experience.length > 0 ? (
          <SectionBlock title="EXPERIENCE" colors={colors}>
            {experience.map((exp: any, i: number) => (
              <View
                key={exp.id ?? i}
                style={[
                  styles.expItem,
                  i < experience.length - 1 && { marginBottom: 18 },
                ]}
              >
                <View style={styles.expHeader}>
                  <Text style={[styles.expTitle, { color: colors.text }]}>
                    {exp.title}
                  </Text>
                  <Text
                    style={[styles.expDates, { color: colors.textTertiary }]}
                  >
                    {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                <Text style={[styles.expCompany, { color: colors.accent }]}>
                  {exp.company}
                </Text>
                {(exp.bullets ?? [])
                  .filter(Boolean)
                  .map((b: string, j: number) => (
                    <Bullet key={j} text={b} colors={colors} />
                  ))}
              </View>
            ))}
          </SectionBlock>
        ) : null}

        {education.length > 0 ? (
          <SectionBlock title="EDUCATION" colors={colors}>
            {education.map((edu: any, i: number) => (
              <View
                key={edu.id ?? i}
                style={[
                  styles.expItem,
                  i < education.length - 1 && { marginBottom: 14 },
                ]}
              >
                <View style={styles.expHeader}>
                  <Text style={[styles.expTitle, { color: colors.text }]}>
                    {edu.institution}
                  </Text>
                  <Text
                    style={[styles.expDates, { color: colors.textTertiary }]}
                  >
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                <Text
                  style={[styles.expCompany, { color: colors.textSecondary }]}
                >
                  {[edu.degree, edu.field].filter(Boolean).join(", ")}
                </Text>
              </View>
            ))}
          </SectionBlock>
        ) : null}

        {certifications.length > 0 ? (
          <SectionBlock title="CERTIFICATIONS" colors={colors}>
            {certifications.map((c: any, i: number) => (
              <View key={c.id ?? i} style={styles.expItem}>
                <View style={styles.expHeader}>
                  <Text style={[styles.expTitle, { color: colors.text }]}>
                    {c.name}
                  </Text>
                  <Text
                    style={[styles.expDates, { color: colors.textTertiary }]}
                  >
                    {c.date}
                  </Text>
                </View>
                {c.issuer ? (
                  <Text
                    style={[styles.expCompany, { color: colors.textSecondary }]}
                  >
                    {c.issuer}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionBlock>
        ) : null}

        {projects.length > 0 ? (
          <SectionBlock title="PROJECTS" colors={colors}>
            {projects.map((p: any, i: number) => (
              <View
                key={p.id ?? i}
                style={[
                  styles.expItem,
                  i < projects.length - 1 && { marginBottom: 14 },
                ]}
              >
                <Text style={[styles.expTitle, { color: colors.text }]}>
                  {p.name}
                </Text>
                {p.description ? (
                  <Text
                    style={[
                      styles.bodyText,
                      { color: colors.textSecondary, marginTop: 4 },
                    ]}
                  >
                    {p.description}
                  </Text>
                ) : null}
                {(p.technologies ?? []).filter(Boolean).length > 0 ? (
                  <View style={[styles.chipWrap, { marginTop: 8 }]}>
                    {p.technologies
                      .filter(Boolean)
                      .map((t: string, j: number) => (
                        <Chip key={j} text={t} colors={colors} />
                      ))}
                  </View>
                ) : null}
              </View>
            ))}
          </SectionBlock>
        ) : null}

        {resume.uploadedFile ? (
          <SectionBlock title="UPLOADED FILE" colors={colors}>
            <PdfAttachment
              uri={resume.uploadedFile.uri}
              name={resume.uploadedFile.name}
            />
          </SectionBlock>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>
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
  topBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700" },
  scroll: { padding: 18 },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    alignItems: "center",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  contactText: { fontSize: 12 },
  section: { marginBottom: 20 },
  sectionHeader: { borderBottomWidth: 1, paddingBottom: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  expItem: { marginBottom: 4 },
  expHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  expTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  expDates: { fontSize: 12, marginLeft: 8 },
  expCompany: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 15, fontWeight: "600" },
  // Action menu (Android)
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  menuCard: {
    margin: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  menuItemText: { fontSize: 16, fontWeight: "600" },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 18 },
});
