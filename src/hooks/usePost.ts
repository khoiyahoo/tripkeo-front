import { useCallback, useEffect, useState } from "react";

import {
  addComment,
  deleteComment,
  getPost,
  hasLiked,
  incrementCloneCount,
  subscribeToComments,
  toggleLike,
} from "@/services/communityService";
import { useAuthStore } from "@/stores/authStore";

import type { Comment, CommunityPost } from "@/types/community";

interface UsePostResult {
  post: CommunityPost | null;
  isLoading: boolean;
  comments: Comment[];
  isLiked: boolean;
  handleToggleLike: () => Promise<void>;
  handleAddComment: (content: string) => Promise<void>;
  handleDeleteComment: (commentId: string) => Promise<void>;
  handleClone: () => Promise<void>;
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
    async (content: string) => {
      if (!user) return;
      await addComment(
        postId,
        user.uid,
        user.displayName ?? "Ẩn danh",
        user.photoURL ?? "",
        content
      );
    },
    [postId, user]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await deleteComment(postId, commentId);
    },
    [postId]
  );

  const handleClone = useCallback(async () => {
    await incrementCloneCount(postId);
  }, [postId]);

  return {
    post,
    isLoading,
    comments,
    isLiked,
    handleToggleLike,
    handleAddComment,
    handleDeleteComment,
    handleClone,
  };
}
