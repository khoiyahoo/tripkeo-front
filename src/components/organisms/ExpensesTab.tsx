import {
  ArrowRight,
  Eye,
  Loader2,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  timestampToDateStr,
} from "@/utils/format";

import type {
  CreateExpenseInput,
  DebtSettlement,
  ExpenseWithId,
  MemberBalance,
  TripMemberInfo,
} from "@/types/firestore";
import type { ExpenseCategory } from "@/types/trip";

interface ExpensesTabProps {
  tripId: string;
  expenses: ExpenseWithId[];
  debts: DebtSettlement[];
  balances: MemberBalance[];
  members: Record<string, TripMemberInfo>;
  budget: number;
  totalSpent: number;
  isLoading: boolean;
  currentUserRole?: "owner" | "editor" | "viewer";
  onAddExpense: (input: CreateExpenseInput) => Promise<string>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

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

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "food", label: "Ăn uống" },
  { value: "transport", label: "Di chuyển" },
  { value: "stay", label: "Chỗ ở" },
  { value: "ticket", label: "Vé tham quan" },
  { value: "shopping", label: "Mua sắm" },
  { value: "entertainment", label: "Giải trí" },
  { value: "other", label: "Khác" },
];

const AddExpenseForm = ({
  members,
  onSubmit,
  onCancel,
}: {
  members: Record<string, TripMemberInfo>;
  onSubmit: (input: CreateExpenseInput) => Promise<unknown>;
  onCancel: () => void;
}) => {
  const user = useAuthStore((s) => s.user);
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState(""); // raw digits only
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const memberIds = Object.keys(members);
  const paidBy = user?.uid ?? memberIds[0] ?? "";

  const handleSubmit = async () => {
    if (!description.trim() || !amountRaw) return;
    setIsSubmitting(true);

    const amountNum = Number(amountRaw);
    const splitAmount = amountNum / memberIds.length;
    const splitAmong: Record<string, number> = {};
    for (const uid of memberIds) {
      splitAmong[uid] = splitAmount;
    }

    await onSubmit({
      description: description.trim(),
      amount: amountNum,
      category,
      date,
      paidBy,
      paidByName: members[paidBy]?.displayName ?? "",
      splitType: "equal",
      splitAmong,
    });
    setIsSubmitting(false);
    onCancel();
  };

  return (
    <Card className="border border-primary-200 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-on-surface text-sm">
            Thêm chi phí
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <Label>Mô tả *</Label>
          <Input
            placeholder="VD: Vé máy bay"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Số tiền *</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={formatCurrencyInput(amountRaw)}
              onChange={(e) => setAmountRaw(parseCurrencyInput(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Ngày</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>Danh mục</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-on-surface-variant text-xs">
          Chia đều cho {memberIds.length} thành viên
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!description.trim() || !amountRaw || isSubmitting}
          className="w-full"
          size="sm"
        >
          {isSubmitting && (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          )}
          Thêm
        </Button>
      </CardContent>
    </Card>
  );
};

export const ExpensesTab = ({
  expenses,
  debts,
  members,
  budget,
  totalSpent,
  isLoading,
  currentUserRole,
  onAddExpense,
  onDeleteExpense,
}: ExpensesTabProps) => {
  const [isAdding, setIsAdding] = useState(false);

  const canEdit = currentUserRole !== "viewer";
  const ownerName =
    Object.values(members).find((m) => m.role === "owner")?.displayName ?? "";

  const budgetPct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const isOverBudget = totalSpent > budget;
  const memberCount = Object.keys(members).length;
  const avgPerPerson = memberCount > 0 ? totalSpent / memberCount : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Viewer read-only banner */}
      {currentUserRole === "viewer" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Bạn chỉ có quyền xem chuyến đi này.
            {ownerName ? (
              <>
                {" "}
                Liên hệ <strong>{ownerName}</strong> để được cấp quyền chỉnh
                sửa.
              </>
            ) : (
              " Liên hệ chủ chuyến đi để được cấp quyền chỉnh sửa."
            )}
          </span>
        </div>
      )}

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
            {budget > 0 && (
              <Progress
                value={budgetPct}
                className={cn(
                  "mt-2 h-2",
                  isOverBudget && "[&>div]:bg-error-500"
                )}
              />
            )}
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

      {/* Debt summary */}
      {debts.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ai nợ ai?</CardTitle>
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
                return (
                  <div
                    key={expense.id}
                    className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-dim/50"
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
                        {expense.description}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {expense.paidByName} ·{" "}
                        {timestampToDateStr(expense.date)}
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
    </div>
  );
};
