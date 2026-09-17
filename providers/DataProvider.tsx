// providers/DataProvider.tsx
//
// Strategy:
//   - If a Supabase session exists → read/write Supabase (source of truth)
//   - Always mirror to AsyncStorage for instant local reads & offline fallback
//   - On first load with a session, fetch from Supabase and hydrate state
//   - All mutations are optimistic: update state immediately, then sync to Supabase

import { supabase } from "@/lib/supabase";
import type { Application, CoverLetter, Folder, Job, Resume } from "@/types";
import {
  ensureAndroidChannel,
  requestNotificationPermissions,
} from "@/utils/notifications";
import {
  cancelJobReminders,
  scheduleJobReminders,
  type JobReminderIds,
} from "@/utils/scheduleJobReminders";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────
// AsyncStorage Keys (local cache / offline)
// ─────────────────────────────────────────────
const KEY_JOBS = "filo_jobs_v1";
const KEY_APPS = "filo_applications_v1";
const KEY_RESUMES = "filo_resumes_v1";
const KEY_COVERLETTERS = "filo_coverletters_v1";
const KEY_FOLDERS = "filo_folders_v1";
const KEY_RECENTS = "filo_recent_jobs_v1";
const KEY_SETTINGS = "filo_settings_v1";

const MAX_RECENTS = 12;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function uid() {
  return uuidv4();
}

function nowIso() {
  return new Date().toISOString();
}

function isUuid(v?: string | null) {
  return (
    !!v &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    )
  );
}

function ensureUuid<T extends { id?: string }>(item: T): T & { id: string } {
  if (isUuid(item.id)) return item as T & { id: string };
  return { ...item, id: uid() };
}

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return (JSON.parse(raw) ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function saveJSON<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function uniqById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((x) => x?.id && !seen.has(x.id) && seen.add(x.id));
}

// ─────────────────────────────────────────────
// Notification helpers
// ─────────────────────────────────────────────
function getReminderIds(job: Job): JobReminderIds {
  const j = job as any;
  return {
    followUpId: j._followUpNotifId,
    interviewId: j._interviewNotifId,
    deadlineId: j._deadlineNotifId,
  };
}

function embedReminderIds(job: Job, ids: JobReminderIds): Job {
  return {
    ...job,
    _followUpNotifId: ids.followUpId,
    _interviewNotifId: ids.interviewId,
    _deadlineNotifId: ids.deadlineId,
  } as any;
}

// ─────────────────────────────────────────────
// Supabase field mappers
// Maps between camelCase app types ↔ snake_case DB columns
// ─────────────────────────────────────────────
function resumeToRow(r: Resume, userId: string) {
  const h = (r.header ?? {}) as any;

  return {
    id: r.id,
    user_id: userId,
    title: r.title ?? "Untitled Resume",
    full_name: h.name ?? r.fullName ?? null,
    email: h.email ?? null,
    phone: h.phone ?? null,
    location: h.location ?? null,
    summary: r.summary ?? null,
    skills: r.skills ?? [],
    experience: r.experience ?? [],
    education: r.education ?? [],
    certifications: r.certifications ?? [],
    projects: r.projects ?? [],
    updated_at: r.updatedAt ?? nowIso(),
  };
}

