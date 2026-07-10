import { Eye, Loader2, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import type { ExpenseSummary } from "@/services/expenseService";
import { formatCurrency, timestampToDateStr } from "@/utils/format";

import { AddExpenseForm } from "./AddExpenseForm";
import type {
  CreateExpenseInput,
  ExpenseWithId,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

const SPLIT_METHOD_LABELS: Record<string, string> = {
  equal: "đều",
  percentage: "%",
  amount: "số tiền",
  shares: "phần",
};

// ─── Props ────────────────────────────────────────────────────
interface ExpensesTabProps {
  expenses: ExpenseWithId[];
  summary: ExpenseSummary;
  /** System members map (for role checks) */
  members: Record<string, TripMemberInfo>;
  /** Cost members list (names for expense split UI) */
  costMembers: string[];
  isLoading: boolean;
  currentUserRole?: TripRole;
  onAddExpense: (input: CreateExpenseInput) => Promise<string>;
  onUpdateExpense: (
    expenseId: string,
    data: Partial<CreateExpenseInput>
  ) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

// ─── Category breakdown ──────────────────────────────────────

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
  summary,
  members,
  costMembers,
  isLoading,
  currentUserRole,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}: ExpensesTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const canEdit =
    currentUserRole === "owner" || currentUserRole === "treasurer";
  const ownerName =
    Object.values(members).find((m) => m.role === "owner")?.displayName ?? "";

  const editingExpense =
    editingExpenseId !== null
      ? (expenses.find((e) => e.id === editingExpenseId) ?? null)
      : null;

  const handleEditSubmit = async (input: CreateExpenseInput): Promise<void> => {
    if (!editingExpenseId) return;
    await onUpdateExpense(editingExpenseId, input);
    setEditingExpenseId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // meta được truyền từ TripDetailPage, đảm bảo PDF snapshot đúng thông tin chuyến đi

  return (
    <div className="space-y-6">
      {/* Read-only banner */}
      {!canEdit && currentUserRole && (
        <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Chỉ chủ sở hữu / thủ quỹ mới có quyền quản lý chi tiêu.
            {ownerName && (
              <>
                {" "}
                Liên hệ <strong>{ownerName}</strong> nếu cần thay đổi.
              </>
            )}
          </span>
        </div>
      )}

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
            <p className="text-on-surface-variant text-sm">
              Trung bình / người
            </p>
            <p className="font-bold text-2xl text-on-surface">
              {costMembers.length > 0
                ? formatCurrency(
                    Math.round(summary.totalSpent / costMembers.length)
                  )
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {expenses.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chi tiêu theo danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            <CategorySummary expenses={expenses} />
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Danh sách chi tiêu</CardTitle>
          {canEdit && !isAdding && !editingExpenseId && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm chi tiêu
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isAdding && canEdit && (
            <div className="mb-4">
              <AddExpenseForm
                key="new"
                costMembers={costMembers}
                onSubmit={onAddExpense}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}

          {editingExpense && canEdit && (
            <div className="mb-4">
              <AddExpenseForm
                key={editingExpense.id}
                costMembers={costMembers}
                initialData={editingExpense}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditingExpenseId(null)}
              />
            </div>
          )}

          {expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const config = EXPENSE_CATEGORY_CONFIG[expense.category];
                const splitCount = expense.splitBetween?.length ?? 0;
                const isEditing = editingExpenseId === expense.id;
                const methodLabel =
                  SPLIT_METHOD_LABELS[expense.splitMethod ?? "equal"];

                return (
                  <div
                    key={expense.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-dim/50",
                      isEditing &&
                        "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        config.bgColor
                      )}
                    >
                      <Receipt className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-on-surface-variant text-sm">
                        {expense.description}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {timestampToDateStr(expense.date)} ·{" "}
                        {expense.paidBy || "?"} trả · chia {methodLabel} (
                        {splitCount} người)
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-on-surface text-sm">
                      {formatCurrency(expense.amount)}
                    </span>
                    {canEdit && (
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setIsAdding(false);
                            setEditingExpenseId(isEditing ? null : expense.id);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onDeleteExpense(expense.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-error-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-on-surface-variant text-sm">
              Chưa có chi tiêu nào. Thêm chi tiêu đầu tiên!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
