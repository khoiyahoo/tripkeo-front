import { useCallback } from "react";

import { batchUpdateAndDeleteActivities } from "@/services/itineraryService";
import { updateTrip } from "@/services/tripService";

import type { ActivityWithId, CreateTripInput } from "@/types/firestore";

// ─── Types ────────────────────────────────────────────────────
export interface DateChangeImpact {
  toUpdate: { id: string; date: string }[];
  toDelete: string[];
}

// ─── Pure helper ──────────────────────────────────────────────
const buildDateRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

/**
 * Computes which activities need their date updated and which must be deleted
 * when the trip's date range changes.
 *
 * Logic (dayNumber-preserving):
 *   - dayIndex = position of activity.date in the OLD date array (0-based)
 *   - New date  = newDates[dayIndex]
 *   - If newDates[dayIndex] exists and differs → toUpdate
 *   - If newDates[dayIndex] doesn't exist (trip shortened) → toDelete
 */
export const computeDateChangeImpact = (
  activities: ActivityWithId[],
  oldStartStr: string,
  oldEndStr: string,
  newStartStr: string,
  newEndStr: string
): DateChangeImpact => {
  const toUpdate: { id: string; date: string }[] = [];
  const toDelete: string[] = [];

  const oldDates = buildDateRange(oldStartStr, oldEndStr);
  const newDates = buildDateRange(newStartStr, newEndStr);

  for (const activity of activities) {
    const dayIdx = oldDates.indexOf(activity.date);
    if (dayIdx === -1) continue; // activity outside old range – ignore

    const newDate = newDates[dayIdx];
    if (newDate === undefined) {
      toDelete.push(activity.id);
    } else if (newDate !== activity.date) {
      toUpdate.push({ id: activity.id, date: newDate });
    }
  }

  return { toUpdate, toDelete };
};

// ─── Hook ─────────────────────────────────────────────────────
interface UseEditTripResult {
  handleSave: (
    tripId: string,
    input: Partial<CreateTripInput>,
    impact: DateChangeImpact
  ) => Promise<void>;
}

export const useEditTrip = (): UseEditTripResult => {
  const handleSave = useCallback(
    async (
      tripId: string,
      input: Partial<CreateTripInput>,
      impact: DateChangeImpact
    ): Promise<void> => {
      const promises: Promise<void>[] = [updateTrip(tripId, input)];
      if (impact.toUpdate.length > 0 || impact.toDelete.length > 0) {
        promises.push(
          batchUpdateAndDeleteActivities(
            tripId,
            impact.toUpdate,
            impact.toDelete
          )
        );
      }
      await Promise.all(promises);
    },
    []
  );

  return { handleSave };
};
