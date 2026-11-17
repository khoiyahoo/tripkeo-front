import { useCallback, useEffect, useMemo, useState } from "react";

import { blocking } from "@/lib/blocking";
import {
  closeFund,
  createFundTransaction,
  disableFund,
  enableFund,
  reopenFund,
  subscribeToFundTransactions,
  updateFundPerPerson,
  voidFundTransaction,
} from "@/services/fundService";
import { useAuthStore } from "@/stores/authStore";
import {
  buildFundSettlement,
  computeFundSummary,
  computeMemberLedger,
  fundInvariantGap,
} from "@/utils/fundCalc";

import type {
  CreateFundTransactionInput,
  ExpenseWithId,
  FundTransactionWithId,
  MemberBalance,
  TripWithId,
} from "@/types/firestore";

/**
 * Quỹ chung của một chuyến. Số dư/sổ từng người luôn được TÍNH LẠI từ giao dịch quỹ + chi tiêu
 * (không lưu số dư) nên tab Chi tiêu, Quỹ và Số dư luôn khớp nhau.
 */
export const useFund = (
  tripId: string,
  trip: TripWithId | null | undefined,
  expenses: ExpenseWithId[]
) => {
  const user = useAuthStore((s) => s.user);
  const [transactions, setTransactions] = useState<FundTransactionWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Đổi giá trị để buộc nghe lại (nút "Tải lại")
  const [reloadKey, setReloadKey] = useState(0);

  const fund = trip?.fund;
  const enabled = !!fund?.enabled;
  const closed = !!fund?.closedAt;
  const members = trip?.costMembers ?? [];

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey chủ ý buộc đăng ký nghe lại
  useEffect(() => {
    if (!tripId || !enabled) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    // Khi onSnapshot gặp lỗi (ví dụ thiếu quyền, mất mạng) Firestore ngừng hẳn việc nghe,
    // nên phải tự đăng ký lại; nếu không giao diện sẽ không cập nhật cho tới khi tải lại trang.
    let cancelled = false;
    let attempts = 0;
    let unsubscribe: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      unsubscribe = subscribeToFundTransactions(
        tripId,
        (data) => {
          attempts = 0;
          setTransactions(data);
          setLoadError(null);
          setIsLoading(false);
        },
        (error) => {
          setIsLoading(false);
          setLoadError(error.message || "Không tải được sổ quỹ");
          if (!cancelled && attempts < 5) {
            attempts += 1;
            retryTimer = setTimeout(start, 2000 * attempts);
          }
        }
      );
    };
    start();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribe?.();
    };
  }, [tripId, enabled, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const computed = useMemo(() => {
    if (!fund || !enabled) return null;
    const input = { config: fund, members, transactions, expenses };
    const summary = computeFundSummary(input);
    const ledger = computeMemberLedger(input);
    return {
      summary,
      ledger,
      settlement: buildFundSettlement(ledger),
      gap: fundInvariantGap(summary, ledger),
    };
  }, [fund, enabled, members, transactions, expenses]);

  /** Số dư từng người theo cách của tab Số dư (dương = được hoàn, âm = cần nộp thêm). */
  const balances: MemberBalance[] = useMemo(
    () =>
      (computed?.ledger ?? []).map((m) => ({
        name: m.name,
        totalPaid: m.contributed + m.advanced,
        totalOwed: m.owed,
        net: m.net,
      })),
    [computed]
  );

  const handleCreateTransaction = useCallback(
    (input: CreateFundTransactionInput) => {
      if (!user) throw new Error("Not authenticated");
      return createFundTransaction(tripId, input, user.uid);
    },
    [tripId, user]
  );

  return {
    fund,
    enabled,
    closed,
    transactions,
    isLoading,
    loadError,
    reload,
    summary: computed?.summary ?? null,
    ledger: computed?.ledger ?? [],
    settlement: computed?.settlement ?? [],
    gap: computed?.gap ?? 0,
    balances,
    handleCreateTransaction: blocking(handleCreateTransaction),
    handleVoidTransaction: blocking((id: string, reason: string) =>
      voidFundTransaction(tripId, id, reason)
    ),
    handleEnable: blocking((perPerson: number) =>
      enableFund(tripId, perPerson, trip?.currency ?? "VND")
    ),
    handleDisable: blocking(() => disableFund(tripId)),
    handleUpdateRequired: blocking(
      (perPerson: number, byMember: Record<string, number>) =>
        updateFundPerPerson(tripId, perPerson, byMember)
    ),
    handleClose: blocking(() => closeFund(tripId)),
    handleReopen: blocking(() => reopenFund(tripId)),
  };
};
