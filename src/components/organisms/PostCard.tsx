import {
  Heart,
  MessageCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

import type { CommunityPost } from "@/types/community";

const REGION_LABELS: Record<string, string> = {
  north: "Miền Bắc",
  central: "Miền Trung",
  south: "Miền Nam",
  other: "Khác",
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

interface PostCardProps {
  post: CommunityPost;
  isLiked: boolean;
  onLike: () => void;
  onView: () => void;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  currentUserId?: string;
  onEdit?: (post: CommunityPost) => void;
  onDelete?: (post: CommunityPost) => void;
}

export const PostCard = ({
  post,
  isLiked,
  onLike,
  onView,
  isAuthenticated,
  onRequireAuth,
  currentUserId,
  onEdit,
  onDelete,
}: PostCardProps) => {
  const handleLike = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    onLike();
  };

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-2xl bg-surface-card ring-1 ring-black/5 transition hover:ring-primary-500/30"
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onView();
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.authorPhotoURL} alt={post.authorName} />
            <AvatarFallback>
              {post.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-on-surface text-sm leading-tight">
              {post.authorName}
            </p>
            <p className="text-on-surface-variant/60 text-xs">
              {timeAgo(post.createdAt)}
              {post.isEdited && (
                <span className="ml-1 text-on-surface-variant/40">
                  (đã sửa)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="shrink-0 text-xs">
            {REGION_LABELS[post.region] ?? post.region}
          </Badge>
          {currentUserId === post.authorId && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-secondary-800/50"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(post)}
                    className="text-error-400 focus:text-error-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa bài viết
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Title + content */}
      <div className="px-4 pt-1 pb-2">
        <h3 className="font-bold text-base text-on-surface leading-snug">
          📍 {post.title}
        </h3>
        {post.content && (
          <p className="mt-1 line-clamp-2 text-on-surface-variant text-sm">
            &quot;{post.content}&quot;
          </p>
        )}
      </div>

      {/* Images */}
      {post.imageUrls.length > 0 && (
        <div className="flex gap-1.5 overflow-hidden px-4 pb-2">
          {post.imageUrls.slice(0, 3).map((url, i) => (
            <div
              key={url}
              className="relative h-20 flex-1 overflow-hidden rounded-lg bg-secondary-800"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 2 && post.imageUrls.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 font-bold text-sm text-white">
                  +{post.imageUrls.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expense overview */}
      {post.expenseSnapshot && (
        <div className="mx-4 mb-2 rounded-lg bg-secondary-800/50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3 w-3 text-on-surface-variant/60" />
            <span className="text-on-surface-variant">
              {post.expenseSnapshot.memberCount} người
            </span>
            <span className="mx-1 text-on-surface-variant/40">·</span>
            <span className="font-semibold text-tertiary-500">
              ~{formatCurrency(post.expenseSnapshot.perPerson)}/người
            </span>
            <span className="mx-1 text-on-surface-variant/40">·</span>
            <span className="text-on-surface-variant">
              Tổng {formatCurrency(post.expenseSnapshot.total)}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center gap-4 border-black/5 border-t px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1 text-sm transition-colors",
            isLiked
              ? "text-primary-500"
              : "text-on-surface-variant hover:text-primary-400"
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-primary-500")} />
          {post.likeCount}
        </button>
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1 text-on-surface-variant text-sm hover:text-on-surface"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount}
        </button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 px-2 text-xs"
          onClick={onView}
        >
          Xem chi tiết →
        </Button>
      </div>
    </article>
  );
};
