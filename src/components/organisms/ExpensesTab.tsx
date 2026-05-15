import {
  AlertTriangle,
  ArrowRight,
  Eye,
  Loader2,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { ExpensesPdfExport } from "@/components/organisms/ExpensesPdfExport";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import type { BudgetStatus } from "@/services/expenseService";
import { formatCurrency, timestampToDateStr } from "@/utils/format";

import { AddExpenseForm } from "./AddExpenseForm";
import type {
  CreateExpenseInput,
  DebtSettlement,
  ExpenseWithId,
  MemberBalance,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

// ─── Props ────────────────────────────────────────────────────
interface ExpensesTabProps {
  tripId: string;
  tripName: string;
  expenses: ExpenseWithId[];
  debts: DebtSettlement[];
  balances: MemberBalance[];
  members: Record<string, TripMemberInfo>;
  budget: number;
  totalSpent: number;
  budgetStatus: BudgetStatus;
  isLoading: boolean;
  currentUserRole?: TripRole;
  onAddExpense: (input: CreateExpenseInput) => Promise<string>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

// ─── Sub-components ───────────────────────────────────────────

const CategorySummary = ({ expenses }: { expenses: ExpenseWithId[] }) => {
  const byCategory = expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    },
    {} as Record<string, number>
  );
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {Object.entries(byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => {
          const config =
            EXPENSE_CATEGORY_CONFIG[
              cat as keyof typeof EXPENSE_CATEGORY_CONFIG
            ];
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={cat} className="flex items-center gap-3">
              <div
                className={cn("h-2.5 w-2.5 rounded-full", config.dotColor)}
              />
              <span className="w-20 text-on-surface text-sm">
                {config.label}
              </span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-surface-dim">
                  <div
                    className={cn("h-full rounded-full", config.dotColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="w-28 text-right font-medium text-on-surface text-sm">
                {formatCurrency(amount)}
              </span>
            </div>
          );
        })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

export const ExpensesTab = ({
  expenses,
  debts,
  balances,
  members,
  budget,
  totalSpent,
  budgetStatus,
  isLoading,
  currentUserRole,
  tripName,
  onAddExpense,
  onDeleteExpense,
}: ExpensesTabProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const canEdit =
    currentUserRole === "owner" || currentUserRole === "treasurer";
  const ownerName =
    Object.values(members).find((m) => m.role === "owner")?.displayName ?? "";
  const memberCount = Object.keys(members).length;
  const perPerson = memberCount > 0 ? budget / memberCount : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only banner for editor/member */}
      {!canEdit && currentUserRole && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Chỉ thủ quỹ mới có quyền quản lý chi phí.
            {ownerName ? (
              <>
                {" "}
                Liên hệ <strong>{ownerName}</strong> nếu cần thay đổi.
              </>
            ) : (
              " Liên hệ chủ chuyến đi nếu cần thay đổi."
            )}
          </span>
        </div>
      )}

      {/* Budget summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Ngân sách</p>
            <p className="font-bold text-2xl text-on-surface">
              {formatCurrency(budget)}
            </p>
            {budget > 0 && memberCount > 0 && (
              <p className="mt-1 text-on-surface-variant text-xs">
                {formatCurrency(perPerson)} / người
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">
              Đã chi (quỹ chung + trả hộ)
            </p>
            <p className="font-bold text-2xl text-on-surface">
              {formatCurrency(budgetStatus.totalGroupSpent)}
            </p>
            {budget > 0 && (
              <Progress
                value={Math.min(budgetStatus.percentUsed, 100)}
                className={cn(
                  "mt-2 h-2",
                  budgetStatus.isOverBudget && "[&>div]:bg-error-500",
                  budgetStatus.isWarning && "[&>div]:bg-amber-500"
                )}
              />
            )}
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Còn lại</p>
            <p
              className={cn(
                "font-bold text-2xl",
                budgetStatus.remaining < 0
                  ? "text-error-600"
                  : "text-on-surface"
              )}
            >
              {formatCurrency(budgetStatus.remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget warnings */}
      {budgetStatus.isOverBudget && (
        <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-error-700 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">🚨 Vượt ngân sách!</p>
            <p>
              Thu thêm{" "}
              <strong>
                {formatCurrency(Math.round(budgetStatus.collectMore))}
              </strong>{" "}
              / người
            </p>
          </div>
        </div>
      )}
      {budgetStatus.isWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            ⚠️ Đã dùng {Math.round(budgetStatus.percentUsed)}% ngân sách
          </span>
        </div>
      )}

      {/* Category breakdown */}
      {expenses.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chi phí theo hạng mục</CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySummary expenses={expenses} />
          </CardContent>
        </Card>
      )}

      {/* Balance summary */}
      {balances.some((b) => Math.abs(b.net) >= 1) && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Tổng kết (sau chuyến đi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {balances
                .sort((a, b) => b.net - a.net)
                .map((b) => (
                  <div
                    key={b.uid}
                    className="flex items-center justify-between rounded-xl bg-surface-dim/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            b.net > 1
                              ? "bg-success-50 text-success-700"
                              : b.net < -1
                                ? "bg-error-50 text-error-700"
                                : "bg-surface-dim text-on-surface-variant"
                          )}
                        >
                          {b.displayName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-on-surface text-sm">
                        {b.displayName}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-bold text-sm",
                        b.net > 1
                          ? "text-success-600"
                          : b.net < -1
                            ? "text-error-600"
                            : "text-on-surface-variant"
                      )}
                    >
                      {b.net > 1
                        ? `được hoàn +${formatCurrency(Math.round(b.net))}`
                        : b.net < -1
                          ? `đóng thêm ${formatCurrency(Math.round(b.net))}`
                          : `huề ${formatCurrency(0)}`}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debt settlements */}
      {debts.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ai trả ai?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debts.map((debt) => (
                <div
                  key={`${debt.fromUid}-${debt.toUid}`}
                  className="flex items-center gap-3 rounded-xl bg-surface-dim/50 p-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-error-50 text-error-700 text-xs">
                      {debt.fromName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-on-surface text-sm">
                    {debt.fromName}
                  </span>
                  <ArrowRight className="h-4 w-4 text-on-surface-variant" />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-success-50 text-success-700 text-xs">
                      {debt.toName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-on-surface text-sm">
                    {debt.toName}
                  </span>
                  <span className="ml-auto font-bold text-error-600 text-sm">
                    {formatCurrency(debt.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Danh sách chi phí</CardTitle>
          {canEdit && !isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm chi phí
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isAdding && canEdit && (
            <div className="mb-4">
              <AddExpenseForm
                members={members}
                onSubmit={onAddExpense}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}
          {expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const config = EXPENSE_CATEGORY_CONFIG[expense.category];
                const paidByType = expense.paidBy?.type ?? "group_fund";
                const isShared = paidByType === "member_shared";
                const isPersonal = paidByType === "member_personal";
                const splitCount = expense.splitBetween?.length ?? 0;
                const allMembers = splitCount === memberCount;

                return (
                  <div
                    key={expense.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-dim/50",
                      isShared && "border-amber-500 border-l-2",
                      isPersonal && "border-neutral-300 border-l-2"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        config.bgColor
                      )}
                    >
                      <Receipt className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-medium text-on-surface text-sm",
                          isPersonal && "italic"
                        )}
                      >
                        {expense.description}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {timestampToDateStr(expense.date)} ·{" "}
                        {isShared ? (
                          <>
                            <span className="rounded bg-amber-100 px-1 text-amber-700">
                              (phát sinh)
                            </span>{" "}
                            {expense.paidBy?.displayName ?? "Thành viên"} trả
                          </>
                        ) : isPersonal ? (
                          <>
                            <span className="rounded bg-neutral-100 px-1 text-neutral-600">
                              (cá nhân)
                            </span>{" "}
                            {expense.paidBy?.displayName ?? ""}
                          </>
                        ) : (
                          "Quỹ chung"
                        )}
                        {!isPersonal && !allMembers && splitCount > 0 && (
                          <span className="ml-1 text-on-surface-variant">
                            ({splitCount}/{memberCount} người)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-semibold text-on-surface text-sm">
                      {formatCurrency(expense.amount)}
                    </span>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => onDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-error-500" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-on-surface-variant text-sm">
              Chưa có chi phí nào. Thêm chi phí đầu tiên!
            </p>
          )}
        </CardContent>
      </Card>

      {/* PDF Export */}
      {expenses.length > 0 && (
        <ExpensesPdfExport
          meta={{ title: tripName, memberCount }}
          expenses={expenses}
          budget={budget}
          totalSpent={totalSpent}
          balances={balances}
          debts={debts}
        />
      )}
    </div>
  );
};
