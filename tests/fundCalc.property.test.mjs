import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFundSettlement,
  computeFundSummary,
  computeMemberLedger,
  fundInvariantGap,
  previewFundBalance,
} from "../src/utils/fundCalc.ts";

// PRNG có hạt giống cố định để test lặp lại được
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const NAMES = ["An", "Bình", "Chi", "Dũng", "Em", "Phúc"];

/** Sinh một khoản chi có cách chia HỢP LỆ (tổng phần chia đúng bằng số tiền). */
const makeExpense = (rng, members, id) => {
  const amount = int(rng, 1, 5_000) * 1000;
  const k = int(rng, 1, members.length);
  const split = [...members].sort(() => rng() - 0.5).slice(0, k);
  const method = pick(rng, ["equal", "shares", "percentage", "amount"]);
  let splitDetails;
  if (method === "shares") {
    splitDetails = Object.fromEntries(split.map((n) => [n, int(rng, 1, 4)]));
  } else if (method === "percentage") {
    // chia 100% thành k phần nguyên
    const cuts = Array.from({ length: k - 1 }, () => int(rng, 0, 100)).sort(
      (a, b) => a - b
    );
    const parts = [...cuts, 100].map(
      (c, i) => c - (i === 0 ? 0 : (cuts[i - 1] ?? 0))
    );
    splitDetails = Object.fromEntries(split.map((n, i) => [n, parts[i]]));
  } else if (method === "amount") {
    const cuts = Array.from({ length: k - 1 }, () => int(rng, 0, amount)).sort(
      (a, b) => a - b
    );
    const parts = [...cuts, amount].map(
      (c, i) => c - (i === 0 ? 0 : (cuts[i - 1] ?? 0))
    );
    splitDetails = Object.fromEntries(split.map((n, i) => [n, parts[i]]));
  }
  const fromFund = rng() < 0.7;
  return {
    id,
    amount,
    paidBy: fromFund ? "" : pick(rng, members),
    paidFrom: fromFund ? "fund" : "member",
    splitBetween: split,
    splitMethod: method,
    splitDetails,
  };
};

const makeScenario = (seed) => {
  const rng = makeRng(seed);
  const n = int(rng, 2, 6);
  const members = NAMES.slice(0, n);
  const perPerson = int(rng, 1, 5) * 1_000_000;
  const config = { perPerson };
  const transactions = [];
  for (const m of members) {
    if (rng() < 0.9) {
      transactions.push({
        type: "contribution",
        member: m,
        amount: int(rng, 0, perPerson / 1000) * 1000 || 1000,
      });
    }
  }
  const expenses = Array.from({ length: int(rng, 0, 12) }, (_, i) =>
    makeExpense(rng, members, `e${i}`)
  );
  return { rng, members, config, transactions, expenses };
};

const SEEDS = Array.from({ length: 500 }, (_, i) => i + 1);

test("[ngẫu nhiên] tổng chênh lệch cả nhóm luôn bằng số dư quỹ", () => {
  for (const seed of SEEDS) {
    const { members, config, transactions, expenses } = makeScenario(seed);
    const input = { config, members, transactions, expenses };
    const summary = computeFundSummary(input);
    const ledger = computeMemberLedger(input);
    const totalNet = ledger.reduce((s, m) => s + m.net, 0);
    assert.ok(
      Math.abs(summary.balance - totalNet) < 1e-6,
      `seed ${seed}: balance=${summary.balance} totalNet=${totalNet}`
    );
    assert.equal(fundInvariantGap(summary, ledger), 0, `seed ${seed}`);
  }
});

test("[ngẫu nhiên] thực hiện đúng danh sách tất toán thì ai cũng về 0 và quỹ gần 0", () => {
  for (const seed of SEEDS) {
    const { members, config, transactions, expenses } = makeScenario(seed);
    const ledger = computeMemberLedger({
      config,
      members,
      transactions,
      expenses,
    });
    const settlement = buildFundSettlement(ledger);

    // thực hiện từng khoản: hoàn = refund, thu thêm = contribution
    const executed = [
      ...transactions,
      ...settlement.map((s) => ({
        type: s.kind === "refund" ? "refund" : "contribution",
        member: s.member,
        amount: s.amount,
      })),
    ];
    const input = { config, members, transactions: executed, expenses };
    const after = computeMemberLedger(input);
    const summary = computeFundSummary(input);

    for (const m of after) {
      assert.ok(
        Math.abs(m.net) <= 0.5 + 1e-6,
        `seed ${seed}: ${m.name} net=${m.net}`
      );
    }
    // làm tròn từng người nên quỹ chỉ còn lẻ vài đồng (tối đa n/2 đồng)
    assert.ok(
      Math.abs(summary.balance) <= members.length,
      `seed ${seed}: balance=${summary.balance}`
    );
    // chạy lại tất toán thì không còn khoản nào (không bị "nhảy" ±1 đồng mãi)
    assert.deepEqual(
      buildFundSettlement(after),
      [],
      `seed ${seed}: còn ${JSON.stringify(buildFundSettlement(after))}`
    );
  }
});

