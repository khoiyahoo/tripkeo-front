import {
  AlertTriangle,
  Ban,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ExpensesPdfExport } from "@/components/organisms/ExpensesPdfExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import type { BudgetStatus, SettlementResult } from "@/services/expenseService";
import { doesAffectGroupFund } from "@/services/expenseService";
import { formatCurrency, timestampToDateStr } from "@/utils/format";

import { AddExpenseForm } from "./AddExpenseForm";
import type {
  CreateExpenseInput,
  ExpenseWithId,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

// ─── Props ────────────────────────────────────────────────────
interface ExpensesTabProps {
  tripId: string;
  tripName: string;
  expenses: ExpenseWithId[];
  settlement: SettlementResult;
  members: Record<string, TripMemberInfo>;
  budget: number;
  budgetStatus: BudgetStatus;
  isLoading: boolean;
  currentUserRole?: TripRole;
  onAddExpense: (input: CreateExpenseInput) => Promise<string>;
  onUpdateExpense: (
    expenseId: string,
    data: Partial<CreateExpenseInput>
  ) => Promise<void>;
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
  settlement,
  members,
  budget,
  budgetStatus,
  isLoading,
  currentUserRole,
  tripName,
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
  const memberCount = Object.keys(members).length;
  const perPerson = memberCount > 0 ? budget / memberCount : 0;

  const editingExpense =
    editingExpenseId !== null
      ? (expenses.find((e) => e.id === editingExpenseId) ?? null)
      : null;

  // Split expenses into categories for settlement tables
  const groupFundExpenses = useMemo(
    () => expenses.filter((e) => e.paidBy?.type === "group_fund"),
    [expenses]
  );
  const memberSharedCase3 = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.paidBy?.type === "member_shared" &&
          (e.splitBetween?.length ?? 0) === memberCount
      ),
    [expenses, memberCount]
  );
  const memberSharedCase4 = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.paidBy?.type === "member_shared" &&
          (e.splitBetween?.length ?? 0) < memberCount
      ),
    [expenses, memberCount]
  );

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

  return (
    <div className="space-y-6">
      {/* PDF Export */}
      {expenses.length > 0 && (
        <ExpensesPdfExport
          meta={{ title: tripName, memberCount }}
          expenses={expenses}
          budget={budget}
          totalGroupSpent={budgetStatus.totalGroupSpent}
          settlement={settlement}
        />
      )}

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

      {/* Quyết toán — detailed settlement tables */}
      {expenses.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quyết toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {/* Section 1: Chi từ quỹ chung (Case 1 & 2) */}
            <div>
              <h5 className="mb-2 flex items-center gap-2 font-semibold text-primary-700 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
                💰 Chi từ quỹ chung
              </h5>
              {groupFundExpenses.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary-50 text-on-surface-variant text-xs">
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Mô tả
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Chia cho
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Số tiền
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupFundExpenses.map((exp, idx) => {
                        const splitCount = exp.splitBetween?.length ?? 0;
                        const nonParticipants = Object.entries(members)
                          .filter(([uid]) => !exp.splitBetween?.includes(uid))
                          .map(([, m]) => m.displayName);
                        return (
                          <tr
                            key={exp.id}
                            className="border-surface-dim border-t"
                          >
                            <td className="px-3 py-2 text-on-surface-variant">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 text-on-surface">
                              {exp.description}
                            </td>
                            <td className="px-3 py-2 text-on-surface-variant">
                              {splitCount}/{memberCount} người
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-on-surface">
                              {formatCurrency(exp.amount)}
                            </td>
                            <td className="px-3 py-2 text-on-surface-variant text-xs">
                              {nonParticipants.length > 0
                                ? `${nonParticipants.join(", ")} ko đi`
                                : exp.note || ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-primary-50/50">
                        <td
                          colSpan={3}
                          className="px-3 py-2 text-right font-semibold text-on-surface text-xs"
                        >
                          Tổng:
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-on-surface">
                          {formatCurrency(settlement.groupFundSpent)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg bg-surface-dim/50 px-3 py-2 text-on-surface-variant text-sm">
                  Chưa có chi phí từ quỹ chung.
                </p>
              )}
            </div>

            {/* Section 2: Thành viên trả hộ — Quỹ hoàn lại (Case 3) */}
            <div>
              <h5 className="mb-2 flex items-center gap-2 font-semibold text-amber-700 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                🤝 Thành viên trả hộ (Quỹ hoàn lại)
              </h5>
              {memberSharedCase3.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-50 text-on-surface-variant text-xs">
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Mô tả
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Người trả
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Chia cho
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Số tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberSharedCase3.map((exp, idx) => (
                        <tr
                          key={exp.id}
                          className="border-surface-dim border-t"
                        >
                          <td className="px-3 py-2 text-on-surface-variant">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 text-on-surface">
                            {exp.description}
                          </td>
                          <td className="px-3 py-2 font-medium text-amber-700">
                            {exp.paidBy?.displayName ?? ""}
                          </td>
                          <td className="px-3 py-2 text-on-surface-variant">
                            {exp.splitBetween?.length ?? 0}/{memberCount} người
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-on-surface">
                            {formatCurrency(exp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-amber-50/50">
                        <td
                          colSpan={4}
                          className="px-3 py-2 text-right font-semibold text-on-surface text-xs"
                        >
                          Tổng:
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-on-surface">
                          {formatCurrency(settlement.totalReimburseToMembers)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="rounded-lg bg-surface-dim/50 px-3 py-2 text-on-surface-variant text-sm">
                  Chưa có chi phí thành viên trả hộ.
                </p>
              )}
            </div>

            {/* Section 3: Tự thanh toán (Case 4) */}
            {memberSharedCase4.length > 0 && (
              <div>
                <h5 className="mb-2 flex items-center gap-2 font-semibold text-neutral-600 text-sm">
                  <Ban className="h-3.5 w-3.5" />🚫 Tự thanh toán (Hệ thống
                  không tính)
                </h5>
                <div className="overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 text-on-surface-variant text-xs">
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        <th className="px-3 py-2 text-left font-medium">
                          Mô tả
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Người trả
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          Chia cho
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Số tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberSharedCase4.map((exp, idx) => (
                        <tr
                          key={exp.id}
                          className="border-neutral-100 border-t"
                        >
                          <td className="px-3 py-2 text-on-surface-variant">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 text-on-surface">
                            {exp.description}
                          </td>
                          <td className="px-3 py-2 font-medium text-neutral-600">
                            {exp.paidBy?.displayName ?? ""}
                          </td>
                          <td className="px-3 py-2 text-on-surface-variant">
                            {exp.splitBetween?.length ?? 0}/{memberCount} người
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-on-surface">
                            {formatCurrency(exp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-neutral-50/50">
                        <td
                          colSpan={5}
                          className="px-3 py-2 text-neutral-500 text-xs"
                        >
                          ℹ️ Các thành viên tự thanh toán với nhau
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Section 4: Quyết toán quỹ */}
            <div className="rounded-lg border bg-surface-dim/30 p-4">
              <h5 className="mb-3 font-semibold text-on-surface text-sm">
                📋 Quyết toán quỹ
              </h5>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Ngân sách:</span>
                  <span className="font-medium text-on-surface">
                    {formatCurrency(budget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Chi quỹ chung:
                  </span>
                  <span className="font-medium text-on-surface">
                    − {formatCurrency(settlement.groupFundSpent)}
                  </span>
                </div>
                {settlement.totalReimburseToMembers > 0 && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      Hoàn cho member trả hộ:
                    </span>
                    <span className="font-medium text-on-surface">
                      − {formatCurrency(settlement.totalReimburseToMembers)}
                    </span>
                  </div>
                )}
                {settlement.totalRefundNonParticipants > 0 && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      Hoàn cho member không tham gia:
                    </span>
                    <span className="font-medium text-on-surface">
                      −{" "}
                      {formatCurrency(
                        Math.round(settlement.totalRefundNonParticipants)
                      )}
                    </span>
                  </div>
                )}
                <div className="my-1 border-on-surface-variant/20 border-t" />
                <div className="flex justify-between">
                  <span className="font-semibold text-on-surface">
                    Quỹ còn lại:
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      settlement.fundRemaining > 0
                        ? "text-success-600"
                        : settlement.fundRemaining < 0
                          ? "text-error-600"
                          : "text-on-surface-variant"
                    )}
                  >
                    {formatCurrency(Math.round(settlement.fundRemaining))}
                  </span>
                </div>
                {settlement.perPersonReturn > 0 && (
                  <p className="text-success-600 text-xs">
                    Hoàn mỗi người ({memberCount} người):{" "}
                    {formatCurrency(Math.round(settlement.perPersonReturn))}
                  </p>
                )}
                {settlement.perPersonOwes > 0 && (
                  <p className="text-error-600 text-xs">
                    Mỗi người đóng thêm ({memberCount} người):{" "}
                    {formatCurrency(Math.round(settlement.perPersonOwes))}
                  </p>
                )}
              </div>

              {/* Ai nhận tiền từ quỹ */}
              {(settlement.reimburseToMembers.length > 0 ||
                settlement.refundToNonParticipants.length > 0 ||
                settlement.perPersonReturn > 0) && (
                <div className="mt-4">
                  <h6 className="mb-2 font-semibold text-on-surface text-xs">
                    📌 Ai nhận tiền từ quỹ:
                  </h6>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-success-50 text-on-surface-variant text-xs">
                          <th className="px-3 py-2 text-left font-medium">
                            Người nhận
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Lý do
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Số tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlement.reimburseToMembers.map((r) => (
                          <tr
                            key={`reimburse-${r.uid}`}
                            className="border-surface-dim border-t"
                          >
                            <td className="px-3 py-2">
                              <span className="font-medium text-success-700">
                                🟢 {r.name}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-on-surface-variant">
                              Trả hộ
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-on-surface">
                              {formatCurrency(Math.round(r.amount))}
                            </td>
                          </tr>
                        ))}
                        {settlement.refundToNonParticipants.map((r) => (
                          <tr
                            key={`refund-${r.uid}`}
                            className="border-surface-dim border-t"
                          >
                            <td className="px-3 py-2">
                              <span className="font-medium text-success-700">
                                🟢 {r.name}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-on-surface-variant">
                              Không tham gia
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-on-surface">
                              {formatCurrency(Math.round(r.amount))}
                            </td>
                          </tr>
                        ))}
                        {settlement.perPersonReturn > 0 && (
                          <tr className="border-surface-dim border-t">
                            <td className="px-3 py-2">
                              <span className="font-medium text-success-700">
                                🟢 Tất cả ({memberCount} người)
                              </span>
                            </td>
                            <td className="px-3 py-2 text-on-surface-variant">
                              Hoàn quỹ dư
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-on-surface">
                              {formatCurrency(
                                Math.round(settlement.perPersonReturn)
                              )}
                              /ng
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ai cần đóng thêm */}
              {settlement.perPersonOwes > 0 && (
                <div className="mt-4">
                  <h6 className="mb-2 font-semibold text-error-700 text-xs">
                    📌 Ai cần đóng thêm:
                  </h6>
                  <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-error-700 text-sm">
                    Tất cả ({memberCount} người) đóng thêm{" "}
                    <strong>
                      {formatCurrency(Math.round(settlement.perPersonOwes))}
                    </strong>{" "}
                    / người
                  </div>
                </div>
              )}
              {settlement.fundRemaining >= 0 &&
                settlement.perPersonOwes === 0 &&
                settlement.reimburseToMembers.length === 0 &&
                settlement.refundToNonParticipants.length === 0 &&
                settlement.perPersonReturn === 0 && (
                  <p className="mt-3 text-on-surface-variant text-xs">
                    (Không có — quỹ còn dư)
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Danh sách chi phí</CardTitle>
          {canEdit && !isAdding && !editingExpenseId && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm chi phí
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Add form */}
          {isAdding && canEdit && (
            <div className="mb-4">
              <AddExpenseForm
                key="new"
                members={members}
                onSubmit={onAddExpense}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}

          {/* Edit form */}
          {editingExpense && canEdit && (
            <div className="mb-4">
              <AddExpenseForm
                key={editingExpense.id}
                members={members}
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
                const paidByType = expense.paidBy?.type ?? "group_fund";
                const isShared = paidByType === "member_shared";
                const splitCount = expense.splitBetween?.length ?? 0;
                const allMembers = splitCount === memberCount;
                const isEditing = editingExpenseId === expense.id;
                const affects = doesAffectGroupFund(
                  paidByType,
                  splitCount,
                  memberCount
                );

                return (
                  <div
                    key={expense.id}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface-dim/50",
                      isShared && affects && "border-amber-500 border-l-2",
                      isShared && !affects && "border-neutral-300 border-l-2",
                      isEditing && "bg-primary-50 ring-1 ring-primary-200"
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
                      <p className="truncate font-medium text-on-surface text-sm">
                        {expense.description}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {timestampToDateStr(expense.date)} ·{" "}
                        {isShared ? (
                          affects ? (
                            <>
                              <span className="rounded bg-amber-100 px-1 text-amber-700">
                                trả hộ
                              </span>{" "}
                              {expense.paidBy?.displayName ?? "Thành viên"} →
                              quỹ hoàn
                            </>
                          ) : (
                            <>
                              <span className="rounded bg-neutral-100 px-1 text-neutral-600">
                                tự thanh toán
                              </span>{" "}
                              {expense.paidBy?.displayName ?? "Thành viên"}
                            </>
                          )
                        ) : (
                          "Quỹ chung"
                        )}
                        {!allMembers && splitCount > 0 && (
                          <span className="ml-1 text-on-surface-variant">
                            ({splitCount}/{memberCount} người)
                          </span>
                        )}
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
              Chưa có chi phí nào. Thêm chi phí đầu tiên!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
