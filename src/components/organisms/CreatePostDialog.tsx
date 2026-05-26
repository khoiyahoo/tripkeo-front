import MDEditor from "@uiw/react-md-editor";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadImages } from "@/services/cloudinaryService";
import { createPost, updatePost } from "@/services/communityService";
import { fetchExpensesForTrip } from "@/services/expenseService";
import { fetchActivitiesForTrip } from "@/services/itineraryService";
import { useAuthStore } from "@/stores/authStore";
import { getTripStatus, timestampToDateStr } from "@/utils/format";

import type {
  CommunityPost,
  CommunityRegion,
  CreatePostInput,
  ExpenseSnapshot,
  ItineraryDaySnapshot,
  UpdatePostInput,
} from "@/types/community";
import type {
  ActivityWithId,
  ExpenseWithId,
  TripWithId,
} from "@/types/firestore";

const REGION_OPTIONS: { value: CommunityRegion; label: string }[] = [
  { value: "north", label: "Miền Bắc" },
  { value: "central", label: "Miền Trung" },
  { value: "south", label: "Miền Nam" },
  { value: "other", label: "Khác" },
];

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
  trips: TripWithId[];
  /** Activities keyed by tripId → date → items (pre-loaded or loaded on demand) */
  getActivities?: (tripId: string) => ActivityWithId[];
  getExpenses?: (tripId: string) => ExpenseWithId[];
  onSuccess: (postId: string) => void;
  /** When provided, dialog operates in "edit" mode */
  editPost?: CommunityPost;
}

