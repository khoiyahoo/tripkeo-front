import { ArrowRight } from "lucide-react";

// import { useState } from "react";

// import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ExpenseSummary } from "@/services/expenseService";
import { formatCurrency } from "@/utils/format";

import type { DebtSettlement, MemberBalance } from "@/types/firestore";

interface BalanceTabProps {
  summary: ExpenseSummary;
  balances: MemberBalance[];
  debts: DebtSettlement[];
}

export const BalanceTab = ({ summary, balances, debts }: BalanceTabProps) => {
  // const [_copied, setCopied] = useState(false);
  // const copyText = buildCopyText(tripName, summary, balances, debts);

  // const _handleCopy = async () => {
  //   await navigator.clipboard.writeText(copyText);
  //   setCopied(true);
  //   toast.success("Đã sao chép!");
  //   setTimeout(() => setCopied(false), 2000);
  // };

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

      {/* Per-member balances */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Số dư từng người</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {balances.map((b) => (
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
          {balances.length === 0 && (
            <p className="py-4 text-center text-on-surface-variant text-sm">
              Chưa có dữ liệu
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settlement — who pays whom */}
      {debts.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ai trả ai?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {debts.map((d, i) => (
              <div
                key={`${d.fromName}-${d.toName}-${i}`}
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
                <span className="ml-auto font-bold text-on-surface text-sm">
                  {formatCurrency(d.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
