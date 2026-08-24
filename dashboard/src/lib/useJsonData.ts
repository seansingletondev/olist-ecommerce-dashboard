import { useEffect, useState } from "react";

interface UseJsonDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches one of the static JSON files in public/data/ (produced by
 * python/export/export_to_json.py) and exposes it as normal React state.
 * `path` is relative to the site root, e.g. "/data/02_geographic_breakdown.json"
 * -- Vite serves everything in public/ from the root unchanged.
 */
export function useJsonData<T>(path: string): UseJsonDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(path)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
        }
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, loading, error };
}