export const CreatePostDialog = ({
  open,
  onClose,
  trips,
  getActivities,
  getExpenses,
  onSuccess,
  editPost,
}: CreatePostDialogProps) => {
  const user = useAuthStore((s) => s.user);
  const isEditMode = !!editPost;

  // Radix Select forbids value="" on SelectItem, so use a sentinel for "no trip"
  const NO_TRIP = "__none__";
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const actualTripId = selectedTripId === NO_TRIP ? "" : selectedTripId;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string | undefined>("");
  const [region, setRegion] = useState<CommunityRegion>("central");
  const [includeItinerary, setIncludeItinerary] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  // Existing image URLs from edit mode (already uploaded)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Validation state for share checkboxes ──────────────────
  const [itineraryWarning, setItineraryWarning] = useState<string | null>(null);
  const [expenseWarning, setExpenseWarning] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // When the user picks a trip, validate itinerary completeness and expense presence.
  // All trip days must have ≥1 activity; the trip must have ≥1 expense.
  // If a check fails the corresponding checkbox is disabled + a warning is shown.
  useEffect(() => {
    if (!actualTripId) {
      setItineraryWarning(null);
      setExpenseWarning(null);
      return;
    }
    const trip = trips.find((t) => t.id === actualTripId);
    if (!trip) return;

    setIsValidating(true);
    Promise.all([
      getActivities
        ? Promise.resolve(getActivities(actualTripId))
        : fetchActivitiesForTrip(actualTripId),
      getExpenses
        ? Promise.resolve(getExpenses(actualTripId))
        : fetchExpensesForTrip(actualTripId),
    ])
      .then(([acts, exps]) => {
        // Validate itinerary: every day in the date range must have ≥1 activity
        const start = trip.startDate.toDate();
        const end = trip.endDate.toDate();
        const dayMs = 24 * 60 * 60 * 1000;
        const totalDays =
          Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
        const actDates = new Set(acts.map((a) => a.date));
        const missingDays: number[] = [];
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(start.getTime() + i * dayMs);
          const dateStr = d.toISOString().split("T")[0];
          if (!actDates.has(dateStr)) missingDays.push(i + 1);
        }
        if (missingDays.length > 0) {
          const preview = missingDays
            .slice(0, 3)
            .map((d) => `Ngày ${d}`)
            .join(", ");
          const more =
            missingDays.length > 3
              ? ` và ${missingDays.length - 3} ngày khác`
              : "";
          setItineraryWarning(`${preview}${more} chưa có hoạt động nào.`);
          setIncludeItinerary(false);
        } else {
          setItineraryWarning(null);
        }

        // Validate expenses: must have ≥1 expense
        if (exps.length === 0) {
          setExpenseWarning("Chuyến đi chưa có chi phí nào.");
          setIncludeExpenses(false);
        } else {
          setExpenseWarning(null);
        }
      })
      .catch(() => {
        // Non-critical: validation failed to fetch; don't block user
        setItineraryWarning(null);
        setExpenseWarning(null);
      })
      .finally(() => setIsValidating(false));
  }, [actualTripId, trips, getActivities, getExpenses]);

  // Pre-fill when editing
  useEffect(() => {
    if (open && editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
      setRegion(editPost.region);
      setIncludeItinerary(editPost.includeItinerary);
      setIncludeExpenses(editPost.includeExpenses);
      setExistingImageUrls(editPost.imageUrls);
      setImages([]);
      setPreviews([]);
      setSelectedTripId(editPost.tripId ?? NO_TRIP);
    } else if (open && !editPost) {
      setTitle("");
      setContent("");
      setRegion("central");
      setIncludeItinerary(true);
      setIncludeExpenses(true);
      setExistingImageUrls([]);
      setImages([]);
      setPreviews([]);
      setSelectedTripId("");
    } else {
      // dialog closed — Radix can leave body.overflow="hidden" behind,
      // especially when the dialog has overflow-y-auto. Clear it explicitly.
      document.body.style.overflow = "";
    }
  }, [open, editPost]);

  // Only show completed trips
  const completedTrips = trips.filter(
    (t) => getTripStatus(t.startDate, t.endDate) === "completed"
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const totalAllowed = 10 - existingImageUrls.length;
    const newImages = [...images, ...files].slice(0, totalAllowed);
    setImages(newImages);
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      for (const u of prev) URL.revokeObjectURL(u);
      return urls;
    });
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setImages(images.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (idx: number) => {
    setExistingImageUrls(existingImageUrls.filter((_, i) => i !== idx));
  };

  const buildItinerarySnapshot = async (): Promise<
    ItineraryDaySnapshot[] | undefined
  > => {
    if (!includeItinerary || !actualTripId) return undefined;
    const acts = getActivities
      ? getActivities(actualTripId)
      : await fetchActivitiesForTrip(actualTripId);
    const byDate: Record<string, ActivityWithId[]> = {};
    for (const a of acts) {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    }
    // No trip lookup needed — category key (not label) is stored directly.
    // Falls back gracefully when trips=[] (edit mode from PostDetailPage).
    if (Object.keys(byDate).length === 0) return editPost?.itinerarySnapshot;

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayActs], i) => ({
        dayNumber: i + 1,
        date,
        activities: dayActs
          .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
          .map((a) => ({
            title: a.title,
            startTime: a.startTime,
            category: a.category, // Store the ActivityType key, never the label
            location: a.location,
          })),
      }));
  };

  const buildExpenseSnapshot = async (): Promise<
    ExpenseSnapshot | undefined
  > => {
    if (!includeExpenses || !actualTripId) return undefined;
    const exps = getExpenses
      ? getExpenses(actualTripId)
      : await fetchExpensesForTrip(actualTripId);
    // No expenses → keep existing snapshot (handles edit mode where trip fetch is skipped)
    if (!exps.length) return editPost?.expenseSnapshot;

    const trip = trips.find((t) => t.id === actualTripId);
    // In edit mode from PostDetailPage, trips=[] so trip is undefined.
    // Fall back to existing snapshot values for currency / memberCount.
    const currency =
      trip?.currency ?? editPost?.expenseSnapshot?.currency ?? "VND";
    const memberCount = trip
      ? Object.values(trip.members).filter(
          (m) => !m.status || m.status === "active"
        ).length
      : (editPost?.expenseSnapshot?.memberCount ?? 1);

    const total = exps.reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    for (const e of exps) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }
    const items = exps.map((e) => ({
      description: e.description,
      amount: e.amount,
      category: e.category as string,
    }));
    const byDayMap: Record<string, number> = {};
    for (const e of exps) {
      const dateStr = timestampToDateStr(e.date);
      byDayMap[dateStr] = (byDayMap[dateStr] ?? 0) + e.amount;
    }
    const byDay = Object.entries(byDayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    return {
      total,
      currency,
      memberCount,
      perPerson: memberCount > 0 ? Math.round(total / memberCount) : total,
      byCategory,
      items,
      byDay,
    };
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Bạn cần đăng nhập");
      return;
    }
    if (!title.trim()) {
      toast.error("Nhập tiêu đề bài viết");
      return;
    }
    if (!content?.trim()) {
      toast.error("Nhập nội dung bài viết");
      return;
    }

    setIsSubmitting(true);
    try {
      const newImageUrls = images.length > 0 ? await uploadImages(images) : [];
      const allImageUrls = [...existingImageUrls, ...newImageUrls];

      if (isEditMode && editPost) {
        const input: UpdatePostInput = {
          title: title.trim(),
          content: content.trim(),
          tripId: actualTripId || undefined,
          destination:
            trips.find((t) => t.id === actualTripId)?.destination ??
            editPost.destination,
          region,
          imageUrls: allImageUrls,
          includeItinerary,
          includeExpenses,
          itinerarySnapshot: await buildItinerarySnapshot(),
          expenseSnapshot: await buildExpenseSnapshot(),
        };
        await updatePost(editPost.id, input);
        toast.success("Đã cập nhật bài viết!");
        onSuccess(editPost.id);
      } else {
        const input: CreatePostInput = {
          title: title.trim(),
          content: content.trim(),
          tripId: actualTripId || undefined,
          destination:
            trips.find((t) => t.id === actualTripId)?.destination ?? "",
          region,
          imageUrls: allImageUrls,
          includeItinerary,
          includeExpenses,
          itinerarySnapshot: await buildItinerarySnapshot(),
          expenseSnapshot: await buildExpenseSnapshot(),
        };
        const postId = await createPost(
          input,
          user.uid,
          user.displayName ?? "Ẩn danh",
          user.photoURL ?? ""
        );
        toast.success("Đã đăng bài viết!");
        onSuccess(postId);
      }
      onClose();
    } catch (err) {
      toast.error(
        `Không thể ${isEditMode ? "cập nhật" : "đăng"} bài. ${err instanceof Error ? err.message : ""}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "✏️ Chỉnh sửa bài viết" : "✍️ Chia sẻ chuyến đi"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" data-color-mode="dark">
          {/* Select trip */}
          <div>
            <Label className="text-xs">Chọn chuyến đi đã kết thúc</Label>
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="(Tuỳ chọn) chọn chuyến đi..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Không liên kết</SelectItem>
                {completedTrips
                  .filter((t) => t.id?.trim())
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-sm">
                      {t.name} · {t.destination} (
                      {timestampToDateStr(t.startDate)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {completedTrips.length === 0 && (
              <p className="mt-1 text-on-surface-variant/60 text-xs">
                Chưa có chuyến đi nào đã kết thúc.
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs">Tiêu đề bài viết *</Label>
            <Input
              placeholder="VD: Đà Nẵng – Hội An 4N3Đ cực chill"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Region */}
          <div>
            <Label className="text-xs">Khu vực</Label>
            <Select
              value={region}
              onValueChange={(v) => setRegion(v as CommunityRegion)}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content — Markdown Editor */}
          <div>
            <Label className="text-xs">Nội dung bài viết *</Label>
            <div className="mt-1 overflow-hidden rounded-sm border border-input">
              <MDEditor
                value={content}
                onChange={setContent}
                height={260}
                preview="edit"
                hideToolbar={false}
                visibleDragbar={false}
                textareaProps={{
                  placeholder: "Viết cảm nhận về chuyến đi...",
                }}
              />
            </div>
          </div>

          {/* Share options */}
          {actualTripId && (
            <div>
              <Label className="text-xs">
                Chia sẻ thông tin từ chuyến đi
                {isValidating && (
                  <span className="ml-2 text-on-surface-variant/60">
                    (đang kiểm tra...)
                  </span>
                )}
              </Label>
              <div className="mt-1.5 space-y-2">
                {/* Itinerary checkbox */}
                <div>
                  <label
                    className={`flex cursor-pointer items-center gap-2 text-sm ${itineraryWarning ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={includeItinerary}
                      disabled={!!itineraryWarning || isValidating}
                      onChange={(e) => setIncludeItinerary(e.target.checked)}
                      className="accent-primary-500 disabled:cursor-not-allowed"
                    />
                    Lịch trình chuyến đi
                  </label>
                  {itineraryWarning && (
                    <p className="mt-0.5 pl-5 text-warning-500 text-xs">
                      ⚠️ Không thể chia sẻ: {itineraryWarning}
                    </p>
                  )}
                </div>

                {/* Expenses checkbox */}
                <div>
                  <label
                    className={`flex cursor-pointer items-center gap-2 text-sm ${expenseWarning ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={includeExpenses}
                      disabled={!!expenseWarning || isValidating}
                      onChange={(e) => setIncludeExpenses(e.target.checked)}
                      className="accent-primary-500 disabled:cursor-not-allowed"
                    />
                    Chi phí chuyến đi
                    {!expenseWarning && (
                      <span className="text-on-surface-variant/60 text-xs">
                        (không hiện tên thành viên)
                      </span>
                    )}
                  </label>
                  {expenseWarning && (
                    <p className="mt-0.5 pl-5 text-warning-500 text-xs">
                      ⚠️ Không thể chia sẻ: {expenseWarning}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Image upload */}
          <div>
            <Label className="text-xs">Hình ảnh (tối đa 10)</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {/* Existing images (edit mode) */}
              {existingImageUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative h-20 w-20 overflow-hidden rounded-sm"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {/* New image previews */}
              {previews.map((url, i) => (
                <div
                  key={url}
                  className="relative h-20 w-20 overflow-hidden rounded-sm"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {existingImageUrls.length + images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-sm border-2 border-secondary-600/50 border-dashed text-on-surface-variant transition-colors hover:border-secondary-500 hover:bg-secondary-800/30"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="mt-0.5 text-xs">Thêm ảnh</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary-500 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {isEditMode ? "Đang lưu..." : "Đang đăng..."}
              </>
            ) : isEditMode ? (
              "Lưu thay đổi"
            ) : (
              "Đăng bài"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
