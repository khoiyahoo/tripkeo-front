import { Loader2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FUND_COPY, PAYMENT_METHOD_LABEL } from "@/constants/fund";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/utils/format";

import type {
  CreateFundTransactionInput,
  FundPaymentMethod,
  FundTransactionType,
} from "@/types/firestore";

export interface FundTransactionDraft {
  type: FundTransactionType;
  member?: string;
  amount?: number;
  note?: string;
}

interface FundTransactionDialogProps {
  open: boolean;
  draft: FundTransactionDraft;
  costMembers: string[];
  /** Số dư quỹ hiện tại, để cảnh báo khi hoàn nhiều hơn số đang có */
  fundBalance?: number;
  onClose: () => void;
  onSubmit: (input: CreateFundTransactionInput) => Promise<unknown>;
}

const today = () => new Date().toISOString().split("T")[0];

export const FundTransactionDialog = ({
  open,
  draft,
  costMembers,
  fundBalance,
  onClose,
  onSubmit,
}: FundTransactionDialogProps) => {
  const [member, setMember] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState<FundPaymentMethod>("bank");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMember(draft.member ?? "");
    setAmountRaw(draft.amount ? String(draft.amount) : "");
    setDate(today());
    setMethod("bank");
    setNote(draft.note ?? "");
    setIsSubmitting(false);
  }, [open, draft]);

  const amount = Number(amountRaw) || 0;
  const isRefund = draft.type === "refund";
  const canSubmit = !!member && amount > 0 && !isSubmitting;
  const refundTooMuch =
    isRefund && fundBalance !== undefined && amount > fundBalance;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        type: draft.type,
        member,
        amount,
        date,
        method,
        note: note.trim() || undefined,
      });
      toast.success(isRefund ? "Đã ghi nhận hoàn quỹ" : "Đã ghi nhận đóng quỹ");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Không thể lưu giao dịch. Vui lòng thử lại."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isRefund ? "Ghi nhận hoàn quỹ" : "Ghi nhận đóng quỹ"}
          </DialogTitle>
          <DialogDescription>
            {isRefund
              ? "Thủ quỹ hoàn lại tiền cho thành viên."
              : "Thành viên đã nộp tiền cho thủ quỹ."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Thành viên *</Label>
            <Select value={member} onValueChange={setMember}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Chọn thành viên" />
              </SelectTrigger>
              <SelectContent>
                {costMembers.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Số tiền (VNĐ) *</Label>
            <Input
              className="mt-1"
              inputMode="numeric"
              onChange={(e) => setAmountRaw(parseCurrencyInput(e.target.value))}
              placeholder="0"
              value={formatCurrencyInput(amountRaw)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Ngày</Label>
              <div className="mt-1">
                <DatePicker onChange={setDate} value={date} />
              </div>
            </div>
            <div>
              <Label>Hình thức</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as FundPaymentMethod)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["cash", "bank"] as const).map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {refundTooMuch && (
            <p className="rounded-xl bg-warning-500/10 px-3 py-2 text-sm text-warning-400">
              {FUND_COPY.refundExceedsBalance(formatCurrency(fundBalance ?? 0))}
            </p>
          )}
          <div>
            <Label>Ghi chú</Label>
            <Input
              className="mt-1"
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tùy chọn"
              value={note}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button disabled={isSubmitting} onClick={onClose} variant="outline">
            Hủy
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
