import {
  AlertTriangle,
  Calendar,
  Check,
  Loader2,
  MapPin,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  computeDateChangeImpact,
  type DateChangeImpact,
  useEditTrip,
} from "@/hooks/useEditTrip";
import { cn } from "@/lib/utils";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  timestampToDateStr,
} from "@/utils/format";

import type {
  ActivityWithId,
  CreateTripInput,
  TripWithId,
} from "@/types/firestore";

// ─── Constants ────────────────────────────────────────────────
const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80",
  "https://images.unsplash.com/photo-1540979388-5b4b9b3c5e0d?w=400&q=80",
];

const CURRENCIES = [
  { value: "VND", label: "VND (₫)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "THB", label: "THB (฿)" },
  { value: "SGD", label: "SGD (S$)" },
];

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
  budget: string;
  currency: string;
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

  const [formData, setFormData] = useState<FormData>({
    name: trip.name,
    destination: trip.destination,
    coverImage: trip.coverImage,
    startDate: oldStartStr,
    endDate: oldEndStr,
    budget: trip.budget ? formatCurrencyInput(String(trip.budget)) : "",
    currency: trip.currency,
  });

  // Sync form when dialog re-opens with potentially fresh trip data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: trip.name,
        destination: trip.destination,
        coverImage: trip.coverImage,
        startDate: oldStartStr,
        endDate: oldEndStr,
        budget: trip.budget ? formatCurrencyInput(String(trip.budget)) : "",
        currency: trip.currency,
      });
      setDateError(null);
    }
  }, [isOpen, trip, oldStartStr, oldEndStr]);

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "startDate" || field === "endDate") setDateError(null);
  };

  const isValid =
    formData.name.trim() !== "" &&
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
      budget: Number(parseCurrencyInput(formData.budget)) || 0,
      currency: formData.currency,
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
    <>
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
              {/* Cover image */}
              <div>
                <Label className="mb-2 block">Ảnh bìa</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_IMAGES.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => updateField("coverImage", url)}
                      className={cn(
                        "relative aspect-video overflow-hidden rounded-lg border-2 transition-all",
                        formData.coverImage === url
                          ? "border-primary-500 ring-2 ring-primary-200"
                          : "border-transparent hover:border-outline-variant"
                      )}
                    >
                      <img
                        src={url}
                        alt="Cover"
                        className="h-full w-full object-cover"
                      />
                      {formData.coverImage === url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary-500/20">
                          <Check className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <Input
                  className="mt-2"
                  placeholder="Hoặc nhập URL ảnh bìa..."
                  value={
                    COVER_IMAGES.includes(formData.coverImage)
                      ? ""
                      : formData.coverImage
                  }
                  onChange={(e) => {
                    if (e.target.value)
                      updateField("coverImage", e.target.value);
                  }}
                />
              </div>

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
                <Label htmlFor="edit-destination">Điểm đến *</Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    id="edit-destination"
                    placeholder="Nhập điểm đến..."
                    className="pl-9"
                    value={formData.destination}
                    onChange={(e) => updateField("destination", e.target.value)}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startDate">Ngày bắt đầu *</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      id="edit-startDate"
                      type="date"
                      className="pl-9"
                      min={todayDateStr}
                      value={formData.startDate}
                      onChange={(e) => {
                        updateField("startDate", e.target.value);
                        if (
                          formData.endDate &&
                          e.target.value > formData.endDate
                        ) {
                          updateField("endDate", "");
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-endDate">Ngày kết thúc *</Label>
                  <div className="relative mt-1.5">
                    <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      id="edit-endDate"
                      type="date"
                      className="pl-9"
                      min={formData.startDate || undefined}
                      value={formData.endDate}
                      onChange={(e) => updateField("endDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {dateError && (
                <p className="text-error-500 text-sm">{dateError}</p>
              )}

              {/* Budget & currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-budget">Ngân sách</Label>
                  <div className="relative mt-1.5">
                    <Wallet className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      id="edit-budget"
                      type="text"
                      inputMode="numeric"
                      min="0"
                      placeholder="10.000.000"
                      className="pl-9"
                      value={formData.budget}
                      onChange={(e) => {
                        const raw = parseCurrencyInput(e.target.value);
                        updateField("budget", formatCurrencyInput(raw));
                      }}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-currency">Đơn vị tiền tệ</Label>
                  <select
                    id="edit-currency"
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
    </>
  );
};
