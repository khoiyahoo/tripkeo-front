import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DatePicker } from "@/components/molecules/DatePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  computeDateChangeImpact,
  type DateChangeImpact,
  useEditTrip,
} from "@/hooks/useEditTrip";
import { cn } from "@/lib/utils";
import {
  getStatusLabel,
  getTripStatus,
  timestampToDateStr,
} from "@/utils/format";

import type {
  ActivityWithId,
  CreateTripInput,
  TripWithId,
} from "@/types/firestore";

// ─── Picsum helpers ───────────────────────────────────────────
const generateCoverSeed = (): string => Math.random().toString(36).slice(2, 10);

const picsumCoverUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/1200/600`;

const isPicsumUrl = (url: string): boolean =>
  url.startsWith("https://picsum.photos/seed/");

// ─── Constants ─────────────────────────────────────────────
const LOCKED_TOOLTIP = "Không thể chỉnh sửa khi chuyến đi đã bắt đầu";

const getTodayDateStr = (): string => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split("T")[0];
};

// ─── Types ────────────────────────────────────────────────────
interface EditTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripWithId;
  activities: ActivityWithId[];
}

interface FormData {
  name: string;
  destination: string;
  coverImage: string;
  startDate: string;
  endDate: string;
}

// ─── Component ────────────────────────────────────────────────
export const EditTripDialog = ({
  isOpen,
  onClose,
  trip,
  activities,
}: EditTripDialogProps) => {
  const { handleSave } = useEditTrip();
  const todayDateStr = getTodayDateStr();
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingImpact, setPendingImpact] = useState<DateChangeImpact | null>(
    null
  );
  const [pendingInput, setPendingInput] =
    useState<Partial<CreateTripInput> | null>(null);

  const oldStartStr = timestampToDateStr(trip.startDate);
  const oldEndStr = timestampToDateStr(trip.endDate);

  // Determine if most fields are locked (trip has already started)
  const isLocked = oldStartStr <= todayDateStr;

  const [formData, setFormData] = useState<FormData>({
    name: trip.name,
    destination: trip.destination,
    coverImage: trip.coverImage,
    startDate: oldStartStr,
    endDate: oldEndStr,
  });

  const status = getTripStatus(trip.startDate, trip.endDate);

  // Sync form when dialog re-opens with potentially fresh trip data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: trip.name,
        destination: trip.destination,
        coverImage: trip.coverImage,
        startDate: oldStartStr,
        endDate: oldEndStr,
      });
      setDateError(null);
    } else {
      // Radix can leave body.overflow="hidden" when a nested dialog (warning)
      // closes at the same time as the outer dialog. Clear it explicitly.
      document.body.style.overflow = "";
    }
  }, [isOpen, trip, oldStartStr, oldEndStr]);

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "startDate" || field === "endDate") setDateError(null);
  };

  const isValid = isLocked
    ? formData.name.trim() !== ""
    : formData.name.trim() !== "" &&
      formData.destination.trim() !== "" &&
      formData.startDate !== "" &&
      formData.endDate !== "" &&
      formData.startDate <= formData.endDate;

  const doSave = async (
    input: Partial<CreateTripInput>,
    impact: DateChangeImpact
  ) => {
    setIsSaving(true);
    try {
      await handleSave(trip.id, input, impact);
      toast.success("Đã lưu thay đổi");
      onClose();
    } catch {
      toast.error("Không thể lưu thay đổi. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    // When locked, only the trip name can be changed
    if (isLocked) {
      const input: Partial<CreateTripInput> = { name: formData.name.trim() };
      await doSave(input, { toUpdate: [], toDelete: [] });
      return;
    }

    if (formData.startDate < todayDateStr) {
      setDateError("Ngày bắt đầu không thể trong quá khứ");
      return;
    }
    if (formData.startDate > formData.endDate) {
      setDateError("Ngày kết thúc không thể trước ngày bắt đầu");
      return;
    }

    const input: Partial<CreateTripInput> = {
      name: formData.name.trim(),
      destination: formData.destination.trim(),
      coverImage: formData.coverImage,
      startDate: formData.startDate,
      endDate: formData.endDate,
    };

    const datesChanged =
      formData.startDate !== oldStartStr || formData.endDate !== oldEndStr;
    const impact: DateChangeImpact = datesChanged
      ? computeDateChangeImpact(
          activities,
          oldStartStr,
          oldEndStr,
          formData.startDate,
          formData.endDate
        )
      : { toUpdate: [], toDelete: [] };

    if (impact.toDelete.length > 0) {
      setPendingInput(input);
      setPendingImpact(impact);
      setIsWarningOpen(true);
      return;
    }

    await doSave(input, impact);
  };

  const handleConfirmShortening = async () => {
    setIsWarningOpen(false);
    if (pendingInput && pendingImpact) {
      await doSave(pendingInput, pendingImpact);
    }
  };

  return (
    <TooltipProvider>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Chỉnh sửa chuyến đi</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Locked notice */}
              {isLocked && (
                <div className="flex items-start gap-2 rounded-xl bg-warning-50 px-4 py-3 text-warning-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm">
                    Chuyến đi{" "}
                    <span className="lowercase">{getStatusLabel(status)}</span>.
                    Chỉ có thể chỉnh sửa <strong>tên chuyến đi</strong>.
                  </p>
                </div>
              )}

              {/* Cover image — hidden when locked */}
              {!isLocked && (
                <div>
                  <Label className="mb-2 block">Ảnh bìa</Label>
                  <div className="overflow-hidden rounded-xl border border-outline-variant">
                    <img
                      src={formData.coverImage}
                      alt="Cover"
                      className="h-36 w-full object-cover"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateField(
                          "coverImage",
                          picsumCoverUrl(generateCoverSeed())
                        )
                      }
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Đổi ảnh
                    </Button>
                  </div>
                  <Input
                    className="mt-2"
                    placeholder="Hoặc nhập URL ảnh bìa..."
                    value={
                      isPicsumUrl(formData.coverImage)
                        ? ""
                        : formData.coverImage
                    }
                    onChange={(e) => {
                      if (e.target.value)
                        updateField("coverImage", e.target.value);
                    }}
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <Label htmlFor="edit-name">Tên chuyến đi *</Label>
                <Input
                  id="edit-name"
                  className="mt-1.5"
                  placeholder="VD: Đà Nẵng - Hội An 4N3Đ"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              {/* Destination */}
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="edit-destination">Điểm đến *</Label>
                      <div className="relative mt-1.5">
                        <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                        <Input
                          id="edit-destination"
                          placeholder="Nhập điểm đến..."
                          className={cn(
                            "pl-9",
                            isLocked && "cursor-not-allowed opacity-50"
                          )}
                          value={formData.destination}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateField("destination", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent>{LOCKED_TOOLTIP}</TooltipContent>
                  )}
                </Tooltip>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="edit-startDate">Ngày bắt đầu *</Label>
                      <div
                        className={cn(
                          "relative mt-1.5",
                          isLocked && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <DatePicker
                          id="edit-startDate"
                          value={formData.startDate}
                          onChange={(val) => {
                            updateField("startDate", val);
                            if (formData.endDate && val > formData.endDate) {
                              updateField("endDate", "");
                            }
                          }}
                          disabled={isLocked}
                          minDate={todayDateStr}
                          maxDate={formData.endDate || undefined}
                          placeholder="Chọn ngày bắt đầu"
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent>{LOCKED_TOOLTIP}</TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label htmlFor="edit-endDate">Ngày kết thúc *</Label>
                      <div
                        className={cn(
                          "relative mt-1.5",
                          isLocked && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <DatePicker
                          id="edit-endDate"
                          value={formData.endDate}
                          onChange={(val) => updateField("endDate", val)}
                          disabled={isLocked}
                          minDate={formData.startDate || undefined}
                          placeholder="Chọn ngày kết thúc"
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent>{LOCKED_TOOLTIP}</TooltipContent>
                  )}
                </Tooltip>
              </div>
              {dateError && (
                <p className="text-error-500 text-sm">{dateError}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving || !isValid}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortening confirmation dialog */}
      <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-500" />
              <DialogTitle>Rút ngắn chuyến đi</DialogTitle>
            </div>
            <DialogDescription>
              Rút ngắn chuyến đi sẽ xóa lịch trình của những ngày bị loại bỏ (
              {pendingImpact?.toDelete.length} hoạt động). Bạn có chắc chắn?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsWarningOpen(false)}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={isSaving}
              onClick={handleConfirmShortening}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
