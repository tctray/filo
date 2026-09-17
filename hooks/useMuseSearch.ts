// hooks/useMuseSearch.ts
// Drop-in search hook for Filo's job/company search bar
// Handles debouncing, loading state, pagination, and errors

import { useCallback, useEffect, useRef, useState } from "react";
import {
    MuseCompany,
    MuseJob,
    searchCompanies,
    SearchCompaniesParams,
    searchJobs,
    SearchJobsParams,
} from "../services/museApi";

// ─── Job Search Hook ──────────────────────────────────────────────────────────

interface UseJobSearchResult {
  jobs: MuseJob[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalResults: number;
  loadMore: () => void;
  reset: () => void;
}

export function useJobSearch(
  query: string,
  filters: Omit<SearchJobsParams, "query" | "page"> = {},
  debounceMs = 400,
): UseJobSearchResult {
  const [jobs, setJobs] = useState<MuseJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Stable ref for filters to avoid stale closure issues
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchJobs = useCallback(
    async (searchQuery: string, pageNum: number, append: boolean) => {
      if (!searchQuery.trim()) {
        setJobs([]);
        setTotalResults(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await searchJobs({
          query: searchQuery,
          page: pageNum,
          ...filtersRef.current,
        });

        setJobs((prev) => (append ? [...prev, ...res.results] : res.results));
        setPageCount(res.page_count);
        setTotalResults(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced search on query change — resets to page 1
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      fetchJobs(query, 1, false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, fetchJobs]);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    if (loading || page >= pageCount) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(query, nextPage, true);
  }, [loading, page, pageCount, query, fetchJobs]);

  const reset = useCallback(() => {
    setJobs([]);
    setPage(1);
    setPageCount(1);
    setTotalResults(0);
    setError(null);
  }, []);

  return {
    jobs,
    loading,
    error,
    hasMore: page < pageCount,
    totalResults,
    loadMore,
    reset,
  };
}

// ─── Company Search Hook ──────────────────────────────────────────────────────

interface UseCompanySearchResult {
  companies: MuseCompany[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalResults: number;
  loadMore: () => void;
  reset: () => void;
}

export function useCompanySearch(
  query: string,
  filters: Omit<SearchCompaniesParams, "query" | "page"> = {},
  debounceMs = 400,
): UseCompanySearchResult {
  const [companies, setCompanies] = useState<MuseCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchCompanies = useCallback(
    async (searchQuery: string, pageNum: number, append: boolean) => {
      if (!searchQuery.trim()) {
        setCompanies([]);
        setTotalResults(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await searchCompanies({
          query: searchQuery,
          page: pageNum,
          ...filtersRef.current,
        });

        setCompanies((prev) =>
          append ? [...prev, ...res.results] : res.results,
        );
        setPageCount(res.page_count);
        setTotalResults(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      fetchCompanies(query, 1, false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, fetchCompanies]);

  const loadMore = useCallback(() => {
    if (loading || page >= pageCount) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCompanies(query, nextPage, true);
  }, [loading, page, pageCount, query, fetchCompanies]);

  const reset = useCallback(() => {
    setCompanies([]);
    setPage(1);
    setPageCount(1);
    setTotalResults(0);
    setError(null);
  }, []);

  return {
    companies,
    loading,
    error,
    hasMore: page < pageCount,
    totalResults,
    loadMore,
    reset,
  };
}
