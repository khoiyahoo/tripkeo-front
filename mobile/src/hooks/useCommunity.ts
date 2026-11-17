import type { DocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchLikedPostIds,
  fetchPosts,
  type PostsPage,
  subscribeToPosts,
  toggleLike,
} from "@/services/communityService";
import { useAuthStore } from "@/stores/authStore";

import type { CommunityPost, CommunityRegion } from "@/types/community";

interface UseCommunityResult {
  posts: CommunityPost[];
  isLoading: boolean;
  hasMore: boolean;
  likedIds: Set<string>;
  loadMore: () => Promise<void>;
  handleToggleLike: (postId: string) => Promise<void>;
  region: CommunityRegion | "all";
  setRegion: (r: CommunityRegion | "all") => void;
  refetch: () => void;
}

export function useCommunity(): UseCommunityResult {
  const user = useAuthStore((s) => s.user);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState<CommunityRegion | "all">("all");
  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  // Subscribe to first page
  useEffect(() => {
    setIsLoading(true);
    setPosts([]);
    lastDocRef.current = null;

    const unsub = subscribeToPosts(
      { region: region === "all" ? undefined : region },
      (data) => {
        setPosts(data);
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );
    return unsub;
  }, [region]);

  // Manually refresh by fetching the latest page (used after create/edit/delete)
  const refetch = useCallback(async () => {
    lastDocRef.current = null;
    const page = await fetchPosts({
      region: region === "all" ? undefined : region,
    });
    setPosts(page.posts);
    lastDocRef.current = page.lastDoc;
    setHasMore(page.hasMore);
  }, [region]);

  // Fetch liked status when posts or user changes
  useEffect(() => {
    if (!user || posts.length === 0) {
      setLikedIds(new Set());
      return;
    }
    fetchLikedPostIds(
      posts.map((p) => p.id),
      user.uid
    ).then(setLikedIds);
  }, [posts, user]);

  const loadMore = useCallback(async () => {
    const page: PostsPage = await fetchPosts({
      region: region === "all" ? undefined : region,
      after: lastDocRef.current,
    });
    setPosts((prev) => [...prev, ...page.posts]);
    lastDocRef.current = page.lastDoc;
    setHasMore(page.hasMore);
  }, [region]);

  const handleToggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const nowLiked = await toggleLike(postId, user.uid);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (nowLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      // Optimistically update count
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likeCount: p.likeCount + (nowLiked ? 1 : -1) }
            : p
        )
      );
    },
    [user]
  );

  return {
    posts,
    isLoading,
    hasMore,
    likedIds,
    loadMore,
    handleToggleLike,
    region,
    setRegion,
    refetch,
  };
}
