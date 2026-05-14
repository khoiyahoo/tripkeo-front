import { useCallback, useEffect, useRef, useState } from "react";

interface UseFormDraftResult<T> {
  savedDraft: T | null;
  saveDraft: (data: T) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

/**
 * Auto-saves form data to localStorage (debounced 500ms) and restores on mount.
 * Clear draft on successful submit via `clearDraft()`.
 *
 * @param key - Unique storage key, e.g. `draft_activity_{tripId}_{date}`
 * @param initialValues - Default form values (used to detect if draft differs)
 */
export const useFormDraft = <T>(
  key: string,
  initialValues: T
): UseFormDraftResult<T> => {
  const [savedDraft, setSavedDraft] = useState<T | null>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as T;
      // Only return draft if it differs from initial values
      if (JSON.stringify(parsed) === JSON.stringify(initialValues)) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (data: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch {
          // Storage full or unavailable — silently ignore
        }
      }, 500);
    },
    [key]
  );

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(key);
    setSavedDraft(null);
  }, [key]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    savedDraft,
    saveDraft,
    clearDraft,
    hasDraft: savedDraft !== null,
  };
};
