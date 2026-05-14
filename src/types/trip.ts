export type TripStatus = "upcoming" | "ongoing" | "completed";
export type TimePeriod = "morning" | "afternoon" | "evening";
export type ActivityType =
  | "transport"
  | "stay"
  | "sights"
  | "food"
  | "shopping"
  | "entertainment"
  | "other";
export type ExpenseCategory =
  | "food"
  | "transport"
  | "stay"
  | "ticket"
  | "shopping"
  | "entertainment"
  | "other";
export type MemberRole = "admin" | "member";
export type PaymentStatus = "paid" | "unpaid";

export interface TripMember {
  id: string;
  name: string;
  avatar: string;
  role: MemberRole;
  totalPaid: number;
  totalOwed: number;
  paymentStatus: PaymentStatus;
}

export interface Activity {
  id: string;
  time: string;
  endTime?: string;
  title: string;
  location: string;
  mapsUrl?: string;
  type: ActivityType;
  note?: string;
  cost?: number;
  imageUrl?: string;
}

export interface DaySchedule {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  paidById: string;
  splitAmong: string[];
  category: ExpenseCategory;
  date: string;
  receiptUrl?: string;
}

export interface DebtRecord {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

export interface PollOption {
  id: string;
  label: string;
  imageUrl?: string;
  description?: string;
  votes: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  isActive: boolean;
}

export interface TripNote {
  id: string;
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  isChecked: boolean;
  assignee?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  description?: string;
  status: TripStatus;
  members: TripMember[];
  budget: number;
  totalSpent: number;
  schedule: DaySchedule[];
  expenses: Expense[];
  debts: DebtRecord[];
  polls: Poll[];
  notes: TripNote[];
  checklist: ChecklistItem[];
}

export interface TripCard {
  id: string;
  name: string;
  destination: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  memberCount: number;
  memberAvatars: string[];
}

export interface TripInvite {
  id: string;
  tripName: string;
  destination: string;
  invitedBy: string;
  inviterAvatar: string;
  startDate: string;
  endDate: string;
}

export interface QuickStats {
  totalTrips: number;
  totalCostThisYear: number;
  nextDestination: string | null;
  nextTripDate: string | null;
}

export interface DiscoverTrip {
  id: string;
  name: string;
  destination: string;
  coverImage: string;
  days: number;
  budget: number;
  rating: number;
  reviewCount: number;
  authorName: string;
  authorAvatar: string;
  tags: string[];
}
