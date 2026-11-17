import assert from "node:assert/strict";
import test from "node:test";
import { getOwedPerPerson, getSplitIssues } from "../src/utils/splitCalc.ts";

let seed = 12345;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const NAMES = ["A", "B", "C", "D", "E"];
const METHODS = ["equal", "percentage", "amount", "shares"];

test("1000 khoản chi ngẫu nhiên (kể cả dữ liệu sai): tổng phần chia = số tiền, không âm, chỉ cho thành viên hợp lệ", () => {
  for (let i = 0; i < 1000; i++) {
    const members = NAMES.slice(0, 1 + Math.floor(rnd() * 5));
    const pool = [...members, "X", "Y"];
    const between = pool.filter(() => rnd() < 0.6);
    const method = pick(METHODS);
    const details = {};
    for (const u of pool) if (rnd() < 0.8) details[u] = Math.floor(rnd() * 120);
    const amount = Math.floor(rnd() * 5_000_000) + 1;
    const r = getOwedPerPerson(amount, between, method, details, members);
    assert.ok(
      Math.abs(sum(r) - amount) < 1e-6,
      `i=${i} ${method} sum=${sum(r)} amount=${amount}`
    );
    for (const [u, v] of Object.entries(r)) {
      assert.ok(members.includes(u), `người lạ ${u}`);
      assert.ok(v >= 0 && Number.isFinite(v));
    }
  }
});

test("dữ liệu hợp lệ không bị biến đổi và không có cảnh báo", () => {
  const m = ["A", "B", "C"];
  assert.deepEqual(
    getOwedPerPerson(1000, m, "amount", { A: 500, B: 300, C: 200 }, m),
    { A: 500, B: 300, C: 200 }
  );
  assert.deepEqual(
    getOwedPerPerson(1000, m, "percentage", { A: 50, B: 30, C: 20 }, m),
    { A: 500, B: 300, C: 200 }
  );
  assert.deepEqual(
    getOwedPerPerson(900, m, "shares", { A: 1, B: 2, C: 3 }, m),
    { A: 150, B: 300, C: 450 }
  );
  assert.deepEqual(
    getSplitIssues(1000, m, "amount", { A: 500, B: 300, C: 200 }, m),
    []
  );
});

test("không truyền validMembers: hành vi như cũ cho dữ liệu đúng", () => {
  assert.deepEqual(getOwedPerPerson(100, ["A", "B"], "equal"), {
    A: 50,
    B: 50,
  });
  assert.deepEqual(getOwedPerPerson(100, [], "equal"), {});
});

test("chênh lệch ròng của cả nhóm = 0 khi mọi khoản do thành viên trả", () => {
  for (let i = 0; i < 300; i++) {
    const members = NAMES.slice(0, 2 + Math.floor(rnd() * 4));
    const net = Object.fromEntries(members.map((m) => [m, 0]));
    for (let k = 0; k < 6; k++) {
      const amount = Math.floor(rnd() * 3_000_000) + 1;
      const payer = pick(members);
      net[payer] += amount;
      const method = pick(METHODS);
      const details = Object.fromEntries(
        members.map((u) => [u, Math.floor(rnd() * 100)])
      );
      const owed = getOwedPerPerson(
        amount,
        members.filter(() => rnd() < 0.7),
        method,
        details,
        members
      );
      for (const [u, v] of Object.entries(owed)) net[u] -= v;
    }
    assert.ok(Math.abs(sum(net)) < 1e-4, `i=${i} sum=${sum(net)}`);
  }
});
