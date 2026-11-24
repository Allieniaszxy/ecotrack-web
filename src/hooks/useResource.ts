"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api";

/**
 * Loads data when a page mounts (and when `key` changes), optionally polls,
 * and exposes reload() and
 * setData() so pages can refresh after a change or patch from realtime events.
 * 401 errors are left to the auth context, which signs the user out.
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  { intervalMs, key }: { intervalMs?: number; key?: string | number } = {},
) {
  const fetcherRef = useRef(fetcher);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(errorMessage(err, "Unable to load data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();

    if (!intervalMs) return;
    const timer = setInterval(() => void reload(), intervalMs);
    return () => clearInterval(timer);
    // `key` re-runs the fetch when an input such as a date range changes.
  }, [reload, intervalMs, key]);

  return { data, setData, error, loading, reload };
}
