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

// ─── Quỹ chung (thu tiền trước theo đầu người) ──────────────
export type FundTransactionType = "contribution" | "refund";
export type FundPaymentMethod = "cash" | "bank";
/** Nguồn chi của một khoản chi tiêu. Mặc định (không có field) = "member": người ứng trước. */
export type ExpensePaidFrom = "fund" | "member";

export interface FundConfig {
  enabled: boolean;
  /** Mức đóng mặc định mỗi người (VND, số nguyên) */
  perPerson: number;
  currency: string;
  /** Mức đóng riêng từng người (theo tên costMember); thiếu thì dùng perPerson */
  requiredByMember?: Record<string, number>;
  /** Có giá trị = quỹ đã đóng (khóa ghi). Chủ chuyến mở lại bằng cách đặt null. */
  closedAt?: Timestamp | null;
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
  /** Quỹ chung; không có field = chuyến không dùng quỹ. */
  fund?: FundConfig;
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
  /** "fund" = chi từ quỹ chung (paidBy để trống); mặc định "member" = người ứng trước */
  paidFrom?: ExpensePaidFrom;
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
  /** Mã ảnh trên Cloudinary, dùng để xóa ảnh khi xóa/thay ảnh bill */
  receiptPublicId?: string;
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
  /** Name of payer (from costMembers). Để trống khi chi từ quỹ. */
  paidBy: string;
  /** Nguồn chi; bỏ trống = "member" */
  paidFrom?: ExpensePaidFrom;
  /** Names of participants (from costMembers) */
  splitBetween: string[];
  splitMethod: SplitMethod;
  splitDetails?: Record<string, number>;
  receiptUrl?: string;
  receiptPublicId?: string;
  note?: string;
}

// ─── Fund transaction (subcollection: trips/{tripId}/fundTransactions) ─
export interface FundTransactionDoc {
  type: FundTransactionType;
  /** Tên thành viên (costMember) đóng hoặc nhận hoàn */
  member: string;
  /** VND, số nguyên dương */
  amount: number;
  date: Timestamp;
  method?: FundPaymentMethod;
  note?: string;
  /** Có giá trị = giao dịch đã bị hủy (không xóa cứng để giữ lịch sử) */
  voidedAt?: Timestamp | null;
  voidReason?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface FundTransactionWithId extends FundTransactionDoc {
  id: string;
}

export interface CreateFundTransactionInput {
  type: FundTransactionType;
  member: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method?: FundPaymentMethod;
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
