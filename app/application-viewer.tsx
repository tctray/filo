// app/application-viewer.tsx
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { ApplicationStatus } from "@/types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  MapPin,
  Pencil,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useMemo } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatSalary(min?: string, max?: string, type?: string) {
  if (!min && !max) return null;
  const fmt = (v: string) =>
    Number(v).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  const range = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt(min || max!);
  return `${range}${type === "hourly" ? "/hr" : "/yr"}`;
}

// ── Section wrapper ──
function Section({
  icon,
  label,
  colors,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

// ── Field row ──
function Field({
  label,
  value,
  colors,
  accent,
}: {
  label: string;
  value?: string | null;
  colors: any;
  accent?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.fieldValue,
          { color: accent ? colors.accent : colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ApplicationViewerScreen() {
  const { colors } = useTheme();
  const { applications, resumes, coverLetters } = useData();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const app = useMemo(
    () => applications.find((a) => a.id === id),
    [applications, id],
  );
  const ex = app as any;

  const resume = useMemo(
    () => resumes.find((r) => r.id === ex?.resumeId),
    [resumes, ex?.resumeId],
  );
  const coverLetter = useMemo(
    () => coverLetters.find((c) => c.id === ex?.coverLetterId),
    [coverLetters, ex?.coverLetterId],
  );

  const statusColor = (status: ApplicationStatus) => {
    const map: Record<ApplicationStatus, string> = {
      Saved: colors.statusSaved,
      Applied: colors.statusApplied,
      Interview: colors.statusInterview,
      Offer: colors.statusOffer,
      Rejected: colors.statusRejected,
    };
    return map[status];
  };

  if (!app) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Application not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const salary = formatSalary(ex?.salaryMin, ex?.salaryMax, ex?.salaryType);

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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.iconBtn}
        >
          <X color={colors.text} size={22} />
        </TouchableOpacity>

        <Text
          style={[styles.topBarTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {app.roleTitle}
        </Text>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/application-editor" as never,
              params: { id: app.id },
            })
          }
          style={[
            styles.editBtn,
            {
              backgroundColor: colors.accent + "1A",
              borderColor: colors.accent + "80",
            },
          ]}
        >
          <Pencil color={colors.accent} size={14} />
          <Text style={[styles.editBtnText, { color: colors.accent }]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>

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
          <View
            style={[
              styles.heroAvatar,
              { backgroundColor: colors.accent + "20" },
            ]}
          >
            <Text style={[styles.heroInitial, { color: colors.accent }]}>
              {app.company.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.heroInfo}>
            <Text style={[styles.heroCompany, { color: colors.text }]}>
              {app.company}
            </Text>
            <Text style={[styles.heroRole, { color: colors.textSecondary }]}>
              {app.roleTitle}
            </Text>
            {app.location ? (
              <View style={styles.heroLocation}>
                <MapPin size={12} color={colors.textTertiary} />
                <Text
                  style={[
                    styles.heroLocationText,
                    { color: colors.textTertiary },
                  ]}
                >
                  {app.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor(app.status) + "20",
                borderColor: statusColor(app.status) + "60",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor(app.status) },
              ]}
            />
            <Text
              style={[styles.statusText, { color: statusColor(app.status) }]}
            >
              {app.status}
            </Text>
          </View>
        </View>

        {/* Job Details */}
        <Section
          icon={<Briefcase color={colors.accent} size={14} />}
          label="Job Details"
          colors={colors}
        >
          <Field label="Company" value={app.company} colors={colors} />
          <Field label="Role" value={app.roleTitle} colors={colors} />
          <Field label="Location" value={app.location} colors={colors} />
          <Field
            label="Work Type"
            value={
              ex?.workType
                ? ex.workType.charAt(0).toUpperCase() + ex.workType.slice(1)
                : null
            }
            colors={colors}
          />
          {ex?.jobUrl ? (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Job URL
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(ex.jobUrl)}
                style={styles.linkRow}
              >
                <Text
                  style={[styles.fieldValue, { color: colors.accent }]}
                  numberOfLines={1}
                >
                  {ex.jobUrl}
                </Text>
                <ExternalLink size={12} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ) : null}
        </Section>

        {/* Compensation */}
        {salary ? (
          <Section
            icon={<DollarSign color={colors.accent} size={14} />}
            label="Compensation"
            colors={colors}
          >
            <Field label="Salary" value={salary} colors={colors} accent />
          </Section>
        ) : null}

        {/* Company Info */}
        {ex?.companySize || ex?.hiringManager ? (
          <Section
            icon={<Building2 color={colors.accent} size={14} />}
            label="Company Info"
            colors={colors}
          >
            <Field
              label="Company Size"
              value={ex?.companySize}
              colors={colors}
            />
            <Field
              label="Hiring Manager"
              value={ex?.hiringManager}
              colors={colors}
            />
          </Section>
        ) : null}

        {/* Referral */}
        {ex?.referral ? (
          <Section
            icon={<Users color={colors.accent} size={14} />}
            label="Referral"
            colors={colors}
          >
            <Field label="Referred By" value={ex.referral} colors={colors} />
          </Section>
        ) : null}

        {/* Dates */}
        {app.dateApplied ||
        ex?.interviewDate ||
        app.followUpDate ||
        ex?.deadline ? (
          <Section
            icon={<Calendar color={colors.accent} size={14} />}
            label="Dates"
            colors={colors}
          >
            <Field
              label="Applied"
              value={formatDate(app.dateApplied)}
              colors={colors}
            />
            <Field
              label="Interview"
              value={formatDate(ex?.interviewDate)}
              colors={colors}
            />
            <Field
              label="Follow-up"
              value={formatDate(app.followUpDate)}
              colors={colors}
            />
            <Field
              label="Deadline"
              value={formatDate(ex?.deadline)}
              colors={colors}
            />
          </Section>
        ) : null}

        {/* Linked Documents */}
        {resume || coverLetter ? (
          <Section
            icon={<FileText color={colors.accent} size={14} />}
            label="Linked Documents"
            colors={colors}
          >
            {resume ? (
              <View style={styles.field}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textTertiary }]}
                >
                  Resume
                </Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {resume.title}
                </Text>
              </View>
            ) : null}
            {coverLetter ? (
              <View style={styles.field}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textTertiary }]}
                >
                  Cover Letter
                </Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {coverLetter.title}
                </Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {/* Job Description */}
        {ex?.jobDescription ? (
          <Section
            icon={<Globe color={colors.accent} size={14} />}
            label="Job Description"
            colors={colors}
          >
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {ex.jobDescription}
            </Text>
          </Section>
        ) : null}

        {/* Notes */}
        {app.notes ? (
          <Section
            icon={<User color={colors.accent} size={14} />}
            label="Notes"
            colors={colors}
          >
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {app.notes}
            </Text>
          </Section>
        ) : null}

        {/* Bottom edit button */}
        <TouchableOpacity
          style={[styles.bottomEdit, { backgroundColor: colors.accent }]}
          onPress={() =>
            router.push({
              pathname: "/application-editor" as never,
              params: { id: app.id },
            })
          }
          activeOpacity={0.85}
        >
          <Pencil color={colors.accentText ?? "#fff"} size={16} />
          <Text
            style={[
              styles.bottomEditText,
              { color: colors.accentText ?? "#fff" },
            ]}
          >
            Edit Application
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 60 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 13, fontWeight: "700" },

  // Hero card
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInitial: { fontSize: 22, fontWeight: "800" },
  heroInfo: { flex: 1 },
  heroCompany: { fontSize: 17, fontWeight: "700" },
  heroRole: { fontSize: 13, marginTop: 2 },
  heroLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  heroLocationText: { fontSize: 12 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },

  // Sections
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Fields
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: "500", marginBottom: 3 },
  fieldValue: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  bodyText: { fontSize: 14, lineHeight: 22 },

  bottomEdit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 8,
  },
  bottomEditText: { fontSize: 15, fontWeight: "700" },

  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 15 },
});
