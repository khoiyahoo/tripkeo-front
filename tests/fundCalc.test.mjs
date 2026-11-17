import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFundSettlement,
  computeFundSummary,
  computeMemberLedger,
  countFundExpenses,
  fundInvariantGap,
  getRequiredAmount,
  previewFundBalance,
  splitEvenly,
} from "../src/utils/fundCalc.ts";
import { getOwedPerPerson } from "../src/utils/splitCalc.ts";

const MEMBERS = ["An", "Bình", "Chi"];
const config = { perPerson: 3_000_000 };
const contributions = MEMBERS.map((member) => ({
  type: "contribution",
  member,
  amount: 3_000_000,
}));
const fundExpense = (id, amount, extra = {}) => ({
  id,
  amount,
  paidBy: "",
  paidFrom: "fund",
  splitBetween: MEMBERS,
  splitMethod: "equal",
  ...extra,
});
const calc = (expenses, transactions = contributions, cfg = config) => {
  const input = { config: cfg, members: MEMBERS, transactions, expenses };
  const summary = computeFundSummary(input);
  const ledger = computeMemberLedger(input);
  return { summary, ledger };
};

test("ví dụ yêu cầu: 3 người x 3.000.000 = quỹ 9.000.000", () => {
  const { summary } = calc([]);
  assert.equal(summary.target, 9_000_000);
  assert.equal(summary.collected, 9_000_000);
  assert.equal(summary.balance, 9_000_000);
  assert.equal(summary.remainingToCollect, 0);
  assert.equal(summary.collectedPercent, 100);
  assert.equal(summary.isNegative, false);
});

test("chi 8.400.000: còn dư 600.000, mỗi người được hoàn 200.000", () => {
  const { summary, ledger } = calc([fundExpense("e1", 8_400_000)]);
  assert.equal(summary.balance, 600_000);
  assert.deepEqual(
    ledger.map((m) => m.net),
    [200_000, 200_000, 200_000]
  );
  assert.deepEqual(buildFundSettlement(ledger), [
    { member: "An", kind: "refund", amount: 200_000 },
    { member: "Bình", kind: "refund", amount: 200_000 },
    { member: "Chi", kind: "refund", amount: 200_000 },
  ]);
  assert.equal(fundInvariantGap(summary, ledger), 0);
});

test("chi 9.600.000: quỹ âm 600.000, mỗi người cần nộp thêm 200.000", () => {
  const { summary, ledger } = calc([fundExpense("e1", 9_600_000)]);
  assert.equal(summary.balance, -600_000);
  assert.equal(summary.isNegative, true);
  assert.deepEqual(
    ledger.map((m) => m.net),
    [-200_000, -200_000, -200_000]
  );
  assert.ok(
    buildFundSettlement(ledger).every(
      (s) => s.kind === "collect" && s.amount === 200_000
    )
  );
  assert.equal(fundInvariantGap(summary, ledger), 0);
});

test("chia không đều (theo số tiền): chênh lệch từng người đúng phần chịu thực tế", () => {
  const expense = fundExpense("e1", 9_000_000, {
    splitMethod: "amount",
    splitDetails: { An: 5_000_000, Bình: 3_000_000, Chi: 1_000_000 },
  });
  const { summary, ledger } = calc([expense]);
  assert.equal(summary.balance, 0);
  assert.deepEqual(
    ledger.map((m) => m.net),
    [-2_000_000, 0, 2_000_000]
  );
  assert.deepEqual(buildFundSettlement(ledger), [
    { member: "An", kind: "collect", amount: 2_000_000 },
    { member: "Chi", kind: "refund", amount: 2_000_000 },
  ]);
  assert.equal(fundInvariantGap(summary, ledger), 0);
});

test("ứng tiền cá nhân cùng quỹ: người ứng được hoàn nhiều hơn, tổng vẫn khớp số dư quỹ", () => {
  const advance = {
    id: "adv",
    amount: 1_200_000,
    paidBy: "An",
    paidFrom: "member",
    splitBetween: MEMBERS,
    splitMethod: "equal",
  };
  const { summary, ledger } = calc([fundExpense("f", 6_000_000), advance]);
  assert.equal(summary.balance, 3_000_000);
  const byName = Object.fromEntries(ledger.map((m) => [m.name, m]));
  assert.equal(byName.An.advanced, 1_200_000);
  assert.equal(byName.An.net, 1_800_000); // 3.0 + 1.2 - 2.4
  assert.equal(byName["Bình"].net, 600_000); // 3.0 - 2.4
  assert.equal(fundInvariantGap(summary, ledger), 0);
});

test("khoản chi không ghi paidFrom coi là người ứng (tương thích dữ liệu cũ)", () => {
  const legacy = {
    id: "old",
    amount: 900_000,
    paidBy: "Bình",
    splitBetween: MEMBERS,
    splitMethod: "equal",
  };
  const { summary, ledger } = calc([legacy], []);
  assert.equal(summary.spentFromFund, 0);
  assert.equal(ledger.find((m) => m.name === "Bình").advanced, 900_000);
});

