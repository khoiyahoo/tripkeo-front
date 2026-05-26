import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import MDEditor from "@uiw/react-md-editor";
import { addDays, format } from "date-fns";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  Heart,
  Image,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Send,
  Smile,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CloneItineraryDialog } from "@/components/organisms/CloneItineraryDialog";
import { CreatePostDialog } from "@/components/organisms/CreatePostDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { usePost } from "@/hooks/usePost";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/services/cloudinaryService";
import { createTrip } from "@/services/tripService";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/utils/format";

import type { Comment } from "@/types/community";
import type { ActivityType } from "@/types/trip";

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

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
  food: "🍜 Ăn uống",
  transport: "🚗 Di chuyển",
  stay: "🏨 Chỗ ở",
  ticket: "🎡 Tham quan",
  shopping: "🛍️ Mua sắm",
  entertainment: "🎭 Giải trí",
  other: "📦 Khác",
};

// GIF Picker
interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchGifs = async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      if (GIPHY_API_KEY) {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`
        );
        const json = (await res.json()) as {
          data: {
            id: string;
            title: string;
            images: {
              fixed_height_small: { url: string };
              original: { url: string };
            };
          }[];
        };
        setGifs(
          json.data.map((g) => ({
            id: g.id,
            title: g.title,
            url: g.images.original.url,
            previewUrl: g.images.fixed_height_small.url,
          }))
        );
      } else {
        const res = await fetch(
          `https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=LIVDSRZULELA&limit=12&contentfilter=medium&media_filter=basic`
        );
        const json = (await res.json()) as {
          results?: {
            id: string;
            title: string;
            media: {
              gif: { url: string };
              tinygif: { url: string };
            }[];
          }[];
        };
        setGifs(
          (json.results ?? []).map((g) => ({
            id: g.id,
            title: g.title,
            url: g.media[0]?.gif.url ?? "",
            previewUrl: g.media[0]?.tinygif.url ?? "",
          }))
        );
      }
    } catch {
      toast.error("Không thể tải GIF");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-72 rounded-sm border border-input bg-white p-3 shadow-lg">
      <div className="mb-2 flex gap-2">
        <input
          className="h-8 flex-1 rounded-sm border border-input bg-[#f2f2f2] px-2 text-gray-400 text-sm outline-none"
          placeholder="Tìm GIF..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") searchGifs(query);
          }}
        />
        <Button
          size="sm"
          onClick={() => searchGifs(query)}
          disabled={isSearching}
          className="h-8 px-2 text-xs"
        >
          {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Tìm"}
        </Button>
      </div>
      <div className="grid max-h-52 grid-cols-3 gap-1 overflow-y-auto">
        {gifs.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.url)}
            className="overflow-hidden rounded-sm hover:opacity-80"
          >
            <img
              src={g.previewUrl}
              alt={g.title}
              className="h-16 w-full object-cover"
            />
          </button>
        ))}
        {gifs.length === 0 && !isSearching && (
          <p className="col-span-3 py-4 text-center text-on-surface-variant/60 text-xs">
            Tìm kiếm để xem GIF
          </p>
        )}
      </div>
    </div>
  );
}

// Comment Item
function CommentItem({
  comment,
  postAuthorId,
  currentUserId,
  onDelete,
  onUpdate,
}: {
  comment: Comment;
  postAuthorId: string;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    content: string,
    imageUrl?: string | null,
    gifUrl?: string | null
  ) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(
    comment.imageUrl ?? null
  );
  const [editGifUrl, setEditGifUrl] = useState<string | null>(
    comment.gifUrl ?? null
  );
  const [editImagePreview, setEditImagePreview] = useState<string | null>(
    comment.imageUrl ?? null
  );
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [showEditEmoji, setShowEditEmoji] = useState(false);
  const [showEditGif, setShowEditGif] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canModify =
    currentUserId === comment.authorId || currentUserId === postAuthorId;

  const handleSave = async () => {
    if (!editText.trim() && !editImageUrl && !editGifUrl) return;
    setIsSaving(true);
    try {
      await onUpdate(comment.id, editText.trim(), editImageUrl, editGifUrl);
      setIsEditing(false);
      toast.success("Bình luận đã được cập nhật");
    } catch {
      toast.error("Không thể cập nhật bình luận");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImagePreview(URL.createObjectURL(file));
    setIsUploadingEditImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setEditImageUrl(url);
      setEditGifUrl(null);
    } catch {
      toast.error("Không thể upload ảnh");
      setEditImagePreview(null);
    } finally {
      setIsUploadingEditImage(false);
    }
  };

  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.authorPhotoURL} alt={comment.authorName} />
        <AvatarFallback>
          {comment.authorName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 rounded-sm bg-secondary-800/30 px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-on-surface text-xs">
            {comment.authorName}
          </span>
          <span className="text-on-surface-variant/50 text-xs">
            {timeAgo(comment.createdAt)}
            {comment.isEdited && (
              <span className="ml-1 opacity-60">(đã sửa)</span>
            )}
          </span>
        </div>

        {isEditing ? (
          <div className="mt-1.5 space-y-1.5">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="resize-none bg-surface-card text-sm"
              autoFocus
            />

            {/* Attachment preview */}
            {(editImagePreview || editGifUrl) && (
              <div className="relative inline-block">
                <img
                  src={editImagePreview ?? editGifUrl ?? ""}
                  alt="attachment"
                  className="max-h-32 rounded-sm object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setEditImageUrl(null);
                    setEditImagePreview(null);
                    setEditGifUrl(null);
                  }}
                  className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
                >
                  ×
                </button>
                {isUploadingEditImage && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/40">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-1">
              {/* Emoji */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEmoji((v) => !v);
                    setShowEditGif(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant hover:bg-secondary-800/50"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
                {showEditEmoji && (
                  <div className="absolute bottom-9 left-0 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: { native: string }) => {
                        setEditText((t) => t + emoji.native);
                        setShowEditEmoji(false);
                      }}
                      locale="vi"
                      theme="light"
                      previewPosition="none"
                    />
                  </div>
                )}
              </div>

              {/* GIF */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditGif((v) => !v);
                    setShowEditEmoji(false);
                  }}
                  className="flex h-7 items-center justify-center rounded-sm px-1.5 font-bold text-on-surface-variant text-xs hover:bg-secondary-800/50"
                >
                  GIF
                </button>
                {showEditGif && (
                  <div className="absolute bottom-9 left-0 z-50">
                    <GifPicker
                      onSelect={(url) => {
                        setEditGifUrl(url);
                        setEditImageUrl(null);
                        setEditImagePreview(null);
                        setShowEditGif(false);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Image upload */}
              <button
                type="button"
                onClick={() => editFileRef.current?.click()}
                className="flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant hover:bg-secondary-800/50"
              >
                <Image className="h-3.5 w-3.5" />
              </button>
              <input
                ref={editFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEditImageChange}
              />

              {/* Actions */}
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                    setEditImageUrl(comment.imageUrl ?? null);
                    setEditGifUrl(comment.gifUrl ?? null);
                    setEditImagePreview(comment.imageUrl ?? null);
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    isSaving ||
                    isUploadingEditImage ||
                    (!editText.trim() && !editImageUrl && !editGifUrl)
                  }
                  className="h-7 bg-primary-500 px-2 text-white text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Lưu"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-0.5 text-on-surface text-sm">{comment.content}</p>
            {comment.imageUrl && (
              <img
                src={comment.imageUrl}
                alt="comment-img"
                className="mt-1.5 max-h-48 rounded-sm object-cover"
              />
            )}
            {comment.gifUrl && (
              <img
                src={comment.gifUrl}
                alt="gif"
                className="mt-1.5 max-h-40 rounded-sm"
              />
            )}
          </>
        )}
        {canModify && !isEditing && (
          <div className="flex shrink-0 justify-end gap-0.5 pt-1.5">
            {currentUserId === comment.authorId && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-md p-1 text-on-surface-variant/60 hover:bg-secondary-800/50 hover:text-on-surface"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md p-1 text-error-400/70 hover:bg-error-900/20 hover:text-error-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Xóa bình luận</DialogTitle>
          </DialogHeader>
          <p className="text-on-surface-variant text-sm">
            Bạn có chắc muốn xóa bình luận này không? Hành động này không thể
            hoàn tác.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete(comment.id);
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Comment Input
function CommentInput({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (
    content: string,
    imageUrl?: string | null,
    gifUrl?: string | null
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setIsUploadingImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      toast.error("Không thể upload ảnh");
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageUrl && !gifUrl) return;
    await onSubmit(text.trim(), imageUrl, gifUrl);
    setText("");
    setImageUrl(null);
    setGifUrl(null);
    setImagePreview(null);
  };

  const handleGifSelect = (url: string) => {
    setGifUrl(url);
    setImageUrl(null);
    setImagePreview(null);
    setShowGif(false);
  };

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Viết bình luận..."
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="resize-none bg-surface-card text-sm"
      />

      {(imagePreview || gifUrl) && (
        <div className="relative inline-block">
          <img
            src={imagePreview ?? gifUrl ?? ""}
            alt="attachment"
            className="max-h-32 rounded-sm object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setImageUrl(null);
              setImagePreview(null);
              setGifUrl(null);
            }}
            className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
          >
            ×
          </button>
          {isUploadingImage && (
            <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/40">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* Emoji */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowGif(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-on-surface-variant hover:bg-secondary-800/50"
          >
            <Smile className="h-4 w-4" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 left-0 z-50">
              <Picker
                data={data}
                onEmojiSelect={(emoji: { native: string }) => {
                  setText((t) => t + emoji.native);
                  setShowEmoji(false);
                }}
                locale="vi"
                theme="light"
                previewPosition="none"
              />
            </div>
          )}
        </div>

        {/* GIF */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowGif((v) => !v);
              setShowEmoji(false);
            }}
            className="flex h-8 items-center justify-center rounded-sm px-2 font-bold text-on-surface-variant text-xs hover:bg-secondary-800/50"
          >
            GIF
          </button>
          {showGif && (
            <div className="absolute bottom-10 left-0 z-50">
              <GifPicker onSelect={handleGifSelect} />
            </div>
          )}
        </div>

        {/* Image */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-on-surface-variant hover:bg-secondary-800/50"
        >
          <Image className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            isUploadingImage ||
            (!text.trim() && !imageUrl && !gifUrl)
          }
          className="ml-auto h-8 bg-primary-500 text-white"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Main page
export default function PostDetailPage() {
  const { postId } = useParams({ from: "/community/$postId" });
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openLoginDialog = useAuthStore((s) => s.openLoginDialog);

  const {
    post,
    isLoading,
    comments,
    isLiked,
    handleToggleLike,
    handleAddComment,
    handleDeleteComment,
    handleUpdateComment,
    handleDeletePost,
    handleClone,
    refetchPost,
  } = usePost(postId);

  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  const handleRequireAuth = () => openLoginDialog();

  const handleLike = async () => {
    if (!user) {
      handleRequireAuth();
      return;
    }
    await handleToggleLike();
  };

  const handleSubmitComment = async (
    content: string,
    imageUrl?: string | null,
    gifUrl?: string | null
  ) => {
    if (!user) {
      handleRequireAuth();
      return;
    }
    setIsSubmittingComment(true);
    try {
      await handleAddComment(content, imageUrl, gifUrl);
    } catch {
      toast.error("Không thể gửi bình luận");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const { trips } = useTrips();

  const handleCloneTrip = async (
    tripName: string,
    startDate: Date,
    coverImage: string
  ) => {
    if (!user || !post?.itinerarySnapshot) return;
    const snapshot = post.itinerarySnapshot;
    const dayCount = snapshot.length;
    const endDate = addDays(startDate, dayCount - 1);

    const tripId = await createTrip(
      {
        name: tripName,
        destination: post.destination,
        coverImage,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        currency: "VND",
      },
      user.uid,
      user.displayName ?? "Ẩn danh",
      user.photoURL ?? "", // Bug 4 fix: was swapped with email
      user.email ?? ""
    );

    for (const day of snapshot) {
      const dayOffset = day.dayNumber - 1;
      const actDate = format(addDays(startDate, dayOffset), "yyyy-MM-dd");
      for (const act of day.activities) {
        // Resolve category to a valid ActivityType key.
        // Old snapshots stored the label ("Di chuyển"); new ones store the key ("transport").
        const categoryEntry = Object.entries(ACTIVITY_TYPE_CONFIG).find(
          ([key, cfg]) => key === act.category || cfg.label === act.category
        );
        const categoryKey = (categoryEntry?.[0] ?? "other") as ActivityType;
        await addDoc(collection(db, "trips", tripId, "activities"), {
          date: actDate,
          title: act.title,
          startTime: act.startTime ?? null,
          category: categoryKey,
          location: act.location ?? null,
          createdBy: user.uid,
          type: "shared",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await handleClone();
    toast.success("Đã clone lịch trình!");
    navigate({ to: "/trips/$tripId", params: { tripId } });
  };

  const handleConfirmDelete = async () => {
    setIsDeletingPost(true);
    try {
      await handleDeletePost();
      toast.success("Đã xóa bài viết");
      navigate({ to: "/community" });
    } catch {
      toast.error("Không thể xóa bài viết");
    } finally {
      setIsDeletingPost(false);
      setShowDeleteConfirm(false);
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

  const isOwner = user?.uid === post.authorId;

  return (
    <MainLayout currentPath="/community">
      <div className="space-y-6 px-4 py-6 sm:px-6">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/community" })}
          className="gap-1.5 text-on-surface-variant"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>

        {/* Author header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
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
                {post.isEdited && (
                  <span className="ml-1 text-on-surface-variant/40">
                    (đã chỉnh sửa)
                  </span>
                )}
              </p>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-secondary-800/50"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-error-400 focus:text-error-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa bài viết
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="font-bold text-on-surface text-xl">📍 {post.title}</h1>
          {post.destination && (
            <p className="mt-1 text-on-surface-variant text-sm">
              Điểm đến: <strong>{post.destination}</strong>
            </p>
          )}
        </div>

        {/* Content — Markdown rendered */}
        {post.content && (
          <div data-color-mode="dark">
            <MDEditor.Markdown
              source={post.content}
              style={{
                background: "transparent",
                color: "inherit",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                lineHeight: 1.7,
              }}
            />
          </div>
        )}

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
                    "overflow-hidden rounded-sm bg-secondary-800",
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
              📅 Lịch trình chuyến đi
            </p>
            <div className="space-y-3 rounded-sm border border-secondary-700/30 bg-surface-card p-3">
              {post.itinerarySnapshot.map((day) => (
                <div key={day.date}>
                  <p className="font-semibold text-on-surface text-sm">
                    Ngày {day.dayNumber} — {day.date}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 pl-2">
                    {day.activities.map((a, i) => {
                      const cfg =
                        ACTIVITY_TYPE_CONFIG[a.category as ActivityType];
                      return (
                        <li
                          key={`${a.title}-${a.startTime ?? i}`}
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
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                if (!user) {
                  handleRequireAuth();
                  return;
                }
                setShowCloneDialog(true);
              }}
            >
              📋 Clone lịch trình
            </Button>
          </div>
        )}

        {/* Expense snapshot */}
        {post.expenseSnapshot && (
          <div>
            <p className="mb-2 font-semibold text-on-surface text-sm">
              💰 Chi phí chuyến đi
            </p>
            <div className="space-y-4 rounded-sm border border-secondary-700/30 bg-surface-card p-4">
              {/* Summary cards */}
              <div className="flex flex-wrap gap-4">
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

              {/* Category breakdown with progress bars */}
              <div className="space-y-2">
                <p className="font-medium text-on-surface-variant text-xs">
                  Theo danh mục
                </p>
                {Object.entries(post.expenseSnapshot.byCategory).map(
                  ([cat, amount]) => {
                    const total = post.expenseSnapshot?.total ?? 1;
                    const pct = Math.round((amount / total) * 100);
                    return (
                      <div key={cat} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface-variant">
                            {EXPENSE_CATEGORY_LABELS[cat] ?? cat}
                          </span>
                          <span className="font-medium text-on-surface">
                            {formatCurrency(amount)}
                            <span className="ml-1 text-on-surface-variant/60">
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary-700/40">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Expense items list */}
              {post.expenseSnapshot.items &&
                post.expenseSnapshot.items.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-medium text-on-surface-variant text-xs">
                      Chi tiết khoản chi
                    </p>
                    <div className="space-y-0.5">
                      {post.expenseSnapshot.items.map((item) => (
                        <div
                          key={`${item.category}-${item.description}-${item.amount}`}
                          className="flex items-center justify-between border-secondary-700/20 border-b py-1 text-xs last:border-0"
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0">
                              {EXPENSE_CATEGORY_LABELS[item.category]?.split(
                                " "
                              )[0] ?? "📦"}
                            </span>
                            <span className="truncate text-on-surface">
                              {item.description}
                            </span>
                          </div>
                          <span className="ml-2 shrink-0 font-medium text-on-surface">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Daily breakdown */}
              {post.expenseSnapshot.byDay &&
                post.expenseSnapshot.byDay.length > 1 &&
                (() => {
                  const days = post.expenseSnapshot!.byDay!;
                  const maxAmt = Math.max(...days.map((d) => d.amount));
                  return (
                    <div>
                      <p className="mb-1.5 font-medium text-on-surface-variant text-xs">
                        Theo ngày
                      </p>
                      <div className="space-y-1.5">
                        {days.map((day, idx) => {
                          const pct = Math.round(
                            (day.amount / (maxAmt || 1)) * 100
                          );
                          return (
                            <div key={day.date} className="space-y-0.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-on-surface-variant">
                                  Ngày {idx + 1}
                                </span>
                                <span className="font-medium text-on-surface">
                                  {formatCurrency(day.amount)}
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary-700/40">
                                <div
                                  className="h-full rounded-full bg-tertiary-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-2 font-medium text-sm transition-colors",
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
        </div>

        {/* Comments */}
        <div>
          <p className="mb-3 font-semibold text-on-surface text-sm">
            Bình luận ({comments.length})
          </p>
          <div className="space-y-3">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                postAuthorId={post.authorId}
                currentUserId={user?.uid}
                onDelete={handleDeleteComment}
                onUpdate={handleUpdateComment}
              />
            ))}
          </div>

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
              <div className="flex-1">
                <CommentInput
                  onSubmit={handleSubmitComment}
                  isSubmitting={isSubmittingComment}
                />
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

      {/* Clone dialog */}
      {showCloneDialog && post.itinerarySnapshot && (
        <CloneItineraryDialog
          open={showCloneDialog}
          onClose={() => setShowCloneDialog(false)}
          post={post}
          onConfirm={handleCloneTrip}
        />
      )}

      {/* Edit post dialog — always mounted so Radix can manage its own
          scroll-lock cleanup via the `open` prop. Conditional rendering
          unmounts the component before Radix clears body.overflow. */}
      <CreatePostDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        trips={trips}
        editPost={post}
        onSuccess={async (_id) => {
          setShowEditDialog(false);
          await refetchPost(); // Re-fetch so edited content is shown immediately
        }}
      />

      {/* Delete confirm */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(o) => {
          if (!o && !isDeletingPost) setShowDeleteConfirm(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🗑️ Xóa bài viết</DialogTitle>
          </DialogHeader>
          <p className="text-on-surface-variant text-sm">
            Bạn có chắc muốn xóa bài viết này? Hành động không thể hoàn tác.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingPost}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeletingPost}
              className="bg-error-500 text-white hover:bg-error-600"
            >
              {isDeletingPost ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Xóa bài viết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
