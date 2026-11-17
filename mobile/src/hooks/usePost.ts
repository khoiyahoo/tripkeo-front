import { useCallback, useEffect, useState } from "react";

import {
  addComment,
  deleteComment,
  deletePost,
  getPost,
  hasLiked,
  incrementCloneCount,
  subscribeToComments,
  toggleLike,
  updateComment,
  updatePost,
} from "@/services/communityService";
import { useAuthStore } from "@/stores/authStore";

import type {
  Comment,
  CommunityPost,
  UpdatePostInput,
} from "@/types/community";

interface UsePostResult {
  post: CommunityPost | null;
  isLoading: boolean;
  comments: Comment[];
  isLiked: boolean;
  handleToggleLike: () => Promise<void>;
  handleAddComment: (
    content: string,
    imageUrl?: string | null,
    gifUrl?: string | null
  ) => Promise<void>;
  handleDeleteComment: (commentId: string) => Promise<void>;
  handleUpdateComment: (
    commentId: string,
    content: string,
    imageUrl?: string | null,
    gifUrl?: string | null
  ) => Promise<void>;
  handleUpdatePost: (input: UpdatePostInput) => Promise<void>;
  handleDeletePost: () => Promise<void>;
  handleClone: () => Promise<void>;
  refetchPost: () => Promise<void>;
  setPost: React.Dispatch<React.SetStateAction<CommunityPost | null>>;
}

export function usePost(postId: string): UsePostResult {
  const user = useAuthStore((s) => s.user);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getPost(postId)
      .then((p) => {
        setPost(p);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [postId]);

  useEffect(() => {
    const unsub = subscribeToComments(postId, setComments);
    return unsub;
  }, [postId]);

  useEffect(() => {
    if (!user) {
      setIsLiked(false);
      return;
    }
    hasLiked(postId, user.uid).then(setIsLiked);
  }, [postId, user]);

  const handleToggleLike = useCallback(async () => {
    if (!user) return;
    const nowLiked = await toggleLike(postId, user.uid);
    setIsLiked(nowLiked);
    setPost((p) =>
      p ? { ...p, likeCount: p.likeCount + (nowLiked ? 1 : -1) } : p
    );
  }, [postId, user]);

  const handleAddComment = useCallback(
    async (
      content: string,
      imageUrl?: string | null,
      gifUrl?: string | null
    ) => {
      if (!user) return;
      await addComment(
        postId,
        user.uid,
        user.displayName ?? "Ẩn danh",
        user.photoURL ?? "",
        content,
        imageUrl,
        gifUrl
      );
      // Optimistically increment commentCount — the post document is fetched
      // once and has no real-time listener, so we must update locally.
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
    },
    [postId, user]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await deleteComment(postId, commentId);
      // Optimistically decrement commentCount — mirrors the Firestore transaction.
      setPost((p) =>
        p ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
      );
    },
    [postId]
  );

  const handleUpdateComment = useCallback(
    async (
      commentId: string,
      content: string,
      imageUrl?: string | null,
      gifUrl?: string | null
    ) => {
      await updateComment(postId, commentId, content, imageUrl, gifUrl);
    },
    [postId]
  );

  const handleUpdatePost = useCallback(
    async (input: UpdatePostInput) => {
      await updatePost(postId, input);
      setPost((p) =>
        p
          ? {
              ...p,
              title: input.title,
              content: input.content,
              region: input.region,
              imageUrls: input.imageUrls,
              destination: input.destination,
              includeItinerary: input.includeItinerary,
              includeExpenses: input.includeExpenses,
              itinerarySnapshot: input.itinerarySnapshot,
              expenseSnapshot: input.expenseSnapshot,
              isEdited: true,
            }
          : p
      );
    },
    [postId]
  );

  const handleDeletePost = useCallback(async () => {
    await deletePost(postId);
  }, [postId]);

  const handleClone = useCallback(async () => {
    await incrementCloneCount(postId);
  }, [postId]);

  const refetchPost = useCallback(async () => {
    const updated = await getPost(postId);
    if (updated) setPost(updated);
  }, [postId]);

  return {
    post,
    isLoading,
    comments,
    isLiked,
    handleToggleLike,
    handleAddComment,
    handleDeleteComment,
    handleUpdateComment,
    handleUpdatePost,
    handleDeletePost,
    handleClone,
    refetchPost,
    setPost,
  };
}
