import { useMemo } from "react";

import { PdfActions } from "@/components/PdfActions";
import { useDebtPayments } from "@/hooks/useDebtPayments";
import { buildBalanceView } from "@/utils/balance";
import { buildExpensesHtml } from "@/utils/pdfExport";

import type { PdfTripMeta } from "@/utils/pdfExport";
import type { ExpenseSummary } from "@/services/expenseService";
import type {
  DebtSettlement,
  ExpenseWithId,
  MemberBalance,
} from "@/types/firestore";

interface Props {
  tripId: string;
  meta: PdfTripMeta;
  expenses: ExpenseWithId[];
  summary: ExpenseSummary;
  balances: MemberBalance[];
  debts: DebtSettlement[];
}

/** Dùng chung cho tab Chi tiêu và Số dư: PDF dùng số dư đã trừ phần đã thanh toán. */
export const ExpensesPdfActions = ({
  tripId,
  meta,
  expenses,
  summary,
  balances,
  debts,
}: Props) => {
  const { paymentHistory, settlementStatuses } = useDebtPayments({ tripId });

  const view = useMemo(
    () => buildBalanceView(balances, debts, paymentHistory, settlementStatuses),
    [balances, debts, paymentHistory, settlementStatuses]
  );

  return (
    <PdfActions
      buildHtml={() =>
        buildExpensesHtml(
          meta,
          expenses,
          summary,
          view.adjustedBalances,
          view.settledDebts.filter((d) => !view.isPaid(d))
        )
      }
      guard={() =>
        expenses.length === 0
          ? "Chưa có chi phí nào. Vui lòng thêm chi phí trước khi xuất PDF."
          : null
      }
      shareTitle="Báo cáo chi tiêu"
    />
  );
};
