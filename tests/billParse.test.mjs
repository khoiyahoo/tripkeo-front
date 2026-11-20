import assert from "node:assert/strict";
import test from "node:test";
import {
  billItemsToNote,
  extractAmounts,
  formatItemAmount,
  parseBill,
} from "../src/utils/billParse.ts";

const BILL_VN = `QUÁN NƯỚC XANH
Đ/c: 12 Lê Lợi, Q1
ĐT: 0901234567
HÓA ĐƠN THANH TOÁN
Ngày: 15/11/2026 19:32
Bàn 5
Tên món        SL   Đ.Giá   T.Tiền
Nước chanh     1    45.000  45.000
Nước cam       1    50.000  50.000
Tổng cộng:                  95.000
Tiền khách đưa              100.000
Tiền thối                    5.000`;

test("bill tiếng Việt: tổng, ngày, quán, từng món", () => {
  const b = parseBill(BILL_VN);
  assert.equal(b.total, 95000);
  assert.equal(b.date, "2026-11-15");
  assert.equal(b.merchant, "Quán nước xanh");
  assert.deepEqual(
    b.items.map((i) => [i.name, i.amount, i.qty]),
    [
      ["Nước chanh", 45000, 1],
      ["Nước cam", 50000, 1],
    ]
  );
  assert.equal(billItemsToNote(b.items), "Nước chanh - 45k\nNước cam - 50k");
  assert.ok(b.totalCandidates.length <= 3 && b.totalCandidates[0] === 95000);
  assert.equal(b.category, "food");
});

test("bill dấu phẩy, x2, VAT: lấy TOTAL không lấy Subtotal/VAT", () => {
  const b = parseBill(`HIGHLANDS COFFEE
Receipt #1234
15-11-2026
Latte x2   90,000
Bánh mì   25,000
Subtotal  115,000
VAT 8%     9,200
TOTAL     124,200`);
  assert.equal(b.total, 124200);
  assert.equal(b.date, "2026-11-15");
  assert.equal(b.merchant, "Highlands coffee");
  assert.equal(billItemsToNote(b.items), "Latte x2 - 90k\nBánh mì - 25k");
});

test("ưu tiên 'Tổng thanh toán' hơn 'Tổng cộng'", () => {
  const b = parseBill(`Cửa hàng A
Tổng cộng 200.000
Giảm giá 20.000
Tổng thanh toán 180.000
Tiền mặt 200.000`);
  assert.equal(b.total, 180000);
  assert.ok(b.totalCandidates.includes(200000));
});

test("số tiền nằm ở dòng kế tiếp", () => {
  const b = parseBill(`Quán B
TỔNG CỘNG
95.000đ`);
  assert.equal(b.total, 95000);
});

test("không có từ khóa: gợi ý số lớn nhất, bỏ tiền khách đưa", () => {
  const b = parseBill(`Tiệm C
Trà sữa 35.000
Bánh 20.000
Tiền khách đưa 500.000`);
  assert.deepEqual(b.totalCandidates.slice(0, 2), [35000, 20000]);
});

test("không đọc được số nào", () => {
  const b = parseBill("xin cam on quy khach");
  assert.equal(b.total, undefined);
  assert.deepEqual(b.items, []);
  assert.deepEqual(b.totalCandidates, []);
});

test("extractAmounts: nhiều dạng, bỏ sđt và số nhỏ", () => {
  assert.deepEqual(extractAmounts("1.250.000 đ"), [1250000]);
  assert.deepEqual(extractAmounts("125k"), [125000]);
  assert.deepEqual(extractAmounts("45,000"), [45000]);
  assert.deepEqual(extractAmounts("ĐT 0901234567"), []);
  assert.deepEqual(extractAmounts("Bàn 5  SL 2"), []);
});

test("formatItemAmount", () => {
  assert.equal(formatItemAmount(45000), "45k");
  assert.equal(formatItemAmount(45500), "45.500đ");
  assert.equal(formatItemAmount(1250000), "1250k");
});

test("số lượng đứng riêng sau tên", () => {
  const b = parseBill(`Quán D
Nước cam 2 25.000 50.000
Tổng cộng 50.000`);
  assert.equal(billItemsToNote(b.items), "Nước cam x2 - 50k");
});

test("bỏ qua dòng địa chỉ khi tìm tên quán, vẫn nhận tên có số nếu không còn dòng nào", () => {
  const a = parseBill(`Đức 12 Lễ Lợi Quận L
Tiệm Cà Phê Sáng
Tổng cộng 50.000`);
  assert.equal(a.merchant, "Tiệm Cà Phê Sáng");
  const b = parseBill(`Phở 24
Tổng cộng 50.000`);
  assert.equal(b.merchant, "Phở 24");
});
