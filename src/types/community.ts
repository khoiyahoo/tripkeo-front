import type { Timestamp } from "firebase/firestore";

// ─── Community Post ───────────────────────────────────────────
/** A publicly shared trip post. */
export interface CommunityPostDoc {
  /** UID of the author */
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  /** Display title chosen by the author */
  title: string;
  /** Free-text review/feeling */
  content: string;
  /** Source trip id (used for clone, optional if trip is deleted) */
  tripId?: string;
  /** e.g. "Đà Nẵng", "Hà Nội" — for search / filter */
  destination: string;
  /** "north" | "central" | "south" | "other" */
  region: CommunityRegion;
  /** Cloudinary image URLs (max 10) */
  imageUrls: string[];
  /** Whether to include the shared itinerary snapshot */
  includeItinerary: boolean;
  /** Whether to include expense overview */
  includeExpenses: boolean;
  /** Snapshot of shared activities (only if includeItinerary=true) */
  itinerarySnapshot?: ItineraryDaySnapshot[];
  /** Expense overview (only if includeExpenses=true) */
  expenseSnapshot?: ExpenseSnapshot;
  /** Number of likes */
  likeCount: number;
  /** Number of comments */
  commentCount: number;
  /** Number of times this post was cloned */
  cloneCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CommunityRegion = "north" | "central" | "south" | "other";

export interface ItineraryDaySnapshot {
  dayNumber: number;
  date: string;
  activities: {
    title: string;
    startTime?: string;
    category: string;
    location?: string;
  }[];
}

export interface ExpenseSnapshot {
  total: number;
  currency: string;
  memberCount: number;
  perPerson: number;
  byCategory: Record<string, number>;
}

// ─── Comment ──────────────────────────────────────────────────
export interface CommentDoc {
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  content: string;
  createdAt: Timestamp;
}

// ─── Like ─────────────────────────────────────────────────────
/** Document id = userId. Stored in posts/{postId}/likes/{userId} */
export interface LikeDoc {
  userId: string;
  createdAt: Timestamp;
}

// ─── Client-side (with id) ────────────────────────────────────
export interface CommunityPost
  extends Omit<CommunityPostDoc, "createdAt" | "updatedAt"> {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment extends Omit<CommentDoc, "createdAt"> {
  id: string;
  createdAt: Date;
}

// ─── Form inputs ──────────────────────────────────────────────
export interface CreatePostInput {
  title: string;
  content: string;
  tripId?: string;
  destination: string;
  region: CommunityRegion;
  imageUrls: string[];
  includeItinerary: boolean;
  includeExpenses: boolean;
  itinerarySnapshot?: ItineraryDaySnapshot[];
  expenseSnapshot?: ExpenseSnapshot;
}
