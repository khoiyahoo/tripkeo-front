import type { Timestamp } from "firebase/firestore";

import type { TripWithId } from "@/types/firestore";

/** Add N minutes to a HH:mm string, wrapping at 24h. */
export function addMinutesToTime(time: string, minutes: number): string {
  if (!time?.includes(":")) return time ?? "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/** Valid HH:mm range for a given session (no midnight wrap). */
export function getSessionRange(session: string): { min: string; max: string } {
  switch (session) {
    case "morning":
      return { min: "06:00", max: "11:59" };
    case "afternoon":
      return { min: "12:00", max: "17:59" };
    case "evening":
      return { min: "18:00", max: "23:59" };
    default:
      return { min: "00:00", max: "23:59" };
  }
}

/** Default (base) start time when a session is empty. */
export function getSessionBase(session: string): string {
  const bases: Record<string, string> = {
    morning: "08:00",
    afternoon: "12:00",
    evening: "18:00",
  };
  return bases[session] ?? "08:00";
}

/**
 * Find the first available (unused) HH:mm slot in [minTime, maxTime].
 * Returns null if every minute in the range is occupied.
 */
export function findAvailableSlot(
  activities: { startTime?: string }[],
  minTime: string,
  maxTime: string
): string | null {
  const used = new Set(
    activities.map((a) => a.startTime).filter(Boolean) as string[]
  );
  let current = minTime;
  while (current <= maxTime) {
    if (!used.has(current)) return current;
    current = addMinutesToTime(current, 1);
    // Safety guard: if addMinutesToTime wraps past midnight, stop
    if (current < minTime) break;
  }
  return null;
}

/**
 * Compute a smart default startTime for a new activity in a session.
 * - Empty session → base time (e.g. 08:00 for morning)
 * - Has activities → latest startTime + 1 min
 * - Overflows session max → find first available slot from base
 * - No slot available → null ("session is full")
 */
export function getDefaultStartTime(
  activitiesInSession: { startTime?: string }[],
  session: string
): string | null {
  const base = getSessionBase(session);
  const { max } = getSessionRange(session);

  const times = activitiesInSession
    .map((a) => a.startTime)
    .filter(Boolean) as string[];

  if (times.length === 0) return base;

  const latest = [...times].sort().at(-1) as string;
  const candidate = addMinutesToTime(latest, 1);

  if (candidate <= max) return candidate;

  // Overflows → find first available gap from base
  return findAvailableSlot(activitiesInSession, base, max);
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Strip non-digit characters from a currency input string */
export const parseCurrencyInput = (value: string): string =>
  value.replace(/\D/g, "");

/** Format a raw digit string as a thousands-separated display value */
export const formatCurrencyInput = (raw: string): string => {
  if (!raw) return "";
  return Number(raw).toLocaleString("vi-VN");
};

export const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
};

export const formatDateShort = (dateStr: string): string => {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateStr));
};

export const formatDateRange = (start: string, end: string): string => {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
};

export const getDaysBetween = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStatusLabel = (
  status: "upcoming" | "ongoing" | "completed"
): string => {
  const labels = {
    upcoming: "Sắp đi",
    ongoing: "Đang đi",
    completed: "Đã đi",
  };
  return labels[status];
};

export const getStatusColor = (
  status: "upcoming" | "ongoing" | "completed"
): string => {
  const colors = {
    upcoming: "bg-primary-500 text-white shadow-md",
    ongoing: "bg-success-500 text-white shadow-md",
    completed: "bg-secondary-400 text-white shadow-md",
  };
  return colors[status];
};

export const timestampToDateStr = (ts: Timestamp): string => {
  return ts.toDate().toISOString().split("T")[0];
};

export const getTripStatus = (
  startDate: Timestamp,
  endDate: Timestamp
): "upcoming" | "ongoing" | "completed" => {
  const now = new Date();
  const start = startDate.toDate();
  const end = endDate.toDate();

  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "ongoing";
};

export const generateDaysList = (
  startDate: Timestamp,
  endDate: Timestamp
): { dayNumber: number; date: string }[] => {
  const start = startDate.toDate();
  const end = endDate.toDate();
  const days: { dayNumber: number; date: string }[] = [];

  const current = new Date(start);
  let dayNumber = 1;

  while (current <= end) {
    days.push({
      dayNumber,
      date: current.toISOString().split("T")[0],
    });
    current.setDate(current.getDate() + 1);
    dayNumber++;
  }

  return days;
};

export const formatTimestampRange = (
  start: Timestamp,
  end: Timestamp
): string => {
  return formatDateRange(timestampToDateStr(start), timestampToDateStr(end));
};

export const getCountdown = (startDate: Timestamp): string | null => {
  const now = new Date();
  const start = startDate.toDate();
  const diff = start.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return "Ngày mai";
  return `Còn ${days} ngày`;
};

export const tripToCardData = (trip: TripWithId) => {
  const memberEntries = Object.entries(trip.members);
  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    coverImage: trip.coverImage,
    startDate: timestampToDateStr(trip.startDate),
    endDate: timestampToDateStr(trip.endDate),
    status: getTripStatus(trip.startDate, trip.endDate),
    memberCount: memberEntries.length,
    memberAvatars: memberEntries.slice(0, 4).map(([, m]) => m.photoURL),
  };
};
