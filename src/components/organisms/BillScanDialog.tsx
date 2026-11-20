import { Camera, ImageUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readBillWithAi } from "@/services/billAi";
import { billItemsToNote, sumItems } from "@/utils/billResult";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/utils/format";

import type { ExpenseCategory } from "@/types/trip";

export interface BillScanOutput {
  title: string;
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  /** Mỗi món một dòng, ví dụ "Nước chanh - 45k" */
  note: string;
  category: ExpenseCategory;
  /** Ảnh bill đã nén, để lưu làm chứng từ */
  image: Blob;
}

interface BillScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onUse: (result: BillScanOutput) => void;
}

type Phase = "pick" | "reading" | "review";

const today = () => new Date().toISOString().split("T")[0];

export const BillScanDialog = ({
  open,
  onOpenChange,
  tripId,
  onUse,
}: BillScanDialogProps) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);

  const [image, setImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [amountRaw, setAmountRaw] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [foundTotal, setFoundTotal] = useState(true);
  const [itemsSum, setItemsSum] = useState(0);

  // Mở lại là bắt đầu mới
  useEffect(() => {
    if (!open) return;
    setPhase("pick");
    setError(null);
    setImage(null);
    setAmountRaw("");
    setTitle("");
    setNote("");
    setDate(today());
    setItemsSum(0);
  }, [open]);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhase("reading");
    try {
      const r = await readBillWithAi(tripId, file);
      setImage(r.image);
      setCategory(r.bill.category);
      setFoundTotal(r.bill.total !== undefined);
      setAmountRaw(r.bill.total ? String(r.bill.total) : "");
      setTitle(r.bill.merchant ?? "");
      setDate(r.bill.date ?? today());
      setNote(billItemsToNote(r.bill.items));
      setItemsSum(sumItems(r.bill.items));
      setPhase("review");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Không đọc được bill. Hãy thử lại hoặc thêm chi tiêu thủ công."
      );
      setPhase("pick");
    }
  };

  const amount = Number(amountRaw) || 0;
  const canUse = !!image && amount > 0 && title.trim().length > 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90svh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chụp bill</DialogTitle>
          <DialogDescription>
            AI đọc bill và điền sẵn khoản chi. Hãy kiểm tra lại kết quả trước
            khi dùng.
          </DialogDescription>
        </DialogHeader>

        <input
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          ref={cameraRef}
          type="file"
        />
        <input
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          ref={galleryRef}
          type="file"
        />

        {phase === "pick" && (
          <div className="space-y-2">
            {error && <p className="text-error-400 text-sm">{error}</p>}
            <Button
              className="w-full"
              onClick={() => cameraRef.current?.click()}
              type="button"
            >
              <Camera className="mr-2 h-4 w-4" />
              Chụp ảnh bill
            </Button>
            <Button
              className="w-full"
              onClick={() => galleryRef.current?.click()}
              type="button"
              variant="outline"
            >
              <ImageUp className="mr-2 h-4 w-4" />
              Chọn ảnh từ thư viện
            </Button>
            <p className="text-on-surface-variant text-xs">
              Ảnh bill được gửi tới Google Gemini (gói miễn phí) để đọc chữ. Ở
              gói miễn phí, Google có thể dùng nội dung để cải thiện sản phẩm,
              nên đừng chụp bill có thông tin nhạy cảm.
            </p>
          </div>
        )}

        {phase === "reading" && (
          <div className="space-y-3 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-400" />
            <p className="text-on-surface text-sm">AI đang đọc bill...</p>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-3">
            {previewUrl && (
              <img
                alt="Ảnh bill"
                className="mx-auto max-h-40 rounded-lg object-contain"
                src={previewUrl}
              />
            )}
            {!foundTotal && (
              <p className="rounded-lg bg-warning-500/10 px-3 py-2 text-warning-400 text-xs">
                Không tìm thấy tổng tiền trên bill, hãy nhập tay.
              </p>
            )}
            {foundTotal && itemsSum > 0 && itemsSum !== amount && (
              <p className="rounded-lg bg-warning-500/10 px-3 py-2 text-warning-400 text-xs">
                Tổng các món đọc được là {formatCurrency(itemsSum)}, khác tổng
                tiền. Có thể do thuế, giảm giá hoặc đọc sai. Hãy kiểm tra lại.
              </p>
            )}

            <div>
              <Label>Tổng tiền *</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                onChange={(e) =>
                  setAmountRaw(parseCurrencyInput(e.target.value))
                }
                placeholder="0"
                value={formatCurrencyInput(amountRaw)}
              />
            </div>

            <div>
              <Label>Tiêu đề *</Label>
              <Input
                className="mt-1"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên quán"
                value={title}
              />
            </div>

            <div>
              <Label>Ngày</Label>
              <Input
                className="mt-1"
                onChange={(e) => setDate(e.target.value)}
                type="date"
                value={date}
              />
            </div>

            <div>
              <Label>Ghi chú (các món)</Label>
              <Textarea
                className="mt-1 min-h-24 resize-y"
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mỗi món một dòng"
                rows={4}
                value={note}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setPhase("pick")}
                type="button"
                variant="outline"
              >
                Chụp lại
              </Button>
              <Button
                disabled={!canUse}
                onClick={() => {
                  if (!image) return;
                  onUse({
                    title: title.trim(),
                    amount,
                    date: date || today(),
                    note: note.trim(),
                    category,
                    image,
                  });
                }}
                type="button"
              >
                Dùng kết quả
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
