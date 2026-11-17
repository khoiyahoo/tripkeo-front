import { calculateSettledDebts } from "@/services/debtService";
import { formatCompactCurrency } from "@/utils/formatCompactCurrency";

import type { PaymentTransaction } from "@/types/payment";
import type { DebtSettlement, MemberBalance } from "@/types/firestore";

type SettlementStatuses = Map<string, { isPaid: boolean; paidAt: Date | null }>;

const debtKey = (d: Pick<DebtSettlement, "fromName" | "toName">) =>
  `${d.fromName}-${d.toName}`;

/**
 * Logic của BalanceTab trên web: ẩn người đã trả hết nợ, trừ phần đã nhận
 * khỏi số dư của chủ nợ và tạo ghi chú "A đã trả 745k".
 */
export const buildBalanceView = (
  balances: MemberBalance[],
  debts: DebtSettlement[],
  paymentHistory: PaymentTransaction[],
  statuses: SettlementStatuses
) => {
  const settledDebts = calculateSettledDebts(debts, paymentHistory);
  const isPaid = (d: DebtSettlement) => !!statuses.get(debtKey(d))?.isPaid;

  const visible = balances.filter((m) => {
    const own = settledDebts.filter((d) => d.fromName === m.name);
    return own.length === 0 || own.some((d) => !isPaid(d));
  });

  const adjustedBalances = visible.map((m) => {
    const received = settledDebts
      .filter((d) => d.toName === m.name && isPaid(d))
      .reduce((s, d) => s + d.amount, 0);
    return { ...m, net: m.net - received };
  });

  const paymentNotes = new Map<string, string>();
  for (const m of visible) {
    const paid = settledDebts.filter((d) => d.toName === m.name && isPaid(d));
    if (paid.length > 0) {
      paymentNotes.set(
        m.name,
        `(${paid.map((d) => `${d.fromName} đã trả ${formatCompactCurrency(d.amount)}`).join(", ")})`
      );
    }
  }

  return { settledDebts, adjustedBalances, paymentNotes, isPaid };
};