function rowToResume(row: any): Resume {
  return {
    id: row.id,
    title: row.title,
    fullName: row.full_name,
    summary: row.summary,
    skills: row.skills ?? [],
    experience: row.experience ?? [],
    education: row.education ?? [],
    certifications: row.certifications ?? [],
    projects: row.projects ?? [],
    header: {
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      location: row.location,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any;
}

function coverLetterToRow(c: CoverLetter, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    title: c.title ?? "Untitled Letter",
    job_title: c.jobTitle ?? null,
    company: c.company ?? null,
    hiring_manager: c.hiringManager ?? null,
    tone: c.tone ?? null,
    body: c.body ?? null,
    updated_at: c.updatedAt ?? nowIso(),
  };
}

function rowToCoverLetter(row: any): CoverLetter {
  return {
    id: row.id,
    title: row.title,
    jobTitle: row.job_title,
    company: row.company,
    hiringManager: row.hiring_manager,
    tone: row.tone,
    body: row.body,
    applicationId: row.application_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any;
}

function applicationToRow(a: Application, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    company: a.company ?? "",
    job_title: a.roleTitle ?? "",
    location: a.location ?? null,
    work_type: a.workType ?? null,
    job_url: a.jobUrl ?? null,
    salary: [a.salaryMin, a.salaryMax].filter(Boolean).join(" – ") || null,
    status: a.status ?? "Saved",
    notes: a.notes ?? null,
    updated_at: a.updatedAt ?? nowIso(),
  };
}

function rowToApplication(row: any): Application {
  return {
    id: row.id,
    company: row.company,
    roleTitle: row.job_title,
    location: row.location,
    workType: row.work_type,
    jobUrl: row.job_url,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Application;
}

// ─────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────
type NewJobInput = Omit<Job, "id" | "createdAt" | "updatedAt">;

type DataContextValue = {
  jobs: Job[];
  addJob: { (job: Job): Promise<void>; (input: NewJobInput): Promise<void> };
  updateJob: {
    (job: Job): Promise<void>;
    (id: string, patch: Partial<Job>): Promise<void>;
  };
  deleteJob: (id: string) => Promise<void>;

  applications: Application[];
  addApplication: (data: Application) => Promise<void>;
  updateApplication: (data: Application) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;

  resumes: Resume[];
  addResume: (data: Resume) => Promise<void>;
  updateResume: (data: Resume) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  duplicateResume: {
    (id: string): Promise<void>;
    (id: string, folderId?: string): Promise<void>;
  };
  renameResume: (id: string, title: string) => Promise<void>;
  moveResumeToFolder: (id: string, folderId?: string) => Promise<void>;

  coverLetters: CoverLetter[];
  addCoverLetter: (data: CoverLetter) => Promise<void>;
  updateCoverLetter: (data: CoverLetter) => Promise<void>;
  deleteCoverLetter: (id: string) => Promise<void>;
  duplicateCoverLetter: {
    (id: string): Promise<void>;
    (id: string, folderId?: string): Promise<void>;
  };
  renameCoverLetter: (id: string, title: string) => Promise<void>;
  moveCoverLetterToFolder: (id: string, folderId?: string) => Promise<void>;

  folders: Folder[];
  addFolder: {
    (name: string, color: string): Promise<void>;
    (folder: Folder): Promise<void>;
  };

  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => void;

  recentJobs: Job[];
  recordRecentJob: (job: Job) => Promise<void>;
  clearRecent: () => Promise<void>;

  clearAllData: () => Promise<void>;
  isSyncing: boolean;
};

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [remindersEnabled, setRemindersEnabledState] = useState(true);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [recentsClearedAt, setRecentsClearedAt] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const userIdRef = useRef<string | null>(null);

  async function getCurrentUserId(): Promise<string | null> {
    if (userIdRef.current) return userIdRef.current;
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user?.id ?? null;
    userIdRef.current = id;
    return id;
  }

  useEffect(() => {
    (async () => {
      setIsSyncing(true);
      try {
        const userId = await getCurrentUserId();

        if (userId) {
          const [
            { data: sbResumes },
            { data: sbCoverLetters },
            { data: sbApplications },
          ] = await Promise.all([
            supabase
              .from("resumes")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false }),
            supabase
              .from("cover_letters")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false }),
            supabase
              .from("applications")
              .select("*")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false }),
          ]);

          const r = (sbResumes ?? []).map(rowToResume);
          const c = (sbCoverLetters ?? []).map(rowToCoverLetter);
          const a = (sbApplications ?? []).map(rowToApplication);

          setResumes(r);
          setCoverLetters(c);
          setApplications(a);

          await saveJSON(KEY_RESUMES, r);
          await saveJSON(KEY_COVERLETTERS, c);
          await saveJSON(KEY_APPS, a);
        } else {
          setResumes(await loadJSON(KEY_RESUMES, []));
          setCoverLetters(await loadJSON(KEY_COVERLETTERS, []));
          setApplications(await loadJSON(KEY_APPS, []));
        }

        setJobs(await loadJSON(KEY_JOBS, []));
        setFolders(await loadJSON(KEY_FOLDERS, []));
        setRecentJobs(await loadJSON(KEY_RECENTS, []));
        setRemindersEnabledState(await loadJSON(KEY_SETTINGS, true));

        await requestNotificationPermissions().catch(() => {});
        await ensureAndroidChannel().catch(() => {});
      } finally {
        setIsSyncing(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      userIdRef.current = null;

      if (event === "SIGNED_IN") {
        setIsSyncing(true);
        getCurrentUserId()
          .then(async (userId) => {
            if (!userId) return;
            const [
              { data: sbResumes },
              { data: sbCoverLetters },
              { data: sbApplications },
            ] = await Promise.all([
              supabase
                .from("resumes")
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false }),
              supabase
                .from("cover_letters")
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false }),
              supabase
                .from("applications")
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false }),
            ]);

            const r = (sbResumes ?? []).map(rowToResume);
            const c = (sbCoverLetters ?? []).map(rowToCoverLetter);
            const a = (sbApplications ?? []).map(rowToApplication);

            setResumes(r);
            setCoverLetters(c);
            setApplications(a);

            await saveJSON(KEY_RESUMES, r);
            await saveJSON(KEY_COVERLETTERS, c);
            await saveJSON(KEY_APPS, a);
          })
          .finally(() => setIsSyncing(false));
      }

      if (event === "SIGNED_OUT") {
        setResumes([]);
        setCoverLetters([]);
        setApplications([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => void saveJSON(KEY_JOBS, jobs), [jobs]);
  useEffect(() => void saveJSON(KEY_FOLDERS, folders), [folders]);
  useEffect(() => void saveJSON(KEY_RECENTS, recentJobs), [recentJobs]);
  useEffect(
    () => void saveJSON(KEY_SETTINGS, remindersEnabled),
    [remindersEnabled],
  );

  async function maybeSchedule(job: Job, previous?: Job): Promise<Job> {
    if (!remindersEnabled) return job;
    try {
      const prevIds = previous ? getReminderIds(previous) : {};
      const ids = await scheduleJobReminders(job as any, prevIds);
      return embedReminderIds(job, ids);
    } catch (e) {
      console.warn("[DataProvider] notification scheduling failed:", e);
      return job;
    }
  }

  async function setRemindersEnabled(enabled: boolean) {
    setRemindersEnabledState(enabled);
    await saveJSON(KEY_SETTINGS, enabled);
  }

  function addJob(job: Job): Promise<void>;
  function addJob(input: NewJobInput): Promise<void>;
  async function addJob(arg: Job | NewJobInput) {
    const now = nowIso();
    let job: Job =
      "id" in arg
        ? {
            ...(arg as Job),
            id: isUuid((arg as Job).id) ? (arg as Job).id : uid(),
            createdAt: (arg as Job).createdAt ?? now,
            updatedAt: now,
          }
        : {
            ...(arg as NewJobInput),
            id: uid(),
            createdAt: now,
            updatedAt: now,
          };

    job = await maybeSchedule(job);
    setJobs((prev) => [job, ...prev]);
  }

  function updateJob(job: Job): Promise<void>;
  function updateJob(id: string, patch: Partial<Job>): Promise<void>;
  async function updateJob(a: Job | string, b?: Partial<Job>) {
    const now = nowIso();

    if (typeof a === "object") {
      const incoming: Job = {
        ...a,
        id: isUuid(a.id) ? a.id : uid(),
        updatedAt: now,
      };
      setJobs((prev) => prev.map((j) => (j.id === incoming.id ? incoming : j)));
      const existing = jobs.find((j) => j.id === incoming.id);
      const withIds = await maybeSchedule(incoming, existing);
      setJobs((prev) => prev.map((j) => (j.id === withIds.id ? withIds : j)));
      return;
    }

    const id = a as string;
    const patch = b ?? {};
    const existing = jobs.find((j) => j.id === id);
    if (!existing) return;

    const updated: Job = { ...existing, ...patch, updatedAt: now };
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    const withIds = await maybeSchedule(updated, existing);
    setJobs((prev) => prev.map((j) => (j.id === id ? withIds : j)));
  }

  async function deleteJob(id: string) {
    const job = jobs.find((j) => j.id === id);
    if (job) await cancelJobReminders(getReminderIds(job)).catch(() => {});
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function addApplication(data: Application) {
    const fixed = ensureUuid(data);
    const next = uniqById([fixed, ...applications]);

    setApplications((prev) => uniqById([fixed, ...prev]));
    await saveJSON(KEY_APPS, next);

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("applications")
      .upsert(applicationToRow(fixed, userId), { onConflict: "id" });

    if (error) {
      console.warn("[DataProvider] addApplication sync failed:", error.message);
    }
  }

  async function updateApplication(data: Application) {
    const fixed = ensureUuid(data);

    setApplications((prev) => prev.map((x) => (x.id === fixed.id ? fixed : x)));
    await saveJSON(
      KEY_APPS,
      applications.map((x) => (x.id === fixed.id ? fixed : x)),
    );

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("applications")
      .upsert(applicationToRow(fixed, userId), { onConflict: "id" });

    if (error) {
      console.warn(
        "[DataProvider] updateApplication sync failed:",
        error.message,
      );
    }
  }

  async function deleteApplication(id: string) {
    if (!isUuid(id)) {
      console.warn("[DataProvider] deleteApplication skipped non-uuid id:", id);
      setApplications((prev) => prev.filter((x) => x.id !== id));
      await saveJSON(
        KEY_APPS,
        applications.filter((x) => x.id !== id),
      );
      return;
    }

    setApplications((prev) => prev.filter((x) => x.id !== id));
    await saveJSON(
      KEY_APPS,
      applications.filter((x) => x.id !== id),
    );

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.warn(
        "[DataProvider] deleteApplication sync failed:",
        error.message,
      );
    }
  }

  async function addResume(data: Resume) {
    const fixed = ensureUuid(data as Resume & { id?: string }) as Resume;
    const next = uniqById([fixed, ...resumes]);

    console.warn(
      "[addResume] incoming id =",
      (data as any).id,
      "fixed id =",
      fixed.id,
    );

    setResumes((prev) => uniqById([fixed, ...prev]));
    await saveJSON(KEY_RESUMES, next);

    const userId = await getCurrentUserId();
    console.log("[addResume] userId:", userId);
    console.log(
      "[addResume] session:",
      (await supabase.auth.getSession()).data.session?.user?.id,
    );

    if (!userId) return;

    const { error, data: inserted } = await supabase
      .from("resumes")
      .upsert(resumeToRow(fixed, userId), { onConflict: "id" })
      .select()
      .single();

    console.log("[addResume] inserted:", inserted, "error:", error);

    if (error) {
      console.warn("[DataProvider] addResume sync failed:", error.message);
    }
  }

  async function updateResume(data: Resume) {
    const fixed = ensureUuid(data as Resume & { id?: string }) as Resume;
    const next = resumes.map((x) => (x.id === fixed.id ? fixed : x));

    setResumes((prev) => prev.map((x) => (x.id === fixed.id ? fixed : x)));
    await saveJSON(KEY_RESUMES, next);

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("resumes")
      .upsert(resumeToRow(fixed, userId), { onConflict: "id" });

    if (error) {
      console.warn("[DataProvider] updateResume sync failed:", error.message);
    }
  }

  async function deleteResume(id: string) {
    const next = resumes.filter((x) => x.id !== id);
    setResumes(next);
    await saveJSON(KEY_RESUMES, next);

    if (!isUuid(id)) {
      console.warn("[DataProvider] deleteResume skipped non-uuid id:", id);
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.warn("[DataProvider] deleteResume sync failed:", error.message);
    }
  }

  function duplicateResume(id: string): Promise<void>;
  function duplicateResume(id: string, folderId?: string): Promise<void>;
  async function duplicateResume(id: string, folderId?: string) {
    const r = resumes.find((x) => x.id === id);
    if (!r) return;

    const copy = {
      ...r,
      id: uid(),
      title: `${r.title} Copy`,
      updatedAt: nowIso(),
    } as any;

    if (folderId !== undefined) copy.folder = folderId;
    await addResume(copy);
  }

  async function renameResume(id: string, title: string) {
    const r = resumes.find((x) => x.id === id);
    if (!r) return;
    await updateResume({ ...r, title, updatedAt: nowIso() } as Resume);
  }

  async function moveResumeToFolder(id: string, folderId?: string) {
    const r = resumes.find((x) => x.id === id);
    if (!r) return;
    await updateResume({ ...r, folder: folderId, updatedAt: nowIso() } as any);
  }

  async function addCoverLetter(data: CoverLetter) {
    const fixed = ensureUuid(
      data as CoverLetter & { id?: string },
    ) as CoverLetter;
    const next = uniqById([fixed, ...coverLetters]);

    console.warn(
      "[addCoverLetter] incoming id =",
      (data as any).id,
      "fixed id =",
      fixed.id,
    );

    setCoverLetters((prev) => uniqById([fixed, ...prev]));
    await saveJSON(KEY_COVERLETTERS, next);

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("cover_letters")
      .upsert(coverLetterToRow(fixed, userId), { onConflict: "id" });

    if (error) {
      console.warn("[DataProvider] addCoverLetter sync failed:", error.message);
    }
  }

  async function updateCoverLetter(data: CoverLetter) {
    const fixed = ensureUuid(
      data as CoverLetter & { id?: string },
    ) as CoverLetter;
    const next = coverLetters.map((x) => (x.id === fixed.id ? fixed : x));

    setCoverLetters((prev) => prev.map((x) => (x.id === fixed.id ? fixed : x)));
    await saveJSON(KEY_COVERLETTERS, next);

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("cover_letters")
      .upsert(coverLetterToRow(fixed, userId), { onConflict: "id" });

    if (error) {
      console.warn(
        "[DataProvider] updateCoverLetter sync failed:",
        error.message,
      );
    }
  }

  async function deleteCoverLetter(id: string) {
    const next = coverLetters.filter((x) => x.id !== id);
    setCoverLetters(next);
    await saveJSON(KEY_COVERLETTERS, next);

    if (!isUuid(id)) {
      console.warn("[DataProvider] deleteCoverLetter skipped non-uuid id:", id);
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("cover_letters")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.warn(
        "[DataProvider] deleteCoverLetter sync failed:",
        error.message,
      );
    }
  }

  function duplicateCoverLetter(id: string): Promise<void>;
  function duplicateCoverLetter(id: string, folderId?: string): Promise<void>;
  async function duplicateCoverLetter(id: string, folderId?: string) {
    const c = coverLetters.find((x) => x.id === id);
    if (!c) return;

    const copy = {
      ...c,
      id: uid(),
      title: `${c.title} Copy`,
      updatedAt: nowIso(),
    } as any;

    if (folderId !== undefined) copy.folder = folderId;
    await addCoverLetter(copy);
  }

  async function renameCoverLetter(id: string, title: string) {
    const c = coverLetters.find((x) => x.id === id);
    if (!c) return;
    await updateCoverLetter({
      ...c,
      title,
      updatedAt: nowIso(),
    } as CoverLetter);
  }

  async function moveCoverLetterToFolder(id: string, folderId?: string) {
    const c = coverLetters.find((x) => x.id === id);
    if (!c) return;
    await updateCoverLetter({
      ...c,
      folder: folderId,
      updatedAt: nowIso(),
    } as any);
  }

  function addFolder(name: string, color: string): Promise<void>;
  function addFolder(folder: Folder): Promise<void>;
  async function addFolder(a: string | Folder, b?: string) {
    const now = nowIso();

    if (typeof a === "object" && a?.id) {
      setFolders((prev) => [
        {
          ...a,
          id: isUuid(a.id) ? a.id : uid(),
          createdAt: a.createdAt ?? now,
          updatedAt: now,
        },
        ...prev,
      ]);
      return;
    }

    const name = String(a ?? "").trim();
    const color = String(b ?? "").trim();
    if (!name) return;

    setFolders((prev) => [
      {
        id: uid(),
        name,
        color: color || "#00C2A8",
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
  }

  async function recordRecentJob(job: Job) {
    if (!job?.id) return;
    if (Date.now() - recentsClearedAt < 400) return;
    setRecentJobs(
      (prev) => uniqById([job, ...prev]).slice(0, MAX_RECENTS) as Job[],
    );
  }

  async function clearRecent() {
    setRecentsClearedAt(Date.now());
    setRecentJobs([]);
    await AsyncStorage.removeItem(KEY_RECENTS).catch(() => {});
  }

  async function clearAllData() {
    const userId = await getCurrentUserId();

    setJobs([]);
    setApplications([]);
    setResumes([]);
    setCoverLetters([]);
    setFolders([]);
    setRecentJobs([]);

    await AsyncStorage.multiRemove([
      KEY_JOBS,
      KEY_APPS,
      KEY_RESUMES,
      KEY_COVERLETTERS,
      KEY_FOLDERS,
      KEY_RECENTS,
      KEY_SETTINGS,
      "filo:profile",
      "filo:defaultResumeId",
    ]).catch(() => {});

    await saveJSON(KEY_RESUMES, []);
    await saveJSON(KEY_COVERLETTERS, []);
    await saveJSON(KEY_APPS, []);
    await saveJSON(KEY_JOBS, []);
    await saveJSON(KEY_FOLDERS, []);
    await saveJSON(KEY_RECENTS, []);

    if (userId) {
      await Promise.all([
        supabase.from("resumes").delete().eq("user_id", userId),
        supabase.from("cover_letters").delete().eq("user_id", userId),
        supabase.from("applications").delete().eq("user_id", userId),
        supabase.from("reminders").delete().eq("user_id", userId),
      ]).catch(() => {});
    }
  }

  const value = useMemo<DataContextValue>(
    () => ({
      jobs,
      addJob,
      updateJob,
      deleteJob,
      applications,
      addApplication,
      updateApplication,
      deleteApplication,
      resumes,
      addResume,
      updateResume,
      deleteResume,
      duplicateResume,
      renameResume,
      moveResumeToFolder,
      coverLetters,
      addCoverLetter,
      updateCoverLetter,
      deleteCoverLetter,
      duplicateCoverLetter,
      renameCoverLetter,
      moveCoverLetterToFolder,
      folders,
      addFolder,
      remindersEnabled,
      setRemindersEnabled,
      recentJobs,
      recordRecentJob,
      clearRecent,
      clearAllData,
      isSyncing,
    }),
    [
      jobs,
      applications,
      resumes,
      coverLetters,
      folders,
      remindersEnabled,
      recentJobs,
      isSyncing,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
