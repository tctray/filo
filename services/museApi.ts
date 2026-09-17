// services/museApi.ts
// The Muse API integration for Filo

const BASE_URL = "https://www.themuse.com/api/public/";

const API_KEY =
  process.env.EXPO_PUBLIC_MUSE_API_KEY ??
  "815c97f41edd843b69239128e8dc93fafe28bfab1d902ea83a0e90356b6ea4ad";

export async function searchMuseJobs(query: string) {
  const url = `${BASE_URL}?page=1&search=${encodeURIComponent(query)}&api_key=${API_KEY}`;

  console.log("Muse request:", url);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Muse API error: ${res.status}`);
  }

  const data = await res.json();

  return data.results;
}
// ─── Types ────────────────────────────────────────────────────────────────────

export interface MuseJob {
  id: number;
  name: string;
  company: { id: number; name: string };
  locations: { name: string }[];
  categories: { name: string }[];
  levels: { name: string }[];
  publication_date: string;
  short_name: string;
  contents: string; // HTML job description
  refs: { landing_page: string };
}

export interface MuseCompany {
  id: number;
  name: string;
  short_name: string;
  description: string;
  industry: { name: string }[];
  size: { name: string };
  locations: { name: string }[];
  profile_image: string;
  refs: { landing_page: string };
}

export interface MuseJobsResponse {
  results: MuseJob[];
  page: number;
  page_count: number;
  total: number;
}

export interface MuseCompaniesResponse {
  results: MuseCompany[];
  page: number;
  page_count: number;
  total: number;
}

export type JobLevel =
  | "Internship"
  | "Entry Level"
  | "Mid Level"
  | "Senior Level"
  | "Management"
  | "Director"
  | "VP"
  | "Executive";

export type JobCategory =
  | "Software Engineering"
  | "Design & UX"
  | "Product Management"
  | "Data Science"
  | "Marketing & PR"
  | "Sales"
  | "Operations"
  | "Human Resources"
  | "Finance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();

  if (API_KEY) query.set("api_key", API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }

  return `${BASE_URL}${path}?${query.toString()}`;
}

async function apiFetch<T>(url: string): Promise<T> {
  console.log("[MuseAPI] fetching:", url);
  const res = await fetch(url);
  console.log("[MuseAPI] status:", res.status);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.log("[MuseAPI] error body:", body);
    throw new Error(`Muse API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  console.log(
    "[MuseAPI] results:",
    data?.total,
    "total,",
    data?.results?.length,
    "returned",
  );
  return data as T;
}
// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface SearchJobsParams {
  query?: string; // maps to company name search (Muse doesn't have full-text)
  category?: JobCategory;
  level?: JobLevel;
  location?: string;
  page?: number;
  sort?: "newest" | "relevance";
}

/**
 * Search jobs — powers Filo's job search bar
 */
export async function searchJobs(
  params: SearchJobsParams = {},
): Promise<MuseJobsResponse> {
  const url = buildUrl("/jobs", {
    category: params.category,
    level: params.level,
    location: params.location,
    page: params.page ?? 1,
    sort: params.sort ?? "newest",
  });
  const res = await apiFetch<MuseJobsResponse>(url);
  // Client-side filter by query since Muse has no keyword search
  if (params.query?.trim()) {
    const q = params.query.toLowerCase();
    res.results = res.results.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        j.company.name.toLowerCase().includes(q),
    );
  }
  return res;
}

/**
 * Get a single job by ID
 */
export async function getJobById(id: number): Promise<MuseJob> {
  const url = buildUrl(`/jobs/${id}`, {});
  return apiFetch<MuseJob>(url);
}

// ─── Companies ────────────────────────────────────────────────────────────────

export interface SearchCompaniesParams {
  query?: string; // partial name match
  industry?: string;
  size?: string;
  location?: string;
  page?: number;
}

/**
 * Search companies — powers Filo's company search bar
 */
export async function searchCompanies(
  params: SearchCompaniesParams = {},
): Promise<MuseCompaniesResponse> {
  const url = buildUrl("/companies", {
    company_name: params.query,
    industry: params.industry,
    size: params.size,
    location: params.location,
    page: params.page ?? 1,
  });

  return apiFetch<MuseCompaniesResponse>(url);
}

/**
 * Get a single company by ID
 */
export async function getCompanyById(id: number): Promise<MuseCompany> {
  const url = buildUrl(`/companies/${id}`, {});
  return apiFetch<MuseCompany>(url);
}

/**
 * Get all jobs for a specific company (by company name)
 */
export async function getJobsByCompany(
  companyName: string,
  page = 1,
): Promise<MuseJobsResponse> {
  const url = buildUrl("/jobs", {
    company: companyName,
    page,
    sort: "newest",
  });

  return apiFetch<MuseJobsResponse>(url);
}
