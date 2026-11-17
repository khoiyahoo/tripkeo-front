/**
 * Tính toán Quỹ chung — hàm thuần, KHÔNG phụ thuộc Firebase/React để test bằng `node --test`
 * và có thể sao chép nguyên văn sang app (mobile).
 *
 * Nguồn dữ liệu duy nhất: giao dịch quỹ (contribution/refund) + danh sách chi tiêu.
 * Số dư KHÔNG được lưu, luôn tính lại từ hai nguồn này nên web/app không bao giờ lệch nhau.
 */

import type { SplitIssueCode } from "./splitCalc.ts";
import { getOwedPerPerson, getSplitIssues } from "./splitCalc.ts";

type SplitMethodLike = "equal" | "percentage" | "amount" | "shares";

export interface FundConfigLike {
  perPerson: number;
  requiredByMember?: Record<string, number>;
}

export interface FundTransactionLike {
  type: "contribution" | "refund";
  member: string;
  amount: number;
  /** Có giá trị (khác null/undefined) = đã hủy, không tính */
  voidedAt?: unknown;
}

export interface FundExpenseLike {
  id?: string;
  amount: number;
  paidBy: string;
  paidFrom?: "fund" | "member";
  splitBetween: string[];
  splitMethod?: SplitMethodLike;
  splitDetails?: Record<string, number>;
}

export interface FundSummary {
  /** Tổng phải thu = Σ mức đóng của từng thành viên */
  target: number;
  collected: number;
  /** Còn thiếu so với mục tiêu (không âm) */
  remainingToCollect: number;
  spentFromFund: number;
  refunded: number;
  /** Số dư quỹ = đã thu − đã chi từ quỹ − đã hoàn. Âm = quỹ đang thiếu tiền */
  balance: number;
  isNegative: boolean;
  /** 0..100 */
  collectedPercent: number;
}

export type ContributionStatus = "unpaid" | "partial" | "paid" | "over";

export interface MemberFundLedger {
  name: string;
  required: number;
  contributed: number;
  contributionStatus: ContributionStatus;
  /** Tổng khoản người này đã ứng trước bằng tiền cá nhân (paidFrom != fund) */
  advanced: number;
  /** Tổng phần chịu chi phí (cả chi từ quỹ lẫn chi cá nhân ứng) */
  owed: number;
  refunded: number;
  /**
   * Chênh lệch = đã đóng + đã ứng − phần chịu − đã hoàn.
   * Dương = quỹ còn nợ người này (được hoàn). Âm = người này cần nộp thêm.
   */
  net: number;
}

export interface FundSettlementItem {
  member: string;
  /** refund: quỹ hoàn lại cho thành viên; collect: thu thêm từ thành viên */
  kind: "refund" | "collect";
  amount: number;
}

const isActive = (tx: FundTransactionLike): boolean =>
  tx.voidedAt === undefined || tx.voidedAt === null;

const isFundExpense = (e: FundExpenseLike): boolean => e.paidFrom === "fund";

/** Mức đóng của một thành viên (ưu tiên mức riêng). */
export const getRequiredAmount = (
  config: FundConfigLike,
  member: string
): number => config.requiredByMember?.[member] ?? config.perPerson;

/** Chia số nguyên đều cho n phần, phần lẻ dồn cho các phần đầu. */
export const splitEvenly = (total: number, parts: number): number[] => {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from(
    { length: parts },
    (_, i) => base + (i < remainder ? 1 : 0)
  );
};

export const computeFundSummary = (input: {
  config: FundConfigLike;
  members: string[];
  transactions: FundTransactionLike[];
  expenses: FundExpenseLike[];
}): FundSummary => {
  const { config, members, transactions, expenses } = input;

  const target = members.reduce(
    (sum, name) => sum + getRequiredAmount(config, name),
    0
  );
  let collected = 0;
  let refunded = 0;
  for (const tx of transactions) {
    if (!isActive(tx)) continue;
    if (tx.type === "contribution") collected += tx.amount;
    else refunded += tx.amount;
  }
  const spentFromFund = expenses
    .filter(isFundExpense)
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = collected - spentFromFund - refunded;
  return {
    target,
    collected,
    remainingToCollect: Math.max(0, target - collected),
    spentFromFund,
    refunded,
    balance,
    isNegative: balance < 0,
    collectedPercent:
      target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0,
  };
};

const contributionStatus = (
  required: number,
  contributed: number
): ContributionStatus => {
  if (contributed <= 0) return required > 0 ? "unpaid" : "paid";
  if (contributed < required) return "partial";
  if (contributed > required) return "over";
  return "paid";
};

