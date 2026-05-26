import { useNavigate } from "@tanstack/react-router";
import { Loader2, PenSquare, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CreatePostDialog } from "@/components/organisms/CreatePostDialog";
import { PostCard } from "@/components/organisms/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommunity } from "@/hooks/useCommunity";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import { deletePost } from "@/services/communityService";
import { useAuthStore } from "@/stores/authStore";

import type { CommunityPost, CommunityRegion } from "@/types/community";

const REGION_FILTERS: { value: CommunityRegion | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "north", label: "Miền Bắc" },
  { value: "central", label: "Miền Trung" },
  { value: "south", label: "Miền Nam" },
  { value: "other", label: "Khác" },
];

export default function CommunityPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { trips } = useTrips();

  const {
    posts,
    isLoading,
    hasMore,
    likedIds,
    loadMore,
    handleToggleLike,
    region,
    setRegion,
    refetch,
  } = useCommunity();

  const handleRequireAuth = () => {
    toast.error("Bạn cần đăng nhập để thực hiện thao tác này.");
  };

  const handleShareClick = () => {
    if (!user) {
      handleRequireAuth();
      return;
    }
    setShowCreateDialog(true);
  };

  const handleDeletePost = async (post: CommunityPost) => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await deletePost(post.id);
      toast.success("Đã xóa bài viết");
      refetch();
    } catch {
      toast.error("Không thể xóa bài viết");
    }
  };

  const filteredPosts = searchQuery.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <MainLayout currentPath="/community">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-2xl text-on-surface">🌍 Cộng đồng</h1>
            <p className="mt-0.5 text-on-surface-variant text-sm">
              Chia sẻ và khám phá các chuyến đi thú vị
            </p>
          </div>
          <Button
            onClick={handleShareClick}
            className="shrink-0 bg-primary-500 text-white"
          >
            <PenSquare className="mr-1.5 h-4 w-4" />
            Chia sẻ
          </Button>
        </div>

        {/* ── Search ──────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
          <Input
            placeholder="Tìm kiếm điểm đến, tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* ── Region filters ──────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {REGION_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={region === f.value ? "default" : "outline"}
              onClick={() => setRegion(f.value as CommunityRegion | "all")}
              className={region === f.value ? "bg-primary-500 text-white" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* ── Posts list ──────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <p className="text-lg">Chưa có bài viết nào.</p>
            <p className="mt-1 text-sm">
              Hãy là người đầu tiên chia sẻ chuyến đi!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isLiked={likedIds.has(post.id)}
                onLike={() => handleToggleLike(post.id)}
                onView={() =>
                  navigate({
                    to: "/community/$postId",
                    params: { postId: post.id },
                  })
                }
                isAuthenticated={!!user}
                onRequireAuth={handleRequireAuth}
                currentUserId={user?.uid}
                onEdit={(p) => setEditingPost(p)}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !searchQuery && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={loadMore}>
              Xem thêm
            </Button>
          </div>
        )}
      </div>

      {/* Create post dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        trips={trips}
        onSuccess={(postId) => {
          refetch();
          navigate({ to: "/community/$postId", params: { postId } });
        }}
      />

      {/* Edit post dialog */}
      {editingPost && (
        <CreatePostDialog
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
          trips={trips}
          editPost={editingPost}
          onSuccess={() => {
            setEditingPost(null);
            refetch();
          }}
        />
      )}
    </MainLayout>
  );
}
