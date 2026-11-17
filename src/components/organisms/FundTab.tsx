import {
  AlertTriangle,
  Info,
  Loader2,
  Lock,
  Plus,
  Settings2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  FundTransactionDialog,
  type FundTransactionDraft,
} from "@/components/organisms/FundTransactionDialog";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  CONTRIBUTION_STATUS_LABEL,
  FUND_COPY,
  FUND_TX_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/constants/fund";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  timestampToDateStr,
} from "@/utils/format";
import type {
  ContributionStatus,
  FundSettlementItem,
  FundSummary,
  MemberFundLedger,
} from "@/utils/fundCalc";
import {
  countFundExpenses,
  findExpensesWithSplitIssues,
} from "@/utils/fundCalc";

import type {
  CreateFundTransactionInput,
  ExpenseWithId,
  FundConfig,
  FundTransactionWithId,
  TripRole,
} from "@/types/firestore";

interface FundTabProps {
  fund?: FundConfig;
  closed: boolean;
  costMembers: string[];
  expenses: ExpenseWithId[];
  transactions: FundTransactionWithId[];
  summary: FundSummary | null;
  ledger: MemberFundLedger[];
  settlement: FundSettlementItem[];
  gap: number;
  isLoading: boolean;
  loadError?: string | null;
  onReload?: () => void;
  currentUserRole?: TripRole;
  onEnable: (perPerson: number) => Promise<void>;
  onDisable: () => Promise<void>;
  onUpdateRequired: (
    perPerson: number,
    byMember: Record<string, number>
  ) => Promise<void>;
  onCreateTransaction: (input: CreateFundTransactionInput) => Promise<unknown>;
  onVoidTransaction: (id: string, reason: string) => Promise<void>;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
  onGoToExpenses: (addFundExpense: boolean) => void;
}

const STATUS_STYLE: Record<ContributionStatus, string> = {
  unpaid: "bg-error-500/15 text-error-400",
  partial: "bg-warning-500/15 text-warning-400",
  paid: "bg-success-500/15 text-success-400",
  over: "bg-primary-500/15 text-primary-400",
};

const errMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

