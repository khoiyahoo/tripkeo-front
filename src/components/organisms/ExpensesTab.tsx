import {
  Eye,
  Info,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Receipt,
  ScanLine,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FUND_COPY } from "@/constants/fund";
import { EXPENSE_CATEGORY_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import type { ExpenseSummary } from "@/services/expenseService";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, timestampToDateStr } from "@/utils/format";
import { type ExpenseChange, previewFundBalance } from "@/utils/fundCalc";
import { clearPendingQr, loadPendingQr } from "@/utils/qrPending";
import { guessCategory, type ParsedPaymentQr } from "@/utils/vietQr";

import { AddExpenseForm, type ExpensePrefill } from "./AddExpenseForm";
import { QrScannerDialog } from "./QrScannerDialog";
import type {
  CreateExpenseInput,
  ExpenseWithId,
  FundConfig,
  FundTransactionWithId,
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
  /** Quỹ chung của chuyến (nếu đã bật) — dùng để gắn nhãn và cảnh báo ảnh hưởng */
  fund?: FundConfig;
  fundClosed?: boolean;
  fundTransactions?: FundTransactionWithId[];
  /** Tab Quỹ yêu cầu mở sẵn form thêm chi tiêu */
  openAddFund?: boolean;
  onOpenAddFundHandled?: () => void;
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
  fund,
  fundClosed = false,
  fundTransactions = [],
  openAddFund = false,
  onOpenAddFundHandled,
}: ExpensesTabProps) => {
  const user = useAuthStore((s) => s.user);
  const [isAdding, setIsAdding] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  // QR vừa quét, đang chờ chọn nguồn chi (chuyến có quỹ)
  const [pendingQr, setPendingQr] = useState<ParsedPaymentQr | null>(null);
  const [prefill, setPrefill] = useState<ExpensePrefill | undefined>();
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [impact, setImpact] = useState<{
    before: number;
    after: number;
    resolve: (ok: boolean) => void;
  } | null>(null);

  // Gợi ý người trả: thành viên có tên trùng người đang đăng nhập
  const defaultPayer = costMembers.find(
    (n) =>
      !!user?.displayName &&
      n.trim().toLowerCase() === user.displayName.trim().toLowerCase()
  );

  const fundOn = !!fund?.enabled;
  const fundAvailable = fundOn && !fundClosed;
  // Quỹ chưa có ai đóng thì chưa cho chi từ quỹ
  const fundHasContributions = fundTransactions.some(
    (t) => t.type === "contribution" && !t.voidedAt
  );

  const canEdit =
    currentUserRole === "owner" || currentUserRole === "treasurer";
  const ownerName =
    Object.values(members).find((m) => m.role === "owner")?.displayName ?? "";

  const editingExpense =
    editingExpenseId !== null
      ? (expenses.find((e) => e.id === editingExpenseId) ?? null)
      : null;

  // Quay về từ app ngân hàng (trang bị tải lại): khôi phục form và hỏi đã chuyển khoản chưa
  useEffect(() => {
    if (!canEdit) return;
    const draft = loadPendingQr();
    if (!draft) return;
    clearPendingQr();
    setPrefill({ ...draft, askConfirm: true });
    setEditingExpenseId(null);
    setIsAdding(true);
  }, [canEdit]);

  // Tab Quỹ bấm "Thêm chi từ quỹ" → mở sẵn form thêm
  useEffect(() => {
    if (!openAddFund) return;
    if (canEdit) {
      setEditingExpenseId(null);
      setIsAdding(true);
    }
    onOpenAddFundHandled?.();
  }, [openAddFund, canEdit, onOpenAddFundHandled]);

  /** Dựng form chi tiêu từ QR đã quét; `paidFrom` là nguồn chi đã chọn. */
  const startFromQr = (
    qr: ParsedPaymentQr,
    paidFrom: "fund" | "member" | undefined
  ) => {
    const title = qr.merchantName || qr.memo || "Thanh toán QR";
    const bankLine = `Chuyển khoản QR${qr.bankName ? ` ${qr.bankName}` : ""}${qr.accountNumber ? ` · ${qr.accountNumber}` : ""}`;
    const note = [qr.memo && qr.memo !== title ? qr.memo : "", bankLine]
      .filter(Boolean)
      .join("\n");
    const today = new Date().toDateString();
    const dup =
      !!qr.amount &&
      !!qr.accountNumber &&
      expenses.some(
        (e) =>
          e.amount === qr.amount &&
          !!e.note?.includes(qr.accountNumber ?? "") &&
          e.date.toDate().toDateString() === today
      );
    setPrefill({
      description: title,
      amount: qr.amount,
      category: guessCategory(`${title} ${qr.memo ?? ""}`),
      note,
      paidFrom,
      payment: {
        merchantName: qr.merchantName,
        bankBin: qr.bankBin,
        bankName: qr.bankName,
        accountNumber: qr.accountNumber,
        memo: qr.memo,
      },
      duplicateWarning: dup
        ? "Hôm nay đã có khoản cùng số tiền tới tài khoản này. Kiểm tra để tránh ghi trùng."
        : undefined,
    });
    setEditingExpenseId(null);
    setIsAdding(true);
  };

  const handleScanned = (qr: ParsedPaymentQr) => {
    setQrOpen(false);
    // Chuyến có quỹ (chưa đóng, đã có người đóng) thì hỏi nguồn chi; còn lại mặc định cá nhân ứng
    if (fundAvailable && fundHasContributions) {
      setPendingQr(qr);
      return;
    }
    startFromQr(qr, "member");
  };

  /** Hộp xác nhận "số dư quỹ trước → sau"; trả về false nếu người dùng không đồng ý. */
  const confirmFundImpact = (change: ExpenseChange): Promise<boolean> => {
    if (!fund) return Promise.resolve(true);
    const { before, after } = previewFundBalance({
      config: fund,
      members: costMembers,
      transactions: fundTransactions,
      expenses,
      change,
    });
    if (before === after) return Promise.resolve(true);
    return new Promise((resolve) => setImpact({ before, after, resolve }));
  };

  const closeImpact = (ok: boolean) => {
    impact?.resolve(ok);
    setImpact(null);
  };

  const handleEditSubmit = async (input: CreateExpenseInput): Promise<void> => {
    if (!editingExpenseId || !editingExpense) return;
    const touchesFund =
      fundOn &&
      (editingExpense.paidFrom === "fund" || input.paidFrom === "fund");
    if (touchesFund) {
      const ok = await confirmFundImpact({
        type: "upsert",
        expense: {
          id: editingExpense.id,
          amount: input.amount,
          paidBy: input.paidBy,
          paidFrom: input.paidFrom ?? editingExpense.paidFrom,
          splitBetween: input.splitBetween,
          splitMethod: input.splitMethod,
          splitDetails: input.splitDetails,
        },
      });
      if (!ok) throw new Error("cancelled");
    }
    await onUpdateExpense(editingExpenseId, input);
    setEditingExpenseId(null);
  };

  const handleDelete = async (expense: ExpenseWithId): Promise<void> => {
    if (fundOn && expense.paidFrom === "fund") {
      const ok = await confirmFundImpact({ type: "remove", id: expense.id });
      if (!ok) return;
    }
    try {
      await onDeleteExpense(expense.id);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Không thể xóa chi tiêu. Vui lòng thử lại."
      );
    }
  };

  const spentFromFund = expenses
    .filter((e) => e.paidFrom === "fund")
    .reduce((sum, e) => sum + e.amount, 0);
  const spentPersonal = summary.totalSpent - spentFromFund;

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

      <QrScannerDialog
        onOpenChange={setQrOpen}
        onScanned={handleScanned}
        open={qrOpen}
      />

      <Dialog onOpenChange={(o) => !o && setPendingQr(null)} open={!!pendingQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingQr?.merchantName ?? "Thanh toán QR"}
              {pendingQr?.amount
                ? ` · ${formatCurrency(pendingQr.amount)}`
                : ""}
            </DialogTitle>
            <DialogDescription>Khoản này lấy tiền từ đâu?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                if (pendingQr) startFromQr(pendingQr, "fund");
                setPendingQr(null);
              }}
            >
              Chi từ quỹ chung
            </Button>
            <Button
              onClick={() => {
                if (pendingQr) startFromQr(pendingQr, "member");
                setPendingQr(null);
              }}
              variant="outline"
            >
              Cá nhân ứng trước
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense list */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Danh sách chi tiêu</CardTitle>
          {canEdit && !isAdding && !editingExpenseId && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setQrOpen(true)}
                size="sm"
                variant="outline"
              >
                <ScanLine className="mr-1 h-3.5 w-3.5" />
                Quét QR
              </Button>
              <Button
                onClick={() => {
                  setPrefill(undefined);
                  setIsAdding(true);
                }}
                size="sm"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Thêm chi tiêu
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {fundOn && (
            <div className="mb-4 space-y-1.5 rounded-xl bg-surface-dim px-3 py-2.5 text-sm">
              <p className="text-on-surface">
                Chi từ quỹ <b>{formatCurrency(spentFromFund)}</b> · Cá nhân ứng{" "}
                <b>{formatCurrency(spentPersonal)}</b>
              </p>
              <p className="flex items-start gap-1.5 text-on-surface-variant text-xs">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {FUND_COPY.expenseListNote}
              </p>
            </div>
          )}
          {isAdding && canEdit && (
            <div className="mb-4">
              <AddExpenseForm
                key={
                  prefill
                    ? `qr-${prefill.payment.accountNumber}-${prefill.amount ?? 0}`
                    : "new"
                }
                costMembers={costMembers}
                prefill={prefill}
                defaultPayer={defaultPayer}
                fundAvailable={fundAvailable}
                fundHasContributions={fundHasContributions}
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
                fundAvailable={fundAvailable}
                fundHasContributions={fundHasContributions}
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
                const fromFund = expense.paidFrom === "fund";
                // Quỹ đã đóng thì khóa sửa/xóa các khoản chi từ quỹ (khớp quy tắc Firestore)
                const locked = fromFund && fundClosed;

                return (
                  <div
                    key={expense.id}
                    className={cn(
                      "group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl p-3 transition-colors hover:bg-surface-dim/50 sm:flex-nowrap",
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
                    <div className="min-w-0 flex-1 basis-0">
                      <p className="flex items-center gap-1.5 font-medium text-on-surface-variant text-sm">
                        <span className="truncate">{expense.description}</span>
                        {fromFund && (
                          <span className="shrink-0 rounded-full bg-primary-500/15 px-2 py-0.5 font-medium text-primary-400 text-xs">
                            Quỹ
                          </span>
                        )}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {timestampToDateStr(expense.date)} ·{" "}
                        {fromFund
                          ? "Chi từ quỹ"
                          : `${expense.paidBy || "?"} trả`}{" "}
                        · chia {methodLabel} ({splitCount} người)
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-on-surface text-sm">
                      {formatCurrency(expense.amount)}
                    </span>
                    {canEdit && locked && (
                      <span
                        className="flex shrink-0 basis-full items-center justify-end gap-1 text-on-surface-variant text-xs sm:basis-auto"
                        title="Quỹ đã đóng"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Quỹ đã đóng
                      </span>
                    )}
                    {canEdit && !locked && (
                      <div className="flex shrink-0 basis-full justify-end gap-0.5 transition-opacity sm:basis-auto sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
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
                          onClick={() => handleDelete(expense)}
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

      <Dialog open={!!impact} onOpenChange={(o) => !o && closeImpact(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{FUND_COPY.impactTitle}</DialogTitle>
            <DialogDescription>
              {impact &&
                FUND_COPY.impactBody(
                  formatCurrency(impact.before),
                  formatCurrency(impact.after)
                )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button onClick={() => closeImpact(false)} variant="outline">
              Hủy
            </Button>
            <Button onClick={() => closeImpact(true)}>Tiếp tục</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
