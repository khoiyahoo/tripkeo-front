import type { Timestamp } from "firebase/firestore";

import type { TripWithId } from "@/types/firestore";

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
    upcoming: "bg-primary-100 text-primary-800",
    ongoing: "bg-success-50 text-success-700",
    completed: "bg-slate-100 text-slate-600",
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