// ─── Hộp thoại cấu hình quỹ ───────────────────────────────────
const FundSettingsDialog = ({
  open,
  fund,
  costMembers,
  canDisable,
  onClose,
  onSave,
  onDisable,
}: {
  open: boolean;
  fund: FundConfig;
  costMembers: string[];
  canDisable: boolean;
  onClose: () => void;
  onSave: (
    perPerson: number,
    byMember: Record<string, number>
  ) => Promise<void>;
  onDisable: () => Promise<void>;
}) => {
  const [perPerson, setPerPerson] = useState(String(fund.perPerson));
  const [byMember, setByMember] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(fund.requiredByMember ?? {}).map(([k, v]) => [
        k,
        String(v),
      ])
    )
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const base = Number(perPerson);
    if (!Number.isInteger(base) || base <= 0) {
      toast.error("Mức đóng mặc định phải là số nguyên dương");
      return;
    }
    const overrides: Record<string, number> = {};
    for (const [name, raw] of Object.entries(byMember)) {
      const n = Number(raw);
      if (raw && Number.isInteger(n) && n > 0 && n !== base)
        overrides[name] = n;
    }
    setBusy(true);
    try {
      await onSave(base, overrides);
      toast.success("Đã cập nhật mức đóng");
      onClose();
    } catch (err) {
      toast.error(errMessage(err, "Không thể lưu. Vui lòng thử lại."));
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await onDisable();
      toast.success("Đã tắt quỹ chung");
      onClose();
    } catch (err) {
      toast.error(errMessage(err, "Không thể tắt quỹ. Vui lòng thử lại."));
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cài đặt quỹ chung</DialogTitle>
          <DialogDescription>
            Mức đóng mặc định áp dụng cho mọi người. Có thể đặt mức riêng cho
            người đi nửa chặng hoặc trẻ em.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Mức đóng mặc định / người (VNĐ)</Label>
            <Input
              className="mt-1"
              inputMode="numeric"
              onChange={(e) => setPerPerson(parseCurrencyInput(e.target.value))}
              value={formatCurrencyInput(perPerson)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mức riêng (để trống = mặc định)</Label>
            {costMembers.map((name) => (
              <div className="flex items-center gap-3" key={name}>
                <span className="w-28 truncate text-on-surface text-sm sm:w-36">
                  {name}
                </span>
                <Input
                  className="h-10 min-w-0 flex-1 text-sm"
                  inputMode="numeric"
                  onChange={(e) =>
                    setByMember((p) => ({
                      ...p,
                      [name]: parseCurrencyInput(e.target.value),
                    }))
                  }
                  placeholder={formatCurrencyInput(perPerson)}
                  value={formatCurrencyInput(byMember[name] ?? "")}
                />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-outline-variant p-3">
            <p className="font-medium text-on-surface text-sm">Tắt quỹ chung</p>
            <p className="mt-1 text-on-surface-variant text-xs">
              {canDisable
                ? "Giữ lại lịch sử giao dịch."
                : FUND_COPY.cannotDisable}
            </p>
            <Button
              className="mt-2"
              disabled={!canDisable || busy}
              onClick={disable}
              size="sm"
              variant="outline"
            >
              Tắt quỹ
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button disabled={busy} onClick={onClose} variant="outline">
            Đóng
          </Button>
          <Button disabled={busy} onClick={save}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Tab Quỹ ───────────────────────────────────────────────────
export const FundTab = ({
  fund,
  closed,
  costMembers,
  expenses,
  transactions,
  summary,
  ledger,
  settlement,
  gap,
  isLoading,
  loadError,
  onReload,
  currentUserRole,
  onEnable,
  onDisable,
  onUpdateRequired,
  onCreateTransaction,
  onVoidTransaction,
  onClose,
  onReopen,
  onGoToExpenses,
}: FundTabProps) => {
  const isOwner = currentUserRole === "owner";
  const splitIssues = findExpensesWithSplitIssues(expenses, costMembers);
  const canManage = isOwner || currentUserRole === "treasurer";
  const canWrite = canManage && !closed;

  const [enablePerPerson, setEnablePerPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [txDraft, setTxDraft] = useState<FundTransactionDraft | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<FundTransactionWithId | null>(
    null
  );
  const [voidReason, setVoidReason] = useState("");
  const [noContribWarn, setNoContribWarn] = useState(false);

  const fundExpenses = expenses.filter((e) => e.paidFrom === "fund");

  // ── Chưa bật quỹ ──
  if (!fund?.enabled) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-on-surface">Quỹ chung</h3>
              <p className="text-on-surface-variant text-sm">
                Thu tiền trước của mọi người, thủ quỹ chi dần và ghi lại chi
                tiết để biết quỹ còn dư hay âm.
              </p>
            </div>
          </div>
          {isOwner ? (
            <div className="space-y-2">
              <Label>Mức đóng mỗi người (VNĐ)</Label>
              <Input
                inputMode="numeric"
                onChange={(e) =>
                  setEnablePerPerson(parseCurrencyInput(e.target.value))
                }
                placeholder="VD: 3.000.000"
                value={formatCurrencyInput(enablePerPerson)}
              />
              {Number(enablePerPerson) > 0 && costMembers.length > 0 && (
                <p className="text-on-surface-variant text-xs">
                  {costMembers.length} người ×{" "}
                  {formatCurrency(Number(enablePerPerson))} ={" "}
                  <b>
                    {formatCurrency(
                      Number(enablePerPerson) * costMembers.length
                    )}
                  </b>
                </p>
              )}
              <Button
                disabled={!Number(enablePerPerson) || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onEnable(Number(enablePerPerson));
                    toast.success("Đã bật quỹ chung");
                  } catch (err) {
                    toast.error(
                      errMessage(err, "Không thể bật quỹ. Vui lòng thử lại.")
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Bật quỹ chung
              </Button>
            </div>
          ) : (
            <p className="rounded-xl bg-surface-dim px-4 py-3 text-on-surface-variant text-sm">
              Chuyến đi này chưa bật quỹ chung. Chủ chuyến có thể bật ở đây.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  const shortage = summary.isNegative ? -summary.balance : 0;
  const perPersonShortage =
    costMembers.length > 0
      ? Math.ceil(shortage / costMembers.length)
      : shortage;

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setBusy(true);
    try {
      await onVoidTransaction(voidTarget.id, voidReason);
      toast.success("Đã hủy giao dịch");
      setVoidTarget(null);
      setVoidReason("");
    } catch (err) {
      toast.error(
        errMessage(err, "Không thể hủy giao dịch. Vui lòng thử lại.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tổng quan */}
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-on-surface-variant text-sm">
                {summary.isNegative ? "Quỹ đang âm" : "Quỹ còn dư"}
              </p>
              <p
                className={cn(
                  "font-bold text-3xl",
                  summary.isNegative ? "text-error-500" : "text-success-500"
                )}
              >
                {summary.isNegative ? "−" : ""}
                {formatCurrency(Math.abs(summary.balance))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {closed && (
                <Badge className="gap-1">
                  <Lock className="h-3 w-3" />
                  Đã đóng
                </Badge>
              )}
              {isOwner && (
                <Button
                  aria-label="Cài đặt quỹ"
                  onClick={() => setSettingsOpen(true)}
                  size="icon"
                  title="Cài đặt quỹ"
                  variant="outline"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant">
                Đã thu {formatCurrency(summary.collected)}
              </span>
              <span className="text-on-surface-variant">
                Mục tiêu {formatCurrency(summary.target)}
              </span>
            </div>
            <Progress value={summary.collectedPercent} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Đã thu", value: summary.collected },
              { label: "Đã chi", value: summary.spentFromFund },
              { label: "Đã hoàn", value: summary.refunded },
            ].map((item) => (
              <div
                className="rounded-xl bg-surface-dim px-2 py-2.5"
                key={item.label}
              >
                <p className="text-on-surface-variant text-xs">{item.label}</p>
                <p className="mt-0.5 whitespace-nowrap font-semibold text-on-surface text-xs sm:text-sm">
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cảnh báo */}
      {loadError && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-error-500/10 px-4 py-3 text-error-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            Không tải được sổ quỹ, dữ liệu có thể chưa mới nhất.
          </span>
          {onReload && (
            <Button onClick={onReload} size="sm" variant="outline">
              Tải lại
            </Button>
          )}
        </div>
      )}
      {summary.isNegative && (
        <div className="flex items-start gap-2 rounded-xl bg-error-500/10 px-4 py-3 text-error-400 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {FUND_COPY.negativeWarning(
              formatCurrency(shortage),
              formatCurrency(perPersonShortage)
            )}
          </span>
        </div>
      )}
      <div className="flex items-start gap-2 rounded-xl bg-warning-500/10 px-4 py-3 text-sm text-warning-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{FUND_COPY.syncBanner}</span>
      </div>
      {closed && (
        <div className="flex items-start gap-2 rounded-xl bg-surface-dim px-4 py-3 text-on-surface-variant text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{FUND_COPY.closedNote}</span>
        </div>
      )}
      {splitIssues.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-500/10 px-4 py-3 text-sm text-warning-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {splitIssues.length} khoản chi có cách chia chưa chuẩn (
            {splitIssues
              .slice(0, 3)
              .map((x) => x.description || "Chi tiêu")
              .join(", ")}
            {splitIssues.length > 3 ? "..." : ""}). Tripkeo đã tự quy về đúng số
            tiền khi tính; bạn nên mở khoản chi và lưu lại để dữ liệu chuẩn.
          </span>
        </div>
      )}
      {gap !== 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-500/10 px-4 py-3 text-sm text-warning-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Có khoản do người đã bị xóa khỏi danh sách ứng trước (lệch{" "}
            {formatCurrency(Math.abs(gap))}), nên số liệu từng người có thể
            lệch.
          </span>
        </div>
      )}

      {/* Đóng quỹ từng người */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Đóng quỹ</CardTitle>
          {canWrite && (
            <Button
              onClick={() => setTxDraft({ type: "contribution" })}
              size="sm"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ghi nhận
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {ledger.map((m) => (
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-outline-variant p-3"
              key={m.name}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-on-surface text-sm">
                  {m.name}
                </p>
                <p className="text-on-surface-variant text-xs">
                  {formatCurrency(m.contributed)} / {formatCurrency(m.required)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 font-medium text-xs",
                  STATUS_STYLE[m.contributionStatus]
                )}
              >
                {CONTRIBUTION_STATUS_LABEL[m.contributionStatus]}
              </span>
              {canWrite && m.contributed < m.required && (
                <Button
                  onClick={() =>
                    setTxDraft({
                      type: "contribution",
                      member: m.name,
                      amount: m.required - m.contributed,
                    })
                  }
                  size="sm"
                  variant="outline"
                >
                  Ghi nhận
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chi từ quỹ (dùng chung dữ liệu với tab Chi tiêu) */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">
            Chi từ quỹ ({fundExpenses.length})
          </CardTitle>
          {canWrite && (
            <Button
              onClick={() => {
                // Quỹ chưa có ai đóng: báo thay vì mở form chi
                if ((summary?.collected ?? 0) <= 0) {
                  setNoContribWarn(true);
                  return;
                }
                onGoToExpenses(true);
              }}
              size="sm"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm chi từ quỹ
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {fundExpenses.length === 0 ? (
            <p className="py-4 text-center text-on-surface-variant text-sm">
              Chưa có khoản chi nào từ quỹ.
            </p>
          ) : (
            fundExpenses.map((e) => (
              <div className="flex items-center gap-3 py-1" key={e.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-on-surface text-sm">
                    {e.description}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {timestampToDateStr(e.date)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-on-surface text-sm">
                  {formatCurrency(e.amount)}
                </span>
              </div>
            ))
          )}
          <Button
            className="px-0 text-primary-400"
            onClick={() => onGoToExpenses(false)}
            size="sm"
            variant="link"
          >
            Xem tất cả ở tab Chi tiêu
          </Button>
        </CardContent>
      </Card>

      {/* Tất toán */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tất toán với quỹ</CardTitle>
          <p className="text-on-surface-variant text-xs">
            Chênh lệch = đã đóng + đã ứng − phần chịu − đã hoàn.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {settlement.length === 0 ? (
            <p className="py-3 text-center text-on-surface-variant text-sm">
              Không còn khoản nào cần hoàn hoặc thu thêm.
            </p>
          ) : (
            settlement.map((s) => (
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-outline-variant p-3"
                key={`${s.member}-${s.kind}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-on-surface text-sm">
                    {s.member}
                  </p>
                  <p
                    className={cn(
                      "font-semibold text-sm",
                      s.kind === "refund"
                        ? "text-success-500"
                        : "text-error-500"
                    )}
                  >
                    {s.kind === "refund" ? "Được hoàn " : "Cần nộp thêm "}
                    {formatCurrency(s.amount)}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    onClick={() =>
                      setTxDraft(
                        s.kind === "refund"
                          ? {
                              type: "refund",
                              member: s.member,
                              amount: s.amount,
                            }
                          : {
                              type: "contribution",
                              member: s.member,
                              amount: s.amount,
                              note: "Thu thêm khi tất toán",
                            }
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    {s.kind === "refund"
                      ? "Ghi nhận đã hoàn"
                      : "Ghi nhận đã thu"}
                  </Button>
                )}
              </div>
            ))
          )}
          {isOwner && (
            <Button
              className="mt-2 w-full"
              disabled={busy}
              onClick={async () => {
                if (
                  !closed &&
                  settlement.length > 0 &&
                  !window.confirm(FUND_COPY.closeWithPending(settlement.length))
                ) {
                  return;
                }
                setBusy(true);
                try {
                  await (closed ? onReopen() : onClose());
                  toast.success(closed ? "Đã mở lại quỹ" : "Đã đóng quỹ");
                } catch (err) {
                  toast.error(
                    errMessage(err, "Không thể thực hiện. Vui lòng thử lại.")
                  );
                } finally {
                  setBusy(false);
                }
              }}
              variant="outline"
            >
              {closed ? "Mở lại quỹ" : "Đóng quỹ"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lịch sử giao dịch */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.length === 0 ? (
            <p className="py-3 text-center text-on-surface-variant text-sm">
              Chưa có giao dịch nào.
            </p>
          ) : (
            transactions.map((tx) => {
              const voided = !!tx.voidedAt;
              return (
                <div
                  className={cn(
                    "flex items-start gap-3",
                    voided && "opacity-60"
                  )}
                  key={tx.id}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-medium text-on-surface text-sm",
                        voided && "line-through"
                      )}
                    >
                      {FUND_TX_LABEL[tx.type]} · {tx.member}
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      {timestampToDateStr(tx.date)}
                      {tx.method ? ` · ${PAYMENT_METHOD_LABEL[tx.method]}` : ""}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </p>
                    {voided && (
                      <p className="text-error-400 text-xs">
                        Đã hủy{tx.voidReason ? `: ${tx.voidReason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "font-semibold text-sm",
                        tx.type === "contribution"
                          ? "text-success-500"
                          : "text-primary-400",
                        voided && "line-through"
                      )}
                    >
                      {tx.type === "contribution" ? "+" : "−"}
                      {formatCurrency(tx.amount)}
                    </p>
                    {canWrite && !voided && (
                      <button
                        className="text-error-400 text-xs underline"
                        onClick={() => setVoidTarget(tx)}
                        type="button"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {txDraft && (
        <FundTransactionDialog
          costMembers={costMembers}
          fundBalance={summary.balance}
          draft={txDraft}
          onClose={() => setTxDraft(null)}
          onSubmit={onCreateTransaction}
          open
        />
      )}

      {fund && (
        <FundSettingsDialog
          canDisable={
            countFundExpenses(expenses) === 0 &&
            !transactions.some((t) => !t.voidedAt)
          }
          costMembers={costMembers}
          fund={fund}
          key={`${fund.perPerson}-${settingsOpen}`}
          onClose={() => setSettingsOpen(false)}
          onDisable={onDisable}
          onSave={onUpdateRequired}
          open={settingsOpen}
        />
      )}

      <Dialog open={noContribWarn} onOpenChange={setNoContribWarn}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{FUND_COPY.noContributionTitle}</DialogTitle>
            <DialogDescription>
              {FUND_COPY.noContributionBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button onClick={() => setNoContribWarn(false)} variant="outline">
              Đóng
            </Button>
            <Button
              onClick={() => {
                setNoContribWarn(false);
                setTxDraft({ type: "contribution" });
              }}
            >
              Ghi nhận đóng quỹ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!voidTarget}
        onOpenChange={(o) => !o && !busy && setVoidTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hủy giao dịch</DialogTitle>
            <DialogDescription>
              Giao dịch không bị xóa mà được đánh dấu đã hủy để giữ lịch sử, và
              không còn được tính vào quỹ.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Lý do (tùy chọn)</Label>
            <Input
              className="mt-1"
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="VD: nhập nhầm số tiền"
              value={voidReason}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              disabled={busy}
              onClick={() => setVoidTarget(null)}
              variant="outline"
            >
              Không
            </Button>
            <Button disabled={busy} onClick={confirmVoid} variant="destructive">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hủy giao dịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