test("[ngẫu nhiên] số tiền hoàn/thu luôn là số nguyên dương", () => {
  for (const seed of SEEDS) {
    const { members, config, transactions, expenses } = makeScenario(seed);
    const settlement = buildFundSettlement(
      computeMemberLedger({ config, members, transactions, expenses })
    );
    for (const s of settlement) {
      assert.ok(
        Number.isInteger(s.amount) && s.amount > 0,
        `seed ${seed}: ${JSON.stringify(s)}`
      );
    }
  }
});

test("[ngẫu nhiên] hủy giao dịch rồi tính lại bằng với việc chưa từng có giao dịch đó", () => {
  for (const seed of SEEDS.slice(0, 200)) {
    const { members, config, transactions, expenses } = makeScenario(seed);
    if (transactions.length === 0) continue;
    const voided = transactions.map((t, i) =>
      i === 0 ? { ...t, voidedAt: new Date() } : t
    );
    const a = computeFundSummary({
      config,
      members,
      transactions: voided,
      expenses,
    });
    const b = computeFundSummary({
      config,
      members,
      transactions: transactions.slice(1),
      expenses,
    });
    assert.deepEqual(a, b, `seed ${seed}`);
  }
});

test("[ngẫu nhiên] xem trước 'xóa khoản chi' khớp với tính lại thật", () => {
  for (const seed of SEEDS.slice(0, 200)) {
    const { members, config, transactions, expenses } = makeScenario(seed);
    if (expenses.length === 0) continue;
    const target = expenses[seed % expenses.length];
    const preview = previewFundBalance({
      config,
      members,
      transactions,
      expenses,
      change: { type: "remove", id: target.id },
    });
    const real = computeFundSummary({
      config,
      members,
      transactions,
      expenses: expenses.filter((e) => e.id !== target.id),
    });
    assert.equal(preview.after, real.balance, `seed ${seed}`);
    assert.equal(
      preview.before,
      computeFundSummary({ config, members, transactions, expenses }).balance
    );
  }
});

test("[ngẫu nhiên] đổi nguồn chi từ quỹ sang cá nhân: số dư quỹ tăng đúng bằng số tiền khoản đó", () => {
  for (const seed of SEEDS.slice(0, 200)) {
    const { members, config, transactions, expenses } = makeScenario(seed);
    const fundExp = expenses.find((e) => e.paidFrom === "fund");
    if (!fundExp) continue;
    const { before, after } = previewFundBalance({
      config,
      members,
      transactions,
      expenses,
      change: {
        type: "upsert",
        expense: { ...fundExp, paidFrom: "member", paidBy: members[0] },
      },
    });
    assert.equal(after - before, fundExp.amount, `seed ${seed}`);
  }
});

// ─── Trường hợp biên ─────────────────────────────────────────

test("khoản chi từ quỹ không có người nào trong danh sách chia: quỹ bị trừ nhưng nhóm bị lệch (cảnh báo)", () => {
  const members = ["An", "Bình"];
  const input = {
    config: { perPerson: 1_000_000 },
    members,
    transactions: [
      { type: "contribution", member: "An", amount: 1_000_000 },
      { type: "contribution", member: "Bình", amount: 1_000_000 },
    ],
    expenses: [
      {
        id: "x",
        amount: 500_000,
        paidBy: "",
        paidFrom: "fund",
        splitBetween: [],
        splitMethod: "equal",
      },
    ],
  };
  const summary = computeFundSummary(input);
  const ledger = computeMemberLedger(input);
  assert.equal(summary.balance, 1_500_000);
  // không ai chịu khoản này -> tự chia đều cho cả nhóm, số liệu vẫn khớp
  assert.equal(fundInvariantGap(summary, ledger), 0);
  assert.equal(ledger[0].owed, 250_000);
});

test("chia theo % không đủ 100%: số liệu lệch và bị phát hiện bởi fundInvariantGap", () => {
  const members = ["An", "Bình"];
  const input = {
    config: { perPerson: 1_000_000 },
    members,
    transactions: [
      { type: "contribution", member: "An", amount: 1_000_000 },
      { type: "contribution", member: "Bình", amount: 1_000_000 },
    ],
    expenses: [
      {
        id: "p",
        amount: 1_000_000,
        paidBy: "",
        paidFrom: "fund",
        splitBetween: members,
        splitMethod: "percentage",
        splitDetails: { An: 30, Bình: 30 },
      },
    ],
  };
  const gap = fundInvariantGap(
    computeFundSummary(input),
    computeMemberLedger(input)
  );
  // 30/30 được chuẩn hóa thành 50/50 nên vẫn khớp
  assert.equal(gap, 0);
});

