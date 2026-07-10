import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DebtPaymentButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isPaid?: boolean; // true = marked as paid, false = not paid
}

/**
 * Toggle button to mark debt as paid or unpaid
 * Shows different text and style based on payment status
 */
export const DebtPaymentButton = ({
  onClick,
  disabled = false,
  isLoading = false,
  isPaid = false,
}: DebtPaymentButtonProps) => {
  return (
    <Button
      variant={isPaid ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        isPaid
          ? [
              "bg-error-600",
              "font-medium",
              "gap-1.5",
              "text-xs",
              "text-white",
              "hover:bg-error-700",
            ]
          : [
              "border-success-200",
              "font-medium",
              "gap-1.5",
              "text-xs",
              "text-success-600",
              "hover:bg-success-50",
              "hover:border-success-300",
              "hover:text-success-700",
            ]
      )}
      title={
        isPaid ? "Xác nhận hoàn tác thanh toán" : "Xác nhận đã trả khoản nợ này"
      }
    >
      {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {!isLoading && isPaid && <CheckCircle2 className="h-3.5 w-3.5" />}
      <span className="font-medium text-xs">
        {isPaid ? "Đánh dấu chưa trả" : "Đánh dấu đã trả"}
      </span>
    </Button>
  );
};
