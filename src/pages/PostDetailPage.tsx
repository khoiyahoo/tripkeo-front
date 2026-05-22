import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { usePost } from "@/hooks/usePost";
import { MainLayout } from "@/layouts/MainLayout";
import { cn } from "@/lib/utils";
import { createTrip } from "@/services/tripService";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/utils/format";

import type { ActivityType } from "@/types/trip";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  food: "Ăn uống",
  transport: "Di chuyển",
  stay: "Chỗ ở",
  sights: "Tham quan",
  shopping: "Mua sắm",
  entertainment: "Giải trí",
  other: "Khác",
};

export default function PostDetailPage() {
  const { postId } = useParams({ from: "/community/$postId" });
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    post,
    isLoading,
    comments,
    isLiked,
    handleToggleLike,
    handleAddComment,
    handleDeleteComment,
    handleClone,
  } = usePost(postId);

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const handleRequireAuth = () =>
    toast.error("Bạn cần đăng nhập để thực hiện thao tác này.");

  const handleLike = async () => {
    if (!user) {
      handleRequireAuth();
      return;
    }
    await handleToggleLike();
  };

  const handleSubmitComment = async () => {
    if (!user) {
      handleRequireAuth();
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    setIsSubmittingComment(true);
    try {
      await handleAddComment(text);
      setCommentText("");
    } catch {
      toast.error("Không thể gửi bình luận");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCloneTrip = async () => {
    if (!user) {
      handleRequireAuth();
      return;
    }
    if (!post?.itinerarySnapshot?.length) {
      toast.error("Bài viết không có lịch trình để clone");
      return;
    }
    setIsCloning(true);
    try {
      const tripId = await createTrip(
        {
          name: `Clone: ${post.title}`,
          destination: post.destination,
          coverImage: post.imageUrls[0] ?? "",
          startDate:
            post.itinerarySnapshot[0]?.date ??
            new Date().toISOString().split("T")[0],
          endDate:
            post.itinerarySnapshot[post.itinerarySnapshot.length - 1]?.date ??
            new Date().toISOString().split("T")[0],
          currency: "VND",
        },
        user.uid,
        user.displayName ?? "Ẩn danh",
        user.email ?? "",
        user.photoURL ?? ""
      );
      await handleClone();
      toast.success("Đã clone chuyến đi!");
      navigate({ to: "/trips/$tripId", params: { tripId } });
    } catch {
      toast.error("Không thể clone chuyến đi");
    } finally {
      setIsCloning(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout currentPath="/community">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      </MainLayout>
    );
  }

  if (!post) {
    return (
      <MainLayout currentPath="/community">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <p className="text-on-surface-variant">Bài viết không tồn tại.</p>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/community" })}
          >
            Quay lại
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPath="/community">
      <div className="mx-auto h-screen max-w-2xl space-y-6 rounded-md bg-surface-card px-4 py-6 sm:px-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/community" })}
          className="gap-1.5 text-on-surface-variant"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        {/* Author header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.authorPhotoURL} alt={post.authorName} />
            <AvatarFallback>
              {post.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-on-surface">{post.authorName}</p>
            <p className="text-on-surface-variant/60 text-xs">
              {timeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Title + content */}
        <div>
          <h1 className="font-bold text-on-surface text-xl">📍 {post.title}</h1>
          {post.destination && (
            <p className="mt-1 text-on-surface-variant text-sm">
              Điểm đến: <strong>{post.destination}</strong>
            </p>
          )}
          <p className="mt-3 whitespace-pre-wrap text-base text-on-surface leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Image gallery */}
        {post.imageUrls.length > 0 && (
          <div>
            <p className="mb-2 font-semibold text-on-surface text-sm">
              📸 Hình ảnh
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {post.imageUrls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() =>
                    setSelectedImage(i === selectedImage ? null : i)
                  }
                  className={cn(
                    "overflow-hidden rounded-lg bg-secondary-800",
                    i === 0 && post.imageUrls.length > 1
                      ? "col-span-2 row-span-2"
                      : ""
                  )}
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Itinerary snapshot */}
        {post.itinerarySnapshot && post.itinerarySnapshot.length > 0 && (
          <div>
            <p className="mb-2 font-semibold text-on-surface text-sm">
              📅 Lịch trình
            </p>
            <div className="space-y-2">
              {post.itinerarySnapshot.map((day) => (
                <div key={day.date} className="rounded-xl bg-surface-card p-3">
                  <p className="font-semibold text-on-surface text-sm">
                    Ngày {day.dayNumber} — {day.date}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {day.activities.map((a, i) => {
                      const cfg =
                        ACTIVITY_TYPE_CONFIG[a.category as ActivityType];
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-1.5 text-on-surface-variant text-sm"
                        >
                          <span>{cfg?.icon ?? "📌"}</span>
                          {a.startTime && (
                            <span className="font-mono text-on-surface-variant/60 text-xs">
                              {a.startTime}
                            </span>
                          )}
                          <span>{a.title}</span>
                          {a.location && (
                            <span className="text-xs opacity-60">
                              · {a.location}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense snapshot */}
        {post.expenseSnapshot && (
          <div>
            <p className="mb-2 font-semibold text-on-surface text-sm">
              💰 Chi phí
            </p>
            <div className="rounded-xl bg-surface-card p-4">
              <div className="mb-3 flex flex-wrap gap-4">
                <div>
                  <p className="text-on-surface-variant text-xs">Tổng chi</p>
                  <p className="font-bold text-lg text-tertiary-500">
                    {formatCurrency(post.expenseSnapshot.total)}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs">Số người</p>
                  <p className="font-bold text-lg text-on-surface">
                    {post.expenseSnapshot.memberCount}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs">
                    Bình quân/người
                  </p>
                  <p className="font-bold text-lg text-primary-500">
                    ~{formatCurrency(post.expenseSnapshot.perPerson)}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {Object.entries(post.expenseSnapshot.byCategory).map(
                  ([cat, amount]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-on-surface-variant">
                        {EXPENSE_CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="font-medium text-on-surface">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-black/5 border-y py-3">
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
              isLiked
                ? "bg-primary-500/10 text-primary-500"
                : "text-on-surface-variant hover:bg-secondary-800"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-primary-500")} />
            {post.likeCount} thích
          </button>
          <span className="flex items-center gap-1.5 text-on-surface-variant text-sm">
            <MessageCircle className="h-4 w-4" />
            {post.commentCount} bình luận
          </span>
          {post.itinerarySnapshot && post.itinerarySnapshot.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={handleCloneTrip}
              disabled={isCloning || !user}
            >
              {isCloning ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                "📋 "
              )}
              Clone chuyến đi
            </Button>
          )}
        </div>

        {/* Comments */}
        <div>
          <p className="mb-3 font-semibold text-on-surface text-sm">
            Bình luận
          </p>
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={c.authorPhotoURL} alt={c.authorName} />
                  <AvatarFallback>
                    {c.authorName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-xl bg-surface-card px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-on-surface text-xs">
                      {c.authorName}
                    </span>
                    <span className="text-on-surface-variant/50 text-xs">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-on-surface text-sm">{c.content}</p>
                </div>
                {(user?.uid === c.authorId || user?.uid === post.authorId) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    className="mt-2 shrink-0 rounded-md p-1 text-error-400 hover:bg-error-900/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add comment */}
          {user ? (
            <div className="mt-4 flex items-start gap-2.5">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage
                  src={user.photoURL ?? ""}
                  alt={user.displayName ?? ""}
                />
                <AvatarFallback>
                  {(user.displayName ?? "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 gap-2">
                <Textarea
                  placeholder="Viết bình luận..."
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  className="resize-none text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="mt-0.5 bg-primary-500 text-white"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-center text-on-surface-variant text-sm">
              <button
                type="button"
                onClick={handleRequireAuth}
                className="text-primary-500 hover:underline"
              >
                Đăng nhập
              </button>{" "}
              để bình luận
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
