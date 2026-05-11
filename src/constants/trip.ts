import type { ActivityType, ExpenseCategory } from "@/types/database";

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  transport: {
    label: "TRANSPORT",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "✈",
  },
  stay: {
    label: "STAY",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: "🏨",
  },
  sights: {
    label: "SIGHTS",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "🏛",
  },
  food: {
    label: "FOOD",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "🍽",
  },
  shopping: {
    label: "SHOPPING",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
    icon: "🛍",
  },
  entertainment: {
    label: "ENTERTAINMENT",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: "🎭",
  },
  other: {
    label: "OTHER",
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
