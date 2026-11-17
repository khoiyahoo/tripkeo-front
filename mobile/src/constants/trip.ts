import type { ActivityType, ExpenseCategory, TimePeriod } from "@/types/trip";

export const TIME_PERIOD_CONFIG: Record<
  TimePeriod,
  {
    label: string;
    icon: string;
    defaultTime: string;
    startHour: number;
    endHour: number;
  }
> = {
  morning: {
    label: "Sáng",
    icon: "🌅",
    defaultTime: "08:00",
    startHour: 3,
    endHour: 12, // 03:00 – 11:59
  },
  afternoon: {
    label: "Chiều",
    icon: "☀️",
    defaultTime: "12:00",
    startHour: 12,
    endHour: 18, // 12:00 – 17:59
  },
  evening: {
    label: "Tối",
    icon: "🌙",
    defaultTime: "18:00",
    startHour: 18,
    endHour: 3, // 18:00 – 02:59 (wraps around midnight)
  },
};

export const TIME_PERIODS: TimePeriod[] = ["morning", "afternoon", "evening"];

/** Derive the time period from a HH:mm string (empty/undefined defaults to morning) */
export const getTimePeriod = (time?: string): TimePeriod => {
  if (!time) return "morning";
  const hour = Number.parseInt(time.split(":")[0], 10);
  if (Number.isNaN(hour)) return "morning";
  if (hour >= 3 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening"; // 18-23 or 0-2
};

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  transport: {
    label: "Di chuyển",
    color: "text-primary-700",
    bgColor: "bg-primary-100",
    icon: "✈",
  },
  stay: {
    label: "Chỗ ở",
    color: "text-secondary-900",
    bgColor: "bg-secondary-200",
    icon: "🏨",
  },
  sights: {
    label: "Tham quan",
    color: "text-success-700",
    bgColor: "bg-success-100",
    icon: "🏛",
  },
  food: {
    label: "Ăn uống",
    color: "text-warning-700",
    bgColor: "bg-warning-100",
    icon: "🍽",
  },
  shopping: {
    label: "Mua sắm",
    color: "text-primary-800",
    bgColor: "bg-primary-200",
    icon: "🛍",
  },
  entertainment: {
    label: "Giải trí",
    color: "text-tertiary-700",
    bgColor: "bg-tertiary-100",
    icon: "🎭",
  },
  other: {
    label: "Khác",
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
    icon: "📌",
  },
};

export const EXPENSE_CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  food: {
    label: "Ăn uống",
    color: "text-warning-700",
    bgColor: "bg-warning-100",
    dotColor: "bg-warning-500",
  },
  transport: {
    label: "Di chuyển",
    color: "text-primary-700",
    bgColor: "bg-primary-100",
    dotColor: "bg-primary-500",
  },
  stay: {
    label: "Chỗ ở",
    color: "text-secondary-900",
    bgColor: "bg-secondary-200",
    dotColor: "bg-secondary-600",
  },
  ticket: {
    label: "Vé",
    color: "text-primary-800",
    bgColor: "bg-primary-200",
    dotColor: "bg-primary-600",
  },
  shopping: {
    label: "Mua sắm",
    color: "text-tertiary-700",
    bgColor: "bg-tertiary-100",
    dotColor: "bg-tertiary-500",
  },
  entertainment: {
    label: "Giải trí",
    color: "text-success-700",
    bgColor: "bg-success-100",
    dotColor: "bg-success-500",
  },
  other: {
    label: "Khác",
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
    dotColor: "bg-neutral-500",
  },
};

export const CURRENCIES = ["USD", "VND", "EUR", "JPY"] as const;
