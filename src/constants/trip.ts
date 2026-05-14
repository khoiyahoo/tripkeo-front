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
    defaultTime: "13:00",
    startHour: 12,
    endHour: 18, // 12:00 – 17:59
  },
  evening: {
    label: "Tối",
    icon: "🌙",
    defaultTime: "19:00",
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
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "✈",
  },
  stay: {
    label: "Chỗ ở",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: "🏨",
  },
  sights: {
    label: "Tham quan",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "🏛",
  },
  food: {
    label: "Ăn uống",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "🍽",
  },
  shopping: {
    label: "Mua sắm",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
    icon: "🛍",
  },
  entertainment: {
    label: "Giải trí",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
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
    label: "Food",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    dotColor: "bg-orange-500",
  },
  transport: {
    label: "Transport",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    dotColor: "bg-blue-500",
  },
  stay: {
    label: "Stay",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    dotColor: "bg-purple-500",
  },
  ticket: {
    label: "Ticket",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
    dotColor: "bg-teal-500",
  },
  shopping: {
    label: "Shopping",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
    dotColor: "bg-pink-500",
  },
  entertainment: {
    label: "Entertainment",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    dotColor: "bg-yellow-500",
  },
  other: {
    label: "Other",
    color: "text-neutral-700",
    bgColor: "bg-neutral-100",
    dotColor: "bg-neutral-500",
  },
};

export const CURRENCIES = ["USD", "VND", "EUR", "JPY"] as const;