test("giao dịch đã hủy không tính; hoàn tiền làm giảm số dư và chênh lệch", () => {
  const txs = [
    ...contributions,
    {
      type: "contribution",
      member: "An",
      amount: 500_000,
      voidedAt: new Date(),
    },
    { type: "refund", member: "An", amount: 200_000 },
  ];
  const { summary, ledger } = calc([fundExpense("e1", 8_400_000)], txs);
  assert.equal(summary.collected, 9_000_000);
  assert.equal(summary.refunded, 200_000);
  assert.equal(summary.balance, 400_000);
  assert.equal(ledger.find((m) => m.name === "An").net, 0);
});

test("mức đóng riêng từng người và trạng thái nộp", () => {
  const cfg = { perPerson: 3_000_000, requiredByMember: { Chi: 1_500_000 } };
  assert.equal(getRequiredAmount(cfg, "Chi"), 1_500_000);
  assert.equal(getRequiredAmount(cfg, "An"), 3_000_000);
  const txs = [
    { type: "contribution", member: "An", amount: 1_000_000 },
    { type: "contribution", member: "Bình", amount: 3_000_000 },
    { type: "contribution", member: "Chi", amount: 2_000_000 },
  ];
  const { summary, ledger } = calc([], txs, cfg);
  assert.equal(summary.target, 7_500_000);
  assert.equal(summary.remainingToCollect, 1_500_000);
  assert.deepEqual(
    ledger.map((m) => m.contributionStatus),
    ["partial", "paid", "over"]
  );
  assert.equal(calc([], [], cfg).ledger[0].contributionStatus, "unpaid");
});

test("xem trước số dư quỹ trước/sau khi sửa, xóa hoặc thêm khoản chi", () => {
  const expenses = [fundExpense("e1", 8_400_000)];
  const base = {
    config,
    members: MEMBERS,
    transactions: contributions,
    expenses,
  };
  assert.deepEqual(
    previewFundBalance({ ...base, change: { type: "remove", id: "e1" } }),
    { before: 600_000, after: 9_000_000 }
  );
  assert.deepEqual(
    previewFundBalance({
      ...base,
      change: { type: "upsert", expense: fundExpense("e1", 9_200_000) },
    }),
    { before: 600_000, after: -200_000 }
  );
  assert.deepEqual(
    previewFundBalance({
      ...base,
      change: { type: "upsert", expense: fundExpense("new", 100_000) },
    }),
    { before: 600_000, after: 500_000 }
  );
  // đổi nguồn chi từ quỹ sang cá nhân ứng: quỹ không còn bị trừ
  assert.equal(
    previewFundBalance({
      ...base,
      change: {
        type: "upsert",
        expense: {
          ...fundExpense("e1", 8_400_000),
          paidFrom: "member",
          paidBy: "An",
        },
      },
    }).after,
    9_000_000
  );
});

test("chặn tắt quỹ khi còn khoản chi từ quỹ", () => {
  assert.equal(
    countFundExpenses([
      fundExpense("a", 1),
      { amount: 1, paidBy: "An", splitBetween: [] },
    ]),
    1
  );
  assert.equal(countFundExpenses([]), 0);
});

test("chia đều số nguyên, phần lẻ dồn cho các phần đầu", () => {
  assert.deepEqual(splitEvenly(1000, 3), [334, 333, 333]);
  assert.deepEqual(splitEvenly(900, 3), [300, 300, 300]);
  assert.deepEqual(splitEvenly(5, 0), []);
  assert.equal(
    splitEvenly(1_000_001, 7).reduce((a, b) => a + b, 0),
    1_000_001
  );
});

test("getOwedPerPerson (tách sang splitCalc) vẫn đúng cho cả 4 cách chia", () => {
  assert.deepEqual(getOwedPerPerson(900, ["a", "b", "c"], "equal"), {
    a: 300,
    b: 300,
    c: 300,
  });
  assert.deepEqual(
    getOwedPerPerson(1000, ["a", "b"], "percentage", { a: 70, b: 30 }),
    { a: 700, b: 300 }
  );
  assert.deepEqual(
    getOwedPerPerson(1000, ["a", "b"], "amount", { a: 400, b: 600 }),
    { a: 400, b: 600 }
  );
  assert.deepEqual(
    getOwedPerPerson(900, ["a", "b"], "shares", { a: 1, b: 2 }),
    { a: 300, b: 600 }
  );
});

test("quỹ không dùng: chuyến chỉ có chi cá nhân cho số dư quỹ bằng 0", () => {
  const { summary } = calc(
    [
      {
        id: "x",
        amount: 100,
        paidBy: "An",
        splitBetween: MEMBERS,
        splitMethod: "equal",
      },
    ],
    []
  );
  assert.equal(summary.balance, 0);
  assert.equal(summary.collected, 0);
});
