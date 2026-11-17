import {
  addDoc,
  collection,
  type DocumentSnapshot,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  type Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import type {
  Comment,
  CommentDoc,
  CommunityPost,
  CommunityPostDoc,
  CommunityRegion,
  CreatePostInput,
  LikeDoc,
  UpdatePostInput,
} from "@/types/community";

// ─── Collection refs ──────────────────────────────────────────
const postsRef = () => collection(db, "communityPosts");
const postRef = (postId: string) => doc(db, "communityPosts", postId);
const commentsRef = (postId: string) =>
  collection(db, "communityPosts", postId, "comments");
const likeRef = (postId: string, userId: string) =>
  doc(db, "communityPosts", postId, "likes", userId);

// ─── Firestore safety ─────────────────────────────────────────
/**
 * Recursively removes keys whose value is `undefined`.
 * Firestore rejects documents that contain `undefined` anywhere in their tree.
 * `null` is preserved; only `undefined` is stripped.
 */
function stripUndefined(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripUndefined);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) out[k] = stripUndefined(v);
  }
  return out;
}

// ─── Converters ───────────────────────────────────────────────
function toPost(snap: DocumentSnapshot): CommunityPost | null {
  if (!snap.exists()) return null;
  const d = snap.data() as CommunityPostDoc;
  return {
    ...d,
    id: snap.id,
    createdAt: d.createdAt.toDate(),
    updatedAt: d.updatedAt.toDate(),
  };
}

function toComment(snap: DocumentSnapshot): Comment {
  const d = snap.data() as CommentDoc;
  return {
    ...d,
    id: snap.id,
    createdAt: d.createdAt.toDate(),
    updatedAt: d.updatedAt ? d.updatedAt.toDate() : null,
  };
}

// ─── Posts CRUD ───────────────────────────────────────────────
export const PAGE_SIZE = 10;

export interface PostsPage {
  posts: CommunityPost[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function fetchPosts(
  options: {
    region?: CommunityRegion | "all";
    search?: string;
    after?: DocumentSnapshot | null;
  } = {}
): Promise<PostsPage> {
  const { region, after } = options;

  let q = query(postsRef(), orderBy("createdAt", "desc"), limit(PAGE_SIZE + 1));

  if (region && region !== "all") {
    q = query(
      postsRef(),
      where("region", "==", region),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE + 1)
    );
  }
  if (after) {
    q = query(q, startAfter(after));
  }

  const snap = await getDocs(q);
  const docs = snap.docs;
  const hasMore = docs.length > PAGE_SIZE;
  const sliced = docs.slice(0, PAGE_SIZE);

  return {
    posts: sliced
      .map((d) => toPost(d))
      .filter((p): p is CommunityPost => p !== null),
    lastDoc: sliced[sliced.length - 1] ?? null,
    hasMore,
  };
}

export function subscribeToPosts(
  options: { region?: CommunityRegion | "all" } = {},
  onData: (posts: CommunityPost[]) => void,
  onError?: (err: Error) => void
): () => void {
  const { region } = options;
  let q = query(postsRef(), orderBy("createdAt", "desc"), limit(20));
  if (region && region !== "all") {
    q = query(
      postsRef(),
      where("region", "==", region),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs
        .map((d) => toPost(d))
        .filter((p): p is CommunityPost => p !== null);
      onData(posts);
    },
    (err) => onError?.(err)
  );
}

export async function getPost(postId: string): Promise<CommunityPost | null> {
  const snap = await getDoc(postRef(postId));
  return toPost(snap);
}

export async function createPost(
  input: CreatePostInput,
  authorId: string,
  authorName: string,
  authorPhotoURL: string
): Promise<string> {
  // Build base data — never include undefined values (Firestore rejects them)
  const data: Record<string, unknown> = {
    authorId,
    authorName,
    authorPhotoURL,
    title: input.title,
    content: input.content,
    destination: input.destination,
    region: input.region,
    imageUrls: input.imageUrls,
    includeItinerary: input.includeItinerary,
    includeExpenses: input.includeExpenses,
    likeCount: 0,
    commentCount: 0,
    cloneCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  // Conditionally include optional fields only when they have a value
  if (input.tripId !== undefined) data.tripId = input.tripId;
  if (input.itinerarySnapshot !== undefined)
    // stripUndefined: activity.startTime / .location may be undefined (Firestore rejects them)
    data.itinerarySnapshot = stripUndefined(input.itinerarySnapshot);
  if (input.expenseSnapshot !== undefined)
    data.expenseSnapshot = stripUndefined(input.expenseSnapshot);

  const ref = await addDoc(postsRef(), data);
  return ref.id;
}

export async function deletePost(postId: string): Promise<void> {
  // Delete all comments in the subcollection first
  const commentSnap = await getDocs(commentsRef(postId));
  const deletes = commentSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletes);
  await deleteDoc(postRef(postId));
}

/** Returns how many community posts are linked to a given trip. */
export async function countPostsByTripId(tripId: string): Promise<number> {
  const snap = await getDocs(query(postsRef(), where("tripId", "==", tripId)));
  return snap.size;
}

/** Deletes all community posts (and their comments) linked to a trip. */
export async function deletePostsByTripId(tripId: string): Promise<void> {
  const snap = await getDocs(query(postsRef(), where("tripId", "==", tripId)));
  await Promise.all(snap.docs.map((d) => deletePost(d.id)));
}

export async function updatePost(
  postId: string,
  input: UpdatePostInput
): Promise<void> {
  const data: Record<string, unknown> = {
    title: input.title,
    content: input.content,
    destination: input.destination,
    region: input.region,
    imageUrls: input.imageUrls,
    includeItinerary: input.includeItinerary,
    includeExpenses: input.includeExpenses,
    isEdited: true,
    updatedAt: serverTimestamp(),
  };
  if (input.tripId !== undefined) data.tripId = input.tripId;
  // Only null-out a snapshot when the user explicitly unchecked it.
  // If includeX=true but the new snapshot is undefined (rebuild failed due to
  // missing trip data in edit mode), leave the field untouched so Firestore
  // preserves the existing value.
  if (!input.includeItinerary) {
    data.itinerarySnapshot = null;
  } else if (input.itinerarySnapshot !== undefined) {
    data.itinerarySnapshot = stripUndefined(input.itinerarySnapshot);
  }
  if (!input.includeExpenses) {
    data.expenseSnapshot = null;
  } else if (input.expenseSnapshot !== undefined) {
    data.expenseSnapshot = stripUndefined(input.expenseSnapshot);
  }

  await updateDoc(postRef(postId), data);
}

// ─── Likes ────────────────────────────────────────────────────
export function toggleLike(postId: string, userId: string): Promise<boolean> {
  const ref = likeRef(postId, userId);
  const pRef = postRef(postId);

  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(ref);
    const postSnap = await tx.get(pRef);
    if (!postSnap.exists()) throw new Error("Post not found");

    const currentCount = (postSnap.data() as CommunityPostDoc).likeCount ?? 0;

    if (likeSnap.exists()) {
      tx.delete(ref);
      tx.update(pRef, { likeCount: Math.max(0, currentCount - 1) });
      return false; // unliked
    } else {
      const likeData: LikeDoc = {
        userId,
        createdAt: serverTimestamp() as unknown as Timestamp,
      };
      tx.set(ref, likeData);
      tx.update(pRef, { likeCount: currentCount + 1 });
      return true; // liked
    }
  });
}

