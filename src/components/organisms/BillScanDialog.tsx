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
import { releaseBillOcr, scanBill } from "@/services/billOcr";
import { billItemsToNote } from "@/utils/billParse";
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
  onUse: (result: BillScanOutput) => void;
}

type Phase = "pick" | "reading" | "review";

const today = () => new Date().toISOString().split("T")[0];

export const BillScanDialog = ({
  open,
  onOpenChange,
  onUse,
}: BillScanDialogProps) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [progress, setProgress] = useState({ label: "", ratio: 0 });
  const [error, setError] = useState<string | null>(null);

  const [image, setImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [candidates, setCandidates] = useState<number[]>([]);
  const [amountRaw, setAmountRaw] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [foundTotal, setFoundTotal] = useState(true);
  const [itemsSum, setItemsSum] = useState(0);

  // Mở lại là bắt đầu mới; đóng thì giải phóng bộ nhớ
  useEffect(() => {
    if (open) {
      setPhase("pick");
      setError(null);
      setImage(null);
      setAmountRaw("");
      setTitle("");
      setNote("");
      setDate(today());
      setCandidates([]);
      return;
    }
    void releaseBillOcr();
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
    setProgress({ label: "Đang xử lý ảnh", ratio: 0 });
    try {
      const r = await scanBill(file, (label, ratio) =>
        setProgress({ label, ratio })
      );
      setImage(r.image);
      setCategory(r.bill.category);
      setCandidates(r.bill.totalCandidates);
      setFoundTotal(r.bill.total !== undefined);
      setItemsSum(r.bill.items.reduce((sum, i) => sum + i.amount, 0));
      setAmountRaw(r.bill.total ? String(r.bill.total) : "");
      setTitle(r.bill.merchant ?? "");
      setDate(r.bill.date ?? today());
      setNote(billItemsToNote(r.bill.items));
      setPhase("review");
    } catch {
      setError(
        "Không đọc được bill. Hãy thử chụp rõ hơn, đủ sáng, hoặc thêm chi tiêu thủ công."
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
            Ảnh được đọc ngay trên máy của bạn. Hãy kiểm tra lại kết quả trước
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
          </div>
        )}

        {phase === "reading" && (
          <div className="space-y-3 py-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-400" />
            <p className="text-on-surface text-sm">{progress.label}</p>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-surface-dim">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>
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
              {candidates.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidates.map((c) => (
                    <button
                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${
                        c === amount
                          ? "border-primary-400 bg-primary-500/15 text-primary-300"
                          : "border-outline-variant text-on-surface-variant"
                      }`}
                      key={c}
                      onClick={() => setAmountRaw(String(c))}
                      type="button"
                    >
                      {formatCurrency(c)}
                    </button>
                  ))}
                </div>
              )}
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