/** Sổ quỹ từng người, theo thứ tự `members`. */
export const computeMemberLedger = (input: {
  config: FundConfigLike;
  members: string[];
  transactions: FundTransactionLike[];
  expenses: FundExpenseLike[];
}): MemberFundLedger[] => {
  const { config, members, transactions, expenses } = input;

  const contributed: Record<string, number> = {};
  const refunded: Record<string, number> = {};
  const advanced: Record<string, number> = {};
  const owed: Record<string, number> = {};
  for (const name of members) {
    contributed[name] = 0;
    refunded[name] = 0;
    advanced[name] = 0;
    owed[name] = 0;
  }

  for (const tx of transactions) {
    if (!isActive(tx)) continue;
    if (tx.type === "contribution" && tx.member in contributed) {
      contributed[tx.member] += tx.amount;
    } else if (tx.type === "refund" && tx.member in refunded) {
      refunded[tx.member] += tx.amount;
    }
  }

  for (const e of expenses) {
    if (!isFundExpense(e) && e.paidBy in advanced) {
      advanced[e.paidBy] += e.amount;
    }
    const shares = getOwedPerPerson(
      e.amount,
      e.splitBetween ?? [],
      e.splitMethod ?? "equal",
      e.splitDetails,
      members
    );
    for (const [name, share] of Object.entries(shares)) {
      if (name in owed) owed[name] += share;
    }
  }

  return members.map((name) => {
    const required = getRequiredAmount(config, name);
    return {
      name,
      required,
      contributed: contributed[name],
      contributionStatus: contributionStatus(required, contributed[name]),
      advanced: advanced[name],
      owed: owed[name],
      refunded: refunded[name],
      net: contributed[name] + advanced[name] - owed[name] - refunded[name],
    };
  });
};

/**
 * Kiểm tra tính đúng: tổng chênh lệch của cả nhóm phải bằng số dư quỹ.
 * Trả về độ lệch (0 = khớp). Lệch xảy ra khi tổng phần chia của một khoản chi
 * không bằng số tiền (ví dụ chia theo % không đủ 100%).
 */
export const fundInvariantGap = (
  summary: FundSummary,
  ledger: MemberFundLedger[]
): number => {
  const totalNet = ledger.reduce((sum, m) => sum + m.net, 0);
  // `|| 0` để tránh trả về -0
  return Math.round(summary.balance - totalNet) || 0;
};

/** Danh sách tất toán: ai được hoàn, ai cần nộp thêm (làm tròn VND, bỏ chênh lệch < 1đ). */
export const buildFundSettlement = (
  ledger: MemberFundLedger[]
): FundSettlementItem[] =>
  ledger
    .map((m) => ({ member: m.name, rounded: Math.round(m.net) }))
    .filter((m) => m.rounded !== 0)
    .map((m) => ({
      member: m.member,
      kind: m.rounded > 0 ? ("refund" as const) : ("collect" as const),
      amount: Math.abs(m.rounded),
    }));

export type ExpenseChange =
  | { type: "upsert"; expense: FundExpenseLike }
  | { type: "remove"; id: string };

/** Áp một thay đổi chi tiêu giả định (chưa ghi) lên danh sách. Dùng cho hộp xác nhận "trước → sau". */
export const applyExpenseChange = (
  expenses: FundExpenseLike[],
  change: ExpenseChange
): FundExpenseLike[] => {
  if (change.type === "remove") {
    return expenses.filter((e) => e.id !== change.id);
  }
  const { expense } = change;
  const exists =
    expense.id !== undefined && expenses.some((e) => e.id === expense.id);
  return exists
    ? expenses.map((e) => (e.id === expense.id ? expense : e))
    : [...expenses, expense];
};

/** Số dư quỹ trước và sau một thay đổi chi tiêu giả định. */
export const previewFundBalance = (input: {
  config: FundConfigLike;
  members: string[];
  transactions: FundTransactionLike[];
  expenses: FundExpenseLike[];
  change: ExpenseChange;
}): { before: number; after: number } => {
  const base = computeFundSummary(input);
  const after = computeFundSummary({
    ...input,
    expenses: applyExpenseChange(input.expenses, input.change),
  });
  return { before: base.balance, after: after.balance };
};

/** Còn khoản chi nào đang trừ vào quỹ không? (chặn tắt quỹ khi còn) */
export const countFundExpenses = (expenses: FundExpenseLike[]): number =>
  expenses.filter(isFundExpense).length;

export type ExpenseSplitIssue = {
  id?: string;
  description?: string;
  issues: SplitIssueCode[];
};

/** Các khoản chi có dữ liệu chia chưa chuẩn (app đã tự chuẩn hóa khi tính). */
export const findExpensesWithSplitIssues = (
  expenses: (FundExpenseLike & { description?: string })[],
  members: string[]
): ExpenseSplitIssue[] =>
  expenses
    .map((e) => ({
      id: e.id,
      description: e.description,
      issues: getSplitIssues(
        e.amount,
        e.splitBetween ?? [],
        e.splitMethod ?? "equal",
        e.splitDetails,
        members
      ),
    }))
    .filter((x) => x.issues.length > 0);
