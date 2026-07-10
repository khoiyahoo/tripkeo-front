import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { DebtPaymentButton } from "@/components/atoms/DebtPaymentButton";
import { DebtPaymentModal } from "@/components/molecules/DebtPaymentModal";
import { ExpensesPdfExport } from "@/components/organisms/ExpensesPdfExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebtPayments } from "@/hooks/useDebtPayments";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { calculateSettledDebts } from "@/services/debtService";
import type { ExpenseSummary } from "@/services/expenseService";
import { formatCurrency } from "@/utils/format";
import { formatCompactCurrency } from "@/utils/formatCompactCurrency";

import type {
  DebtSettlement,
  ExpenseWithId,
  MemberBalance,
  TripRole,
} from "@/types/firestore";

interface BalanceTabProps {
  meta: {
    title: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    memberCount: number;
  };
  summary: ExpenseSummary;
  balances: MemberBalance[];
  debts: DebtSettlement[];
  expenses: ExpenseWithId[];
  tripId: string;
  currentUserRole?: TripRole;
}

export const BalanceTab = ({
  meta,
  summary,
  balances,
  debts,
  expenses,
  tripId,
  currentUserRole,
}: BalanceTabProps) => {
  const { isOwner, isTreasurer } = usePermissions(currentUserRole);
  const canTogglePayment = isOwner || isTreasurer;

  const {
    paymentHistory,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    selectedDebt,
    settlementStatuses,
    handleOpenPaymentModal,
    handleToggleSettlementPaid,
    isTogglingSettlement,
  } = useDebtPayments({ tripId });

  // Calculate settled debts for "Ai trả ai?" section - show ALL debts including paid ones
  const settledDebts = useMemo(() => {
    // Don't filter out paid settlements - show all for history/reference
    return calculateSettledDebts(debts, paymentHistory);
  }, [debts, paymentHistory]);

  // Calculate remaining balances for "Số dư từng người" considering paid settlements
  const filteredBalances = useMemo(() => {
    // For each balance, check if related settlements are paid
    // If a member has paid all their debts (all settlements marked as paid), hide them
    return balances.filter((member) => {
      // Find all debts related to this member (as debtor)
      const memberDebts = settledDebts.filter(
        (d) => d.fromName === member.name
      );

      // If member has no debts, keep them (they're owed money or neutral)
      if (memberDebts.length === 0) return true;

      // Check if ANY debt is not paid (i.e., still owes money)
      const hasUnpaidDebt = memberDebts.some((debt) => {
        const key = `${debt.fromName}-${debt.toName}`;
        const status = settlementStatuses.get(key);
        return !status?.isPaid; // Show if NOT marked as paid
      });

      return hasUnpaidDebt;
    });
  }, [balances, settledDebts, settlementStatuses]);

  // Generate payment notes and adjusted balances for each member
  const paymentNotes = useMemo(() => {
    const notes = new Map<string, string>();

    filteredBalances.forEach((member) => {
      // Find all paid debts where this member is the creditor (receiver)
      const paidDebtsToMember = settledDebts.filter((debt) => {
        const key = `${debt.fromName}-${debt.toName}`;
        const status = settlementStatuses.get(key);
        // Include only if: this member is receiving (toName), AND it's marked as paid
        return debt.toName === member.name && status?.isPaid;
      });

      // Generate note text: "(A đã trả 745k, T đã trả 745k)"
      if (paidDebtsToMember.length > 0) {
        const noteText = paidDebtsToMember
          .map(
            (debt) =>
              `${debt.fromName} đã trả ${formatCompactCurrency(debt.amount)}`
          )
          .join(", ");
        notes.set(member.name, `(${noteText})`);
      }
    });

    return notes;
  }, [filteredBalances, settledDebts, settlementStatuses]);

  // Adjust member balances based on paid settlements
  // When a debt is marked as paid, reduce the creditor's net balance accordingly
  const adjustedBalances = useMemo(() => {
    return filteredBalances.map((member) => {
      // Find all paid debts where this member is the creditor (receiving payment)
      const paidAmountReceived = settledDebts
        .filter((debt) => {
          const key = `${debt.fromName}-${debt.toName}`;
          const status = settlementStatuses.get(key);
          return debt.toName === member.name && status?.isPaid;
        })
        .reduce((sum, debt) => sum + debt.amount, 0);

      // Reduce net balance by paid amount (they're no longer owed that money)
      return {
        ...member,
        net: member.net - paidAmountReceived,
      };
    });
  }, [filteredBalances, settledDebts, settlementStatuses]);

  // Filter unpaid debts for PDF display
  const unpaidDebts = useMemo(() => {
    return settledDebts.filter((debt) => {
      const key = `${debt.fromName}-${debt.toName}`;
      const status = settlementStatuses.get(key);
      return !status?.isPaid;
    });
  }, [settledDebts, settlementStatuses]);

  const handleToggleSubmit = async () => {
    try {
      if (!selectedDebt) return;
      const newIsPaidState = !selectedDebt.isPaid;
      await handleToggleSettlementPaid(
        selectedDebt.fromName,
        selectedDebt.toName,
        newIsPaidState
      );
      const successMessage = newIsPaidState
        ? "Đã đánh dấu thanh toán"
        : "Đã hoàn tác thanh toán";
      toast.success(successMessage);
      // Close modal after successful confirmation
      setIsPaymentModalOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái thanh toán";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Tổng chi tiêu</p>
            <p className="font-bold text-2xl text-on-surface">
              {formatCurrency(summary.totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Số chi tiêu</p>
            <p className="font-bold text-2xl text-on-surface">
              {summary.expenseCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Số ngày</p>
            <p className="font-bold text-2xl text-on-surface">
              {summary.dateRangeDays || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PDF Export */}
      <div className="flex justify-end">
        <ExpensesPdfExport
          meta={meta}
          expenses={expenses}
          summary={summary}
          balances={adjustedBalances}
          debts={unpaidDebts}
        />
      </div>

      {/* Per-member balances */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Số dư từng người</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {adjustedBalances.map((b) => (
            <div
              key={b.name}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-dim/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-800 text-sm">
                {b.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-on-surface text-sm">
                  {b.name}
                </p>
                <p className="text-on-surface-variant text-xs">
                  Đã trả {formatCurrency(b.totalPaid)} · Phần chịu{" "}
                  {formatCurrency(b.totalOwed)}
                  {paymentNotes.get(b.name) && (
                    <span className="ml-1 text-on-surface-variant">
                      {paymentNotes.get(b.name)}
                    </span>
                  )}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-semibold text-sm",
                  b.net > 0.5
                    ? "text-success-600"
                    : b.net < -0.5
                      ? "text-error-600"
                      : "text-on-surface-variant"
                )}
              >
                {b.net > 0.5
                  ? `+${formatCurrency(Math.round(b.net))}`
                  : b.net < -0.5
                    ? `−${formatCurrency(Math.round(Math.abs(b.net)))}`
                    : "0đ"}
              </span>
            </div>
          ))}
          {adjustedBalances.length === 0 && (
            <p className="py-4 text-center text-on-surface-variant text-sm">
              Tất cả thành viên đã tất toán
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settlement — who pays whom */}
      {settledDebts.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ai trả ai?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settledDebts.map((d) => (
              <div
                key={`${d.fromName}-${d.toName}`}
                className="flex items-center gap-3 rounded-xl border border-outline-variant p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-error-100 font-semibold text-error-700 text-xs">
                    {d.fromName[0]?.toUpperCase()}
                  </div>
                  <span className="max-w-24 font-medium text-error-600 text-sm max-lg:truncate lg:max-w-48">
                    {d.fromName}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-100 font-semibold text-success-700 text-xs">
                    {d.toName[0]?.toUpperCase()}
                  </div>
                  <span className="max-w-24 font-medium text-sm text-success-600 max-lg:truncate lg:max-w-48">
                    {d.toName}
                  </span>
                </div>
                <span className="font-bold text-on-surface text-sm">
                  {formatCurrency(d.amount)}
                </span>
                <DebtPaymentButton
                  onClick={() => {
                    if (!canTogglePayment) {
                      toast.error(
                        "Chỉ chủ sở hữu hoặc thủ quỹ mới có quyền cập nhật trạng thái thanh toán"
                      );
                      return;
                    }
                    handleOpenPaymentModal(d.fromName, d.toName, d.amount);
                  }}
                  isPaid={
                    settlementStatuses.get(`${d.fromName}-${d.toName}`)
                      ?.isPaid || false
                  }
                  isLoading={isTogglingSettlement}
                  hasPermission={canTogglePayment}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      {selectedDebt && (
        <DebtPaymentModal
          isOpen={isPaymentModalOpen}
          fromName={selectedDebt.fromName}
          toName={selectedDebt.toName}
          totalDebtAmount={selectedDebt.amount}
          isPaid={selectedDebt.isPaid || false}
          onConfirm={handleToggleSubmit}
          onCancel={() => setIsPaymentModalOpen(false)}
          isLoading={isTogglingSettlement}
        />
      )}
    </div>
  );
};
