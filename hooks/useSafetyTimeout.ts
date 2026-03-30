import { useEffect, useRef } from "react";

/**
 * Universal safety timeout to prevent infinite loading spinners.
 * Forces loading to false after the specified timeout (default 10s).
 *
 * Usage:
 *   useSafetyTimeout(loading, setLoading, "[page-name]");
 */
export function useSafetyTimeout(
  loading: boolean,
  setLoading: (value: boolean | ((prev: boolean) => boolean)) => void,
  label: string,
  timeoutMs = 10_000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      timerRef.current = setTimeout(() => {
        console.warn(`[${label}] Safety timeout: forcing loading=false after ${timeoutMs / 1000}s`);
        setLoading(false);
      }, timeoutMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, setLoading, label, timeoutMs]);
}
