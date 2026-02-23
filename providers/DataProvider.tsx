import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Application,
  CoverLetter,
  Folder,
  Resume
} from "@/types";

const STORAGE_KEY = "filo:data:v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowIso() {
  return new Date().toISOString();
}

type DataContextValue = {
  resumes: Resume[];
  coverLetters: CoverLetter[];
  applications: Application[];
  folders: Folder[];

  // Resumes
  addResume: (
    data: Omit<Resume, "id" | "createdAt" | "updatedAt">,
  ) => Promise<string>;
  updateResume: (
    id: string,
    patch: Partial<Omit<Resume, "id">>,
  ) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  duplicateResume: (id: string) => Promise<void>;
  renameResume: (id: string, title: string) => Promise<void>;
  moveResumeToFolder: (id: string, folderId?: string) => Promise<void>;

  // Cover letters
  addCoverLetter: (
    data: Omit<CoverLetter, "id" | "createdAt" | "updatedAt">,
  ) => Promise<string>;
  updateCoverLetter: (
    id: string,
    patch: Partial<Omit<CoverLetter, "id">>,
  ) => Promise<void>;
  deleteCoverLetter: (id: string) => Promise<void>;
  duplicateCoverLetter: (id: string) => Promise<void>;
  renameCoverLetter: (id: string, title: string) => Promise<void>;
  moveCoverLetterToFolder: (id: string, folderId?: string) => Promise<void>;

  // Applications
  addApplication: (
    data: Omit<Application, "id" | "createdAt" | "updatedAt">,
  ) => Promise<string>;
  updateApplication: (
    id: string,
    patch: Partial<Omit<Application, "id">>,
  ) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;

  // Folders
  addFolder: (name: string, color: string) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // ---- hydrate ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          resumes?: Resume[];
          coverLetters?: CoverLetter[];
          applications?: Application[];
          folders?: Folder[];
        };
        setResumes(parsed.resumes ?? []);
        setCoverLetters(parsed.coverLetters ?? []);
        setApplications(parsed.applications ?? []);
        setFolders(parsed.folders ?? []);
      } catch (e) {
        console.log("[DataProvider] hydrate error", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ---- persist ----
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        const payload = JSON.stringify({
          resumes,
          coverLetters,
          applications,
          folders,
        });
        await AsyncStorage.setItem(STORAGE_KEY, payload);
      } catch (e) {
        console.log("[DataProvider] persist error", e);
      }
    })();
  }, [hydrated, resumes, coverLetters, applications, folders]);

  // ---------------- RESUMES ----------------
  const addResume: DataContextValue["addResume"] = async (data) => {
    const id = uid();
    const item: Resume = {
      ...data,
      id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setResumes((prev) => [item, ...prev]);
    return id;
  };

  const updateResume: DataContextValue["updateResume"] = async (id, patch) => {
    setResumes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r,
      ),
    );
  };

  const deleteResume: DataContextValue["deleteResume"] = async (id) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const duplicateResume: DataContextValue["duplicateResume"] = async (id) => {
    setResumes((prev) => {
      const src = prev.find((r) => r.id === id);
      if (!src) return prev;
      const copy: Resume = {
        ...src,
        id: uid(),
        title: `${(src as any).title ?? "Resume"} (Copy)`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      return [copy, ...prev];
    });
  };

  const renameResume: DataContextValue["renameResume"] = async (id, title) => {
    await updateResume(id, { title } as any);
  };

  const moveResumeToFolder: DataContextValue["moveResumeToFolder"] = async (
    id,
    folderId,
  ) => {
    await updateResume(id, { folder: folderId } as any);
  };

  // ---------------- COVER LETTERS ----------------
  const addCoverLetter: DataContextValue["addCoverLetter"] = async (data) => {
    const id = uid();
    const item: CoverLetter = {
      ...data,
      id,
      // These are REQUIRED by your types (per screenshot)
      hiringManager: (data as any).hiringManager ?? "",
      body: (data as any).body ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setCoverLetters((prev) => [item, ...prev]);
    return id;
  };

  const updateCoverLetter: DataContextValue["updateCoverLetter"] = async (
    id,
    patch,
  ) => {
    setCoverLetters((prev) =>
      prev.map((cl) =>
        cl.id === id ? { ...cl, ...patch, updatedAt: nowIso() } : cl,
      ),
    );
  };

  const deleteCoverLetter: DataContextValue["deleteCoverLetter"] = async (
    id,
  ) => {
    setCoverLetters((prev) => prev.filter((cl) => cl.id !== id));
  };

  const duplicateCoverLetter: DataContextValue["duplicateCoverLetter"] = async (
    id,
  ) => {
    setCoverLetters((prev) => {
      const src = prev.find((cl) => cl.id === id);
      if (!src) return prev;
      const copy: CoverLetter = {
        ...src,
        id: uid(),
        title: `${src.title ?? "Cover Letter"} (Copy)`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      return [copy, ...prev];
    });
  };

  const renameCoverLetter: DataContextValue["renameCoverLetter"] = async (
    id,
    title,
  ) => {
    await updateCoverLetter(id, { title } as any);
  };

  const moveCoverLetterToFolder: DataContextValue["moveCoverLetterToFolder"] =
    async (id, folderId) => {
      await updateCoverLetter(id, { folder: folderId } as any);
    };

  // ---------------- APPLICATIONS ----------------
  const addApplication: DataContextValue["addApplication"] = async (data) => {
    const id = uid();
    const item: Application = {
      ...data,
      id,
      // REQUIRED by your types (per screenshot)
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setApplications((prev) => [item, ...prev]);
    return id;
  };

  const updateApplication: DataContextValue["updateApplication"] = async (
    id,
    patch,
  ) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a,
      ),
    );
  };

  const deleteApplication: DataContextValue["deleteApplication"] = async (
    id,
  ) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  // ---------------- FOLDERS ----------------
  const addFolder: DataContextValue["addFolder"] = async (name, color) => {
    const id = uid();
    const folder: Folder = {
      id,
      name,
      color,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as Folder;
    setFolders((prev) => [folder, ...prev]);
    return id;
  };

  const renameFolder: DataContextValue["renameFolder"] = async (id, name) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === id ? ({ ...f, name, updatedAt: nowIso() } as Folder) : f,
      ),
    );
  };

  const deleteFolder: DataContextValue["deleteFolder"] = async (id) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));

    // Unassign items from deleted folder
    setResumes((prev) =>
      prev.map((r) =>
        (r as any).folder === id ? ({ ...r, folder: undefined } as any) : r,
      ),
    );
    setCoverLetters((prev) =>
      prev.map((cl) =>
        cl.folder === id ? ({ ...cl, folder: undefined } as any) : cl,
      ),
    );
  };

  const value = useMemo<DataContextValue>(
    () => ({
      resumes,
      coverLetters,
      applications,
      folders,

      addResume,
      updateResume,
      deleteResume,
      duplicateResume,
      renameResume,
      moveResumeToFolder,

      addCoverLetter,
      updateCoverLetter,
      deleteCoverLetter,
      duplicateCoverLetter,
      renameCoverLetter,
      moveCoverLetterToFolder,

      addApplication,
      updateApplication,
      deleteApplication,

      addFolder,
      renameFolder,
      deleteFolder,
    }),
    [resumes, coverLetters, applications, folders],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
