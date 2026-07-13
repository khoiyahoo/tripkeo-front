import type { ActivityWithId } from "@/types/firestore";

export interface DropPlacement {
  date: string;
  startTime: string;
  order: number;
}

export interface ActivityOrderUpdate {
  id: string;
  order: number;
  startTime?: string;
  date?: string;
}

export type TimelinePeriod = "lateNight" | "morning" | "afternoon" | "evening";

export const timeToMinutes = (time?: string): number | null => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const bounded = Math.max(0, Math.min(1439, Math.round(minutes)));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(
    bounded % 60
  ).padStart(2, "0")}`;
};

export const getRelativeActivityTime = (
  referenceTime: string | undefined,
  position: "before" | "after"
): string => {
  const referenceMinutes = timeToMinutes(referenceTime) ?? 9 * 60;
  const offset = position === "before" ? -15 : 15;
  return minutesToTime(referenceMinutes + offset);
};

export const getTimelinePeriod = (time?: string): TimelinePeriod => {
  const minutes = timeToMinutes(time);
  if (minutes === null || minutes < 3 * 60) return "lateNight";
  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "evening";
};

export const compareTimelineActivities = (
  a: Pick<ActivityWithId, "startTime" | "order">,
  b: Pick<ActivityWithId, "startTime" | "order">
): number => {
  const aMinutes = timeToMinutes(a.startTime);
  const bMinutes = timeToMinutes(b.startTime);
  if (aMinutes === null && bMinutes !== null) return 1;
  if (aMinutes !== null && bMinutes === null) return -1;
  if (aMinutes !== bMinutes) return (aMinutes ?? 0) - (bMinutes ?? 0);
  return a.order - b.order;
};

export const sortTimelineActivities = <
  T extends Pick<ActivityWithId, "startTime" | "order">,
>(
  activities: T[]
): T[] => [...activities].sort(compareTimelineActivities);

/** Activities scheduled at the same valid time, used to surface timeline clashes. */
export const findActivitiesAtTime = <
  T extends Pick<ActivityWithId, "startTime">,
>(
  activities: T[],
  time: string
): T[] => {
  if (timeToMinutes(time) === null) return [];
  return activities.filter((activity) => activity.startTime === time);
};

/** Infer a stable time without changing neighbouring activities. */
export const inferTimeForInsertion = (
  activities: Pick<ActivityWithId, "startTime">[],
  insertionIndex: number,
  fallback = "09:00"
): string => {
  const index = Math.max(0, Math.min(insertionIndex, activities.length));
  let previous: number | null = null;
  let next: number | null = null;

  for (let i = index - 1; i >= 0; i--) {
    previous = timeToMinutes(activities[i].startTime);
    if (previous !== null) break;
  }
  for (let i = index; i < activities.length; i++) {
    next = timeToMinutes(activities[i].startTime);
    if (next !== null) break;
  }

  if (previous !== null && next !== null) {
    if (next - previous > 1) {
      return minutesToTime(Math.floor((previous + next) / 2));
    }
    return minutesToTime(previous);
  }
  if (previous !== null) return minutesToTime(Math.min(previous + 15, 1439));
  if (next !== null) return minutesToTime(Math.max(next - 15, 0));
  return timeToMinutes(fallback) === null ? "09:00" : fallback;
};

export const getSuggestedNewActivityTime = (
  activities: Pick<ActivityWithId, "startTime" | "order">[]
): string =>
  inferTimeForInsertion(sortTimelineActivities(activities), activities.length);

/**
 * Build one atomic update set for a drag operation. Other activities keep their
 * original time; only their order can be normalised in source/destination days.
 */
export const buildTimelineMoveUpdates = ({
  activitiesByDate,
  activeId,
  targetDate,
  targetIndex,
  preserveTime = false,
}: {
  activitiesByDate: Record<string, ActivityWithId[]>;
  activeId: string;
  targetDate: string;
  targetIndex: number;
  preserveTime?: boolean;
}): { placement: DropPlacement; updates: ActivityOrderUpdate[] } | null => {
  const active = Object.values(activitiesByDate)
    .flat()
    .find((activity) => activity.id === activeId);
  if (!active) return null;

  const sourceDate = active.date;
  const source = sortTimelineActivities(
    (activitiesByDate[sourceDate] ?? []).filter(
      (activity) => activity.id !== activeId
    )
  );
  const destination = sortTimelineActivities(
    (activitiesByDate[targetDate] ?? []).filter(
      (activity) => activity.id !== activeId
    )
  );
  const insertionIndex = Math.max(0, Math.min(targetIndex, destination.length));
  const startTime = preserveTime
    ? (active.startTime ?? inferTimeForInsertion(destination, insertionIndex))
    : inferTimeForInsertion(destination, insertionIndex);
  const moved = { ...active, date: targetDate, startTime };
  destination.splice(insertionIndex, 0, moved);

  const updates = new Map<string, ActivityOrderUpdate>();
  if (sourceDate !== targetDate) {
    source.forEach((activity, order) => {
      updates.set(activity.id, { id: activity.id, order });
    });
  }
  destination.forEach((activity, order) => {
    updates.set(activity.id, {
      id: activity.id,
      order,
      ...(activity.id === activeId
        ? {
            startTime,
            ...(sourceDate !== targetDate ? { date: targetDate } : {}),
          }
        : {}),
    });
  });

  return {
    placement: { date: targetDate, startTime, order: insertionIndex },
    updates: [...updates.values()],
  };
};
