import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { uploadImages } from "@/services/cloudinaryService";
import { createPost } from "@/services/communityService";
import { useAuthStore } from "@/stores/authStore";
import { getTripStatus, timestampToDateStr } from "@/utils/format";

import type {
  CommunityRegion,
  CreatePostInput,
  ExpenseSnapshot,
  ItineraryDaySnapshot,
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
}

export const CreatePostDialog = ({
  open,
  onClose,
  trips,
  getActivities,
  getExpenses,
  onSuccess,
}: CreatePostDialogProps) => {
  const user = useAuthStore((s) => s.user);

  // Radix Select forbids value="" on SelectItem, so use a sentinel for "no trip"
  const NO_TRIP = "__none__";
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  // Empty string → placeholder shown; "__none__" → user explicitly cleared
  const actualTripId = selectedTripId === NO_TRIP ? "" : selectedTripId;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState<CommunityRegion>("central");
  const [includeItinerary, setIncludeItinerary] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show completed trips
  const completedTrips = trips.filter(
    (t) => getTripStatus(t.startDate, t.endDate) === "completed"
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newImages = [...images, ...files].slice(0, 10);
    setImages(newImages);
    // Generate previews
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      for (const u of prev) URL.revokeObjectURL(u);
      return urls;
    });
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    const newImgs = images.filter((_, i) => i !== idx);
    const newPrevs = previews.filter((_, i) => i !== idx);
    setImages(newImgs);
    setPreviews(newPrevs);
  };

  const buildItinerarySnapshot = (): ItineraryDaySnapshot[] | undefined => {
    if (!includeItinerary || !actualTripId || !getActivities) return undefined;
    const acts = getActivities(actualTripId);
    const byDate: Record<string, ActivityWithId[]> = {};
    for (const a of acts) {
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    }
    const trip = trips.find((t) => t.id === actualTripId);
    if (!trip) return undefined;

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
            category: ACTIVITY_TYPE_CONFIG[a.category]?.label ?? a.category,
            location: a.location,
          })),
      }));
  };

  const buildExpenseSnapshot = (): ExpenseSnapshot | undefined => {
    if (!includeExpenses || !actualTripId || !getExpenses) return undefined;
    const exps = getExpenses(actualTripId);
    const trip = trips.find((t) => t.id === actualTripId);
    if (!exps.length || !trip) return undefined;

    const total = exps.reduce((s, e) => s + e.amount, 0);
    const memberCount = Object.values(trip.members).filter(
      (m) => !m.status || m.status === "active"
    ).length;
    const byCategory: Record<string, number> = {};
    for (const e of exps) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }
    return {
      total,
      currency: trip.currency,
      memberCount,
      perPerson: memberCount > 0 ? Math.round(total / memberCount) : total,
      byCategory,
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
    if (!content.trim()) {
      toast.error("Nhập cảm nhận chuyến đi");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images
      const imageUrls = images.length > 0 ? await uploadImages(images) : [];

      const input: CreatePostInput = {
        title: title.trim(),
        content: content.trim(),
        tripId: actualTripId || undefined,
        destination:
          trips.find((t) => t.id === actualTripId)?.destination ?? "",
        region,
        imageUrls,
        includeItinerary,
        includeExpenses,
        itinerarySnapshot: buildItinerarySnapshot(),
        expenseSnapshot: buildExpenseSnapshot(),
      };

      const postId = await createPost(
        input,
        user.uid,
        user.displayName ?? "Ẩn danh",
        user.photoURL ?? ""
      );
      toast.success("Đã đăng bài viết!");
      onSuccess(postId);
      onClose();
    } catch (err) {
      toast.error(
        `Không thể đăng bài. ${err instanceof Error ? err.message : ""}`
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>✍️ Chia sẻ chuyến đi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select trip */}
          <div>
            <Label className="text-xs">Chọn chuyến đi đã kết thúc</Label>
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="(Tuỳ chọn) chọn chuyến đi..." />
              </SelectTrigger>
              <SelectContent>
                {/* value must be non-empty per Radix constraint; sentinel resolved via actualTripId */}
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

          {/* Content */}
          <div>
            <Label className="text-xs">Cảm nhận *</Label>
            <Textarea
              placeholder="Viết cảm nhận về chuyến đi..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 resize-none text-sm"
            />
          </div>

          {/* Share options */}
          {actualTripId && (
            <div>
              <Label className="text-xs">Chia sẻ thông tin</Label>
              <div className="mt-1.5 space-y-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeItinerary}
                    onChange={(e) => setIncludeItinerary(e.target.checked)}
                    className="accent-primary-500"
                  />
                  Lịch trình chung
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeExpenses}
                    onChange={(e) => setIncludeExpenses(e.target.checked)}
                    className="accent-primary-500"
                  />
                  Chi phí tổng quan
                  <span className="text-on-surface-variant/60 text-xs">
                    (không hiện tên thành viên)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Image upload */}
          <div>
            <Label className="text-xs">Hình ảnh (tối đa 10)</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div
                  key={url}
                  className="relative h-20 w-20 overflow-hidden rounded-lg"
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
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-secondary-600/50 border-dashed text-on-surface-variant transition-colors hover:border-secondary-500 hover:bg-secondary-800/30"
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
                Đang đăng...
              </>
            ) : (
              "Đăng bài"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
