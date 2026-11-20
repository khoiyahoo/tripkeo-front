import assert from "node:assert/strict";
import test from "node:test";
import {
  BILL_SCHEMA,
  extractJson,
  isModelUnavailable,
  modelChain,
} from "../api/_lib/gemini.ts";
import {
  billItemsToNote,
  formatItemAmount,
  normalizeBillResult,
  sumItems,
} from "../src/utils/billResult.ts";

test("chuẩn hóa kết quả AI hợp lệ", () => {
  const b = normalizeBillResult({
    merchant: "QUÁN NƯỚC XANH",
    date: "2026-11-15",
    total: 135000,
    items: [
      { name: "Nước chanh", quantity: 1, amount: 45000 },
      { name: "NƯỚC CAM", quantity: 1, amount: 50000 },
      { name: "Bánh flan", quantity: 2, amount: 40000 },
    ],
  });
  assert.equal(b.merchant, "Quán nước xanh");
  assert.equal(b.date, "2026-11-15");
  assert.equal(b.total, 135000);
  assert.equal(
    billItemsToNote(b.items),
    "Nước chanh - 45k\nNước cam - 50k\nBánh flan x2 - 40k"
  );
  assert.equal(sumItems(b.items), 135000);
  assert.equal(b.category, "food");
});

test("dữ liệu rác không làm văng lỗi và cho giá trị an toàn", () => {
  for (const bad of [
    null,
    undefined,
    "abc",
    42,
    [],
    { items: "x" },
    { items: [null, 1, {}] },
  ]) {
    const b = normalizeBillResult(bad);
    assert.deepEqual(b.items, []);
    assert.equal(b.total, undefined);
    assert.equal(b.date, undefined);
  }
});

test("tiền: chuỗi có dấu, số âm / 0 / quá lớn bị loại, làm tròn", () => {
  const b = normalizeBillResult({
    total: "1.250.000 đ",
    items: [
      { name: "A", quantity: 1, amount: "45.000" },
      { name: "B", quantity: 1, amount: -5 },
      { name: "C", quantity: 1, amount: 0 },
      { name: "D", quantity: 1, amount: 1e12 },
      { name: "E", quantity: 1, amount: 1000.4 },
    ],
  });
  assert.equal(b.total, 1250000);
  assert.deepEqual(
    b.items.map((i) => [i.name, i.amount]),
    [
      ["A", 45000],
      ["E", 1000],
    ]
  );
});

test("ngày không hợp lệ bị bỏ; số lượng ngoài khoảng về 1", () => {
  assert.equal(normalizeBillResult({ date: "2026-02-30" }).date, undefined);
  assert.equal(normalizeBillResult({ date: "15/11/2026" }).date, undefined);
  assert.equal(normalizeBillResult({ date: "1999-01-01" }).date, undefined);
  const b = normalizeBillResult({
    items: [
      { name: "A", quantity: 500, amount: 1000 },
      { name: "B", quantity: 0, amount: 1000 },
    ],
  });
  assert.deepEqual(
    b.items.map((i) => i.qty),
    [1, 1]
  );
});

test("formatItemAmount", () => {
  assert.equal(formatItemAmount(45000), "45k");
  assert.equal(formatItemAmount(45500), "45.500đ");
});

test("extractJson: JSON thường, bọc ```json, rỗng", () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => extractJson(""));
  assert.throws(() => extractJson("không phải json"));
});

test("isModelUnavailable và modelChain", () => {
  assert.ok(isModelUnavailable({ status: 404, message: "x" }));
  assert.ok(
    isModelUnavailable({
      status: 403,
      message: "This model is no longer available to new users",
    })
  );
  assert.ok(!isModelUnavailable({ status: 429, message: "quota" }));
  assert.ok(!isModelUnavailable({ status: 500, message: "boom" }));
  assert.ok(!isModelUnavailable(new Error("network")));
  assert.deepEqual(modelChain(undefined, undefined), [
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash-lite",
  ]);
  assert.deepEqual(modelChain("a", "a"), ["a"]);
});

test("schema yêu cầu đủ trường", () => {
  assert.deepEqual(
    [...BILL_SCHEMA.required],
    ["merchant", "date", "total", "items"]
  );
});
