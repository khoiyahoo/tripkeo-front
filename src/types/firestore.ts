import type { Timestamp } from "firebase/firestore";

import type { ActivityType, ExpenseCategory } from "@/types/trip";

// ─── User Profile ────────────────────────────────────────────
export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Trip ────────────────────────────────────────────────────
export type TripRole = "owner" | "editor" | "viewer";

export interface TripMemberInfo {
  role: TripRole;
  displayName: string;
  photoURL: string;
  email: string;
  joinedAt: Timestamp;
}

export interface TripDoc {
  name: string;
  destination: string;
  coverImage: string;
  startDate: Timestamp;
  endDate: Timestamp;
  description: string;
  budget: number;
  currency: string;
  createdBy: string;
  memberIds: string[];
  members: Record<string, TripMemberInfo>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Activity (subcollection: trips/{tripId}/activities) ─────
export interface ActivityDoc {
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: string; // HH:mm, optional
  endTime?: string;
  category: ActivityType;
  location?: string;
  mapsUrl?: string;
  note?: string;
  cost?: number;
  order: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Expense (subcollection: trips/{tripId}/expenses) ────────
export interface ExpenseDoc {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Timestamp;
  paidBy: string; // uid
  paidByName: string;
  splitType: "equal" | "custom";
  splitAmong: Record<string, number>; // uid → amount owed
  receiptUrl?: string;
  createdBy: string;
  createdAt: Timestamp;
}

// ─── Invitation (subcollection: trips/{tripId}/invitations) ──
export interface InvitationDoc {
  email: string;
  role: "editor" | "viewer";
  inviteCode: string;
  status: "pending" | "accepted" | "declined";
  invitedBy: string;
  invitedByName: string;
  tripName: string;
  destination: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// ─── Client-side derived types (with id) ─────────────────────
export interface UserProfile
  extends Omit<UserProfileDoc, "createdAt" | "updatedAt"> {
  createdAt: Date;
  updatedAt: Date;
}

export interface TripWithId extends TripDoc {
  id: string;
}

export interface ActivityWithId extends ActivityDoc {
  id: string;
}

export interface ExpenseWithId extends ExpenseDoc {
  id: string;
}

export interface InvitationWithId extends InvitationDoc {
  id: string;
}

// ─── Form input types ────────────────────────────────────────
export interface InvitedMember {
  email: string;
  role: "editor" | "viewer";
}

export interface CreateTripInput {
  name: string;
  destination: string;
  coverImage: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  description?: string;
  budget: number;
  currency: string;
  invitedMembers?: InvitedMember[];
}

export interface CreateActivityInput {
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  category: ActivityType;
  location?: string;
  mapsUrl?: string;
  note?: string;
  cost?: number;
  order: number;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paidBy: string;
  paidByName: string;
  splitType: "equal" | "custom";
  splitAmong: Record<string, number>;
}

export interface InviteMemberInput {
  email: string;
  role: "editor" | "viewer";
}

// ─── Balance calculation types ───────────────────────────────
export interface MemberBalance {
  uid: string;
  displayName: string;
  photoURL: string;
  totalPaid: number;
  totalOwed: number;
  net: number; // positive = is owed, negative = owes
}

export interface DebtSettlement {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
}