test("khoản chi chia cho người không còn trong danh sách thành viên bị bỏ qua và gây lệch (không văng lỗi)", () => {
  const members = ["An"];
  const input = {
    config: { perPerson: 1_000_000 },
    members,
    transactions: [{ type: "contribution", member: "An", amount: 1_000_000 }],
    expenses: [
      {
        id: "g",
        amount: 300_000,
        paidBy: "",
        paidFrom: "fund",
        splitBetween: ["An", "Người đã xóa"],
        splitMethod: "equal",
      },
    ],
  };
  const summary = computeFundSummary(input);
  const ledger = computeMemberLedger(input);
  assert.equal(summary.balance, 700_000);
  // phần của người đã xóa được chia lại cho người còn lại
  assert.equal(ledger[0].owed, 300_000);
  assert.equal(fundInvariantGap(summary, ledger), 0);
});

test("người ứng tiền không còn trong danh sách thành viên: khoản ứng không được ghi nhận cho ai", () => {
  const members = ["An"];
  const input = {
    config: { perPerson: 1_000_000 },
    members,
    transactions: [],
    expenses: [
      {
        id: "a",
        amount: 100_000,
        paidBy: "Người đã xóa",
        paidFrom: "member",
        splitBetween: ["An"],
        splitMethod: "equal",
      },
    ],
  };
  assert.equal(computeMemberLedger(input)[0].advanced, 0);
});

test("danh sách thành viên rỗng và mức đóng bằng 0 không gây chia cho 0 / NaN", () => {
  const empty = computeFundSummary({
    config: { perPerson: 0 },
    members: [],
    transactions: [],
    expenses: [],
  });
  assert.equal(empty.target, 0);
  assert.equal(empty.collectedPercent, 0);
  assert.ok(Number.isFinite(empty.balance));
  const zero = computeMemberLedger({
    config: { perPerson: 0 },
    members: ["An"],
    transactions: [],
    expenses: [],
  });
  assert.equal(zero[0].contributionStatus, "paid");
  assert.equal(zero[0].net, 0);
});

test("đóng dư mức yêu cầu: tiến độ chặn ở 100% và trạng thái 'nộp dư'", () => {
  const members = ["An"];
  const input = {
    config: { perPerson: 1_000_000 },
    members,
    transactions: [{ type: "contribution", member: "An", amount: 1_500_000 }],
    expenses: [],
  };
  assert.equal(computeFundSummary(input).collectedPercent, 100);
  assert.equal(computeMemberLedger(input)[0].contributionStatus, "over");
});

test("hoàn tiền nhiều hơn số đã có làm số dư quỹ âm (chặn ở giao diện, không ở hàm tính)", () => {
  const input = {
    config: { perPerson: 1_000_000 },
    members: ["An"],
    transactions: [
      { type: "contribution", member: "An", amount: 1_000_000 },
      { type: "refund", member: "An", amount: 1_500_000 },
    ],
    expenses: [],
  };
  assert.equal(computeFundSummary(input).balance, -500_000);
});

test("getOwedPerPerson luôn có tổng bằng số tiền chi", async () => {
  const { getOwedPerPerson, getSplitIssues } = await import(
    "../src/utils/splitCalc.ts"
  );
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const m = ["A", "B", "C"];
  assert.equal(
    Math.round(
      sum(getOwedPerPerson(900, m, "percentage", { A: 10, B: 10, C: 10 }, m))
    ),
    900
  );
  assert.equal(
    Math.round(
      sum(getOwedPerPerson(900, m, "amount", { A: 100, B: 100, C: 100 }, m))
    ),
    900
  );
  assert.equal(
    Math.round(sum(getOwedPerPerson(900, m, "percentage", {}, m))),
    900
  );
  assert.deepEqual(
    getOwedPerPerson(900, m, "amount", { A: 300, B: 300, C: 300 }, m),
    { A: 300, B: 300, C: 300 }
  );
  assert.equal(
    Math.round(
      sum(getOwedPerPerson(900, ["A", "X"], "shares", { A: 1, X: 2 }, m))
    ),
    900
  );
  assert.deepEqual(
    getSplitIssues(900, m, "percentage", { A: 10, B: 10, C: 10 }, m),
    ["percentage_sum"]
  );
  assert.deepEqual(getSplitIssues(900, ["A", "X"], "equal", undefined, m), [
    "unknown_members",
  ]);
  assert.deepEqual(
    getSplitIssues(900, m, "percentage", { A: 50, B: 30, C: 20 }, m),
    []
  );
});
