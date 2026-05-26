import { addDays, format, parseISO } from "date-fns";
import { CalendarIcon, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { DatePicker } from "@/components/molecules/DatePicker";
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

import type { CommunityPost } from "@/types/community";

// ─── Picsum helpers (same as CreateTripPage / EditTripDialog) ─
const generateCoverSeed = (): string => Math.random().toString(36).slice(2, 10);
const picsumCoverUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/1200/600`;

interface CloneItineraryDialogProps {
  open: boolean;
  onClose: () => void;
  post: CommunityPost;
  onConfirm: (
    tripName: string,
    startDate: Date,
    coverImage: string
  ) => Promise<void>;
}

export const CloneItineraryDialog = ({
  open,
  onClose,
  post,
  onConfirm,
}: CloneItineraryDialogProps) => {
  const dayCount = post.itinerarySnapshot?.length ?? 1;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [tripName, setTripName] = useState(post.title);
  const [startDateStr, setStartDateStr] = useState<string>(todayStr);
  const [isCloning, setIsCloning] = useState(false);

  // Cover image — random Picsum seed, same UX as CreateTripPage
  const [coverSeed, setCoverSeed] = useState<string>(generateCoverSeed);
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const effectiveCover = customCoverUrl.trim() || picsumCoverUrl(coverSeed);

  const startDate = parseISO(startDateStr || todayStr);
  const endDate = addDays(startDate, dayCount - 1);

  const handleConfirm = async () => {
    if (!tripName.trim()) return;
    setIsCloning(true);
    try {
      await onConfirm(tripName.trim(), startDate, effectiveCover);
      onClose();
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isCloning) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>📋 Clone lịch trình</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-on-surface-variant text-sm">
            Tạo chuyến đi mới từ lịch trình bài viết này? Sẽ clone{" "}
            <strong>{dayCount} ngày</strong> lịch trình. Không clone chi phí và
            thành viên.
          </p>

          <div>
            <Label className="text-xs">Tên chuyến đi</Label>
            <Input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="mt-1 h-9 text-sm"
              placeholder="Tên chuyến đi mới..."
            />
          </div>

          <div>
            <Label className="text-xs">Ngày bắt đầu</Label>
            <DatePicker
              value={startDateStr}
              onChange={(v) => setStartDateStr(v || todayStr)}
              className="mt-1 w-full"
            />
            <p className="mt-1 flex items-center gap-1 text-on-surface-variant/70 text-xs">
              <CalendarIcon className="h-3 w-3" />
              Kết thúc: {format(endDate, "dd/MM/yyyy")}
            </p>
          </div>

          {/* Cover image — Picsum random, same as CreateTripPage */}
          <div>
            <Label className="text-xs">Ảnh bìa chuyến đi</Label>
            <div className="mt-1.5 overflow-hidden rounded-xl border border-outline-variant">
              <img
                src={effectiveCover}
                alt="Cover preview"
                className="h-28 w-full object-cover"
                onError={(e) => {
                  // Fall back to picsum if custom URL is invalid
                  (e.currentTarget as HTMLImageElement).src =
                    picsumCoverUrl(coverSeed);
                }}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setCoverSeed(generateCoverSeed());
                  setCustomCoverUrl("");
                }}
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Đổi ảnh
              </Button>
            </div>
            <Input
              value={customCoverUrl}
              onChange={(e) => setCustomCoverUrl(e.target.value)}
              className="mt-2 h-8 text-xs"
              placeholder="Hoặc nhập URL ảnh bìa..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isCloning}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCloning || !tripName.trim()}
            className="bg-primary-500 text-white"
          >
            {isCloning ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              "Tạo chuyến đi mới"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
