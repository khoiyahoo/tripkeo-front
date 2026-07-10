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
export type TripRole = "owner" | "editor" | "treasurer" | "member";
export type MemberStatus = "active" | "left" | "removed";

export interface TripMemberInfo {
  role: TripRole;
  displayName: string;
  photoURL: string;
  email: string;
  joinedAt: Timestamp;
  /** Soft-delete state. Undefined on legacy records = active. */
  status?: MemberStatus;
  /** YYYY-MM-DD when the member officially joined (may differ from joinedAt) */
  participationStart?: string;
  /** YYYY-MM-DD when the member left or was removed */
  participationEnd?: string;
}

export interface TripDoc {
  name: string;
  destination: string;
  coverImage: string;
  startDate: Timestamp;
  endDate: Timestamp;
  description: string;
  currency: string;
  createdBy: string;
  memberIds: string[];
  members: Record<string, TripMemberInfo>;
  /** Names entered by the owner for expense tracking (no auth required). */
  costMembers: string[];
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
  /** Latitude (WGS84). Populated by geocoding after creation. */
  lat?: number;
  /** Longitude (WGS84). Populated by geocoding after creation. */
  lng?: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Expense (subcollection: trips/{tripId}/expenses) ────────
export type SplitMethod = "equal" | "percentage" | "amount" | "shares";

export interface ExpenseDoc {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Timestamp;
  /** Name of the payer – from the trip's costMembers list */
  paidBy: string;
  /** Names of participants – subset of costMembers */
  splitBetween: string[];
  /** How the expense is divided */
  splitMethod: SplitMethod;
  /**
   * Per-member split detail (name → value).
   * - equal: not stored (computed)
   * - percentage: name → percent (must sum to 100)
   * - amount: name → exact amount (must sum to expense amount)
   * - shares: name → number of shares
   */
  splitDetails?: Record<string, number>;
  receiptUrl?: string;
  note?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ─── Invitation (subcollection: trips/{tripId}/invitations) ──
export interface InvitationDoc {
  email: string;
  role: "editor" | "treasurer" | "member";
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
// ─── Personal Activity (subcollection: trips/{tripId}/personalActivities) ─
// Private to each user — only the owner (userId) can read/write.

export interface PersonalActivityDoc {
  date: string; // YYYY-MM-DD
  title: string;
  startTime?: string; // HH:mm, optional
  endTime?: string;
  category: ActivityType;
  note?: string;
  /** Display order within the same date (for drag-and-drop reordering) */
  order?: number;
  /** The uid of the user who owns this personal activity. */
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PersonalActivityWithId extends PersonalActivityDoc {
  id: string;
}

export interface CreatePersonalActivityInput {
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  category: ActivityType;
  note?: string;
  order?: number;
}
// ─── Form input types ────────────────────────────────────────
export interface InvitedMember {
  email: string;
  role: "editor" | "treasurer" | "member";
}

export interface CreateTripInput {
  name: string;
  destination: string;
  coverImage: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  description?: string;
  // budget: number;
  currency: string;
  /** Names of cost members added at creation time (owner name is auto-added) */
  costMembers?: string[];
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
  /** Geocoded coordinates — set by fire-and-forget geocoder, not user input */
  lat?: number;
  lng?: number;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  /** Name of payer (from costMembers) */
  paidBy: string;
  /** Names of participants (from costMembers) */
  splitBetween: string[];
  splitMethod: SplitMethod;
  splitDetails?: Record<string, number>;
  receiptUrl?: string;
  note?: string;
}

export interface InviteMemberInput {
  email: string;
  role: "editor" | "treasurer" | "member";
}

// ─── Balance calculation types ───────────────────────────────
export interface MemberBalance {
  /** Cost member name */
  name: string;
  totalPaid: number;
  totalOwed: number;
  net: number; // positive = is owed money, negative = owes money
}

export interface DebtSettlement {
  fromName: string;
  toName: string;
  amount: number;
  isPaid?: boolean; // true = marked as paid, false/undefined = not paid
  paidAt?: Date | null; // timestamp when marked as paid
  createdBy?: string; // UID of who marked it as paid
}
