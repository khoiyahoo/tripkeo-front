import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format";

interface DebtPaymentModalToggleProps {
  isOpen: boolean;
  fromName: string;
  toName: string;
  totalDebtAmount: number;
  isPaid?: boolean; // true = marked as paid, need to unmark
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Modal to confirm marking debt as paid or unpaid (toggle)
 * Simplified version without payment amount input
 */
export const DebtPaymentModal = ({
  isOpen,
  fromName,
  toName,
  totalDebtAmount,
  isPaid = false,
  onConfirm,
  onCancel,
  isLoading = false,
}: DebtPaymentModalToggleProps) => {
  const handleSubmit = async () => {
    await onConfirm();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPaid ? "Hoàn tác thanh toán" : "Xác nhận thanh toán"}
          </DialogTitle>
          <DialogDescription>
            {isPaid
              ? `Hoàn tác thanh toán từ ${fromName} cho ${toName}`
              : `Xác nhận ${fromName} đã trả cho ${toName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debt Info */}
          <div className="rounded-lg bg-surface-dim p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-on-surface-variant">Người trả:</span>
              <span className="font-medium text-on-surface">{fromName}</span>
            </div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-on-surface-variant">Người nhận:</span>
              <span className="font-medium text-on-surface">{toName}</span>
            </div>
            <div className="flex justify-between font-semibold text-sm">
              <span className="text-on-surface-variant">Số tiền:</span>
              <span className="text-on-surface">
                {formatCurrency(totalDebtAmount)}
              </span>
            </div>
          </div>

          {/* Confirmation Message */}
          <div className="rounded-lg bg-info-50 p-3">
            <p className="text-on-surface text-sm">
              {isPaid
                ? `Xác nhận hoàn tác thanh toán của ${fromName} cho ${toName}?`
                : `Xác nhận ${fromName} đã trả ${formatCurrency(totalDebtAmount)} cho ${toName}?`}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