export async function hasLiked(
  postId: string,
  userId: string
): Promise<boolean> {
  const snap = await getDoc(likeRef(postId, userId));
  return snap.exists();
}

// ─── Comments ─────────────────────────────────────────────────
export function subscribeToComments(
  postId: string,
  onData: (comments: Comment[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(commentsRef(postId), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toComment(d))),
    (err) => onError?.(err)
  );
}

export async function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  authorPhotoURL: string,
  content: string,
  imageUrl?: string | null,
  gifUrl?: string | null
): Promise<void> {
  const data: Record<string, unknown> = {
    postId,
    authorId,
    authorName,
    authorPhotoURL,
    content,
    isEdited: false,
    createdAt: serverTimestamp(),
    updatedAt: null,
  };
  if (imageUrl != null) data.imageUrl = imageUrl;
  if (gifUrl != null) data.gifUrl = gifUrl;
  await addDoc(commentsRef(postId), data);
  // increment commentCount
  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(postRef(postId));
    if (!pSnap.exists()) return;
    const cur = (pSnap.data() as CommunityPostDoc).commentCount ?? 0;
    tx.update(postRef(postId), { commentCount: cur + 1 });
  });
}

export async function updateComment(
  postId: string,
  commentId: string,
  content: string,
  imageUrl?: string | null,
  gifUrl?: string | null
): Promise<void> {
  await updateDoc(doc(commentsRef(postId), commentId), {
    content,
    ...(imageUrl !== undefined && { imageUrl: imageUrl ?? null }),
    ...(gifUrl !== undefined && { gifUrl: gifUrl ?? null }),
    isEdited: true,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteComment(
  postId: string,
  commentId: string
): Promise<void> {
  await deleteDoc(doc(commentsRef(postId), commentId));
  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(postRef(postId));
    if (!pSnap.exists()) return;
    const cur = (pSnap.data() as CommunityPostDoc).commentCount ?? 0;
    tx.update(postRef(postId), { commentCount: Math.max(0, cur - 1) });
  });
}

// ─── Clone trip ───────────────────────────────────────────────
/** Increments cloneCount on the post. Actual trip creation is handled by tripService. */
export async function incrementCloneCount(postId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const pSnap = await tx.get(postRef(postId));
    if (!pSnap.exists()) return;
    const cur = (pSnap.data() as CommunityPostDoc).cloneCount ?? 0;
    tx.update(postRef(postId), { cloneCount: cur + 1 });
  });
}

// ─── User like status (batch) ─────────────────────────────────
export async function fetchLikedPostIds(
  postIds: string[],
  userId: string
): Promise<Set<string>> {
  const liked = new Set<string>();
  await Promise.all(
    postIds.map(async (pid) => {
      const snap = await getDoc(likeRef(pid, userId));
      if (snap.exists()) liked.add(pid);
    })
  );
  return liked;
}
