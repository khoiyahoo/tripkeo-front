import { ArrowRight, Plus, Receipt } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

import type { DebtRecord, Expense, TripMember } from "@/types/trip";

interface ExpensesTabProps {
  expenses: Expense[];
  debts: DebtRecord[];
  members: TripMember[];
  budget: number;
  totalSpent: number;
}

const CategorySummary = ({ expenses }: { expenses: Expense[] }) => {
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

export const ExpensesTab = ({
  expenses,
  debts,
  members,
  budget,
  totalSpent,
}: ExpensesTabProps) => {
  const budgetPct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const isOverBudget = totalSpent > budget;
  const avgPerPerson = members.length > 0 ? totalSpent / members.length : 0;

  return (
    <div className="space-y-6">
      {/* Budget summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Tổng chi phí</p>
            <p className="font-bold text-2xl text-on-surface">
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">Ngân sách</p>
            <p className="font-bold text-2xl text-on-surface">
              {formatCurrency(budget)}
            </p>
            <Progress
              value={budgetPct}
              className={cn("mt-2 h-2", isOverBudget && "[&>div]:bg-error-500")}
            />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-on-surface-variant text-sm">
              Trung bình / người
            </p>
            <p className="font-bold text-2xl text-on-surface">
              {formatCurrency(avgPerPerson)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chi phí theo hạng mục</CardTitle>
        </CardHeader>
        <CardContent>
          <CategorySummary expenses={expenses} />
        </CardContent>
      </Card>

      {/* Debt summary */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ai nợ ai?</CardTitle>
        </CardHeader>
        <CardContent>
          {debts.length > 0 ? (
            <div className="space-y-3">
              {debts.map((debt) => (
                <div
                  key={`${debt.fromId}-${debt.toId}`}
                  className="flex items-center gap-3 rounded-xl bg-surface-dim/50 p-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-error-50 text-error-700 text-xs">
                      {debt.from[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-on-surface text-sm">
                    {debt.from}
                  </span>
                  <ArrowRight className="h-4 w-4 text-on-surface-variant" />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-success-50 text-success-700 text-xs">
                      {debt.to[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-on-surface text-sm">
                    {debt.to}
                  </span>
                  <span className="ml-auto font-bold text-error-600 text-sm">
                    {formatCurrency(debt.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-on-surface-variant text-sm">
              Tất cả đã thanh toán xong!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expense list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Danh sách chi phí</CardTitle>
          <Button size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Thêm chi phí
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenses.map((expense) => {
              const config = EXPENSE_CATEGORY_CONFIG[expense.category];
              return (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-dim/50"
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
                    <p className="truncate font-medium text-on-surface text-sm">
                      {expense.title}
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      {expense.paidBy} · {expense.date}
                    </p>
                  </div>
                  <span className="font-semibold text-on-surface text-sm">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
