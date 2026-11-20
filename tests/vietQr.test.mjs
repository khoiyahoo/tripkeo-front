import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPayUrl,
  crc16,
  guessCategory,
  parsePaymentQr,
  sanitizeMemo,
} from "../src/utils/vietQr.ts";

const tlv = (tag, value) =>
  `${tag}${String(value.length).padStart(2, "0")}${value}`;
const build = ({
  dynamic = true,
  amount,
  name = "QUAN CA PHE",
  memo,
  bin = "970436",
  acc = "0011001234567",
} = {}) => {
  const bank = tlv("00", bin) + tlv("01", acc);
  const merchant =
    tlv("00", "A000000727") + tlv("01", bank) + tlv("02", "QRIBFTTA");
  let body =
    tlv("00", "01") +
    tlv("01", dynamic ? "12" : "11") +
    tlv("38", merchant) +
    tlv("53", "704");
  if (amount) body += tlv("54", String(amount));
  body += tlv("58", "VN") + tlv("59", name) + tlv("60", "HA NOI");
  if (memo) body += tlv("62", tlv("08", memo));
  body += "6304";
  return body + crc16(body);
};

test("crc16 khớp vector chuẩn CRC-16/CCITT-FALSE", () => {
  assert.equal(crc16("123456789"), "29B1");
});

test("đọc QR động có số tiền, tên quán, nội dung, ngân hàng", () => {
  const r = parsePaymentQr(build({ amount: 10000, memo: "ly nuoc" }));
  assert.ok(r.ok);
  assert.equal(r.data.amount, 10000);
  assert.equal(r.data.merchantName, "QUAN CA PHE");
  assert.equal(r.data.memo, "ly nuoc");
  assert.equal(r.data.bankBin, "970436");
  assert.equal(r.data.bankName, "Vietcombank");
  assert.equal(r.data.accountNumber, "0011001234567");
  assert.equal(r.data.isDynamic, true);
});

test("QR tĩnh không có số tiền: amount undefined", () => {
  const r = parsePaymentQr(build({ dynamic: false }));
  assert.ok(r.ok);
  assert.equal(r.data.amount, undefined);
  assert.equal(r.data.isDynamic, false);
});

test("từ chối QR sai CRC, không phải EMV, thiếu tài khoản", () => {
  const good = build({ amount: 1000 });
  const bad = good.slice(0, -4) + (good.endsWith("0000") ? "1111" : "0000");
  assert.deepEqual(parsePaymentQr(bad), { ok: false, reason: "bad_crc" });
  assert.deepEqual(parsePaymentQr("https://example.com"), {
    ok: false,
    reason: "not_emv",
  });
  const noAcc = "00020101021253037045802VN6304";
  assert.deepEqual(parsePaymentQr(noAcc + crc16(noAcc)), {
    ok: false,
    reason: "no_account",
  });
});

test("chuỗi hỏng/cắt cụt không gây lỗi", () => {
  for (const s of ["", "000201", "0002010102", "00020199999"]) {
    assert.equal(parsePaymentQr(s).ok, false);
  }
});

test("sanitizeMemo bỏ dấu, ký tự lạ và cắt 50 ký tự", () => {
  assert.equal(sanitizeMemo("Cà phê – Đường số 1!"), "Ca phe Duong so 1");
  assert.equal(sanitizeMemo("a".repeat(80)).length, 50);
});

test("buildPayUrl: đúng tham số, thiếu thông tin thì null", () => {
  const url = buildPayUrl({
    appId: "mb",
    bankBin: "970436",
    accountNumber: "0011001234567",
    amount: 10000,
    memo: "Cà phê",
    accountName: "QUAN A",
    returnUrl: "https://tripkeo.app/x?y=1",
  });
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://dl.vietqr.io/pay");
  assert.equal(u.searchParams.get("app"), "mb");
  assert.equal(u.searchParams.get("ba"), "0011001234567@vcb");
  assert.equal(u.searchParams.get("am"), "10000");
  assert.equal(u.searchParams.get("tn"), "Ca phe");
  assert.equal(u.searchParams.get("bn"), "QUAN A");
  assert.equal(u.searchParams.get("url"), "https://tripkeo.app/x?y=1");
  assert.equal(
    buildPayUrl({
      appId: "mb",
      bankBin: "000000",
      accountNumber: "1",
      amount: 1,
      memo: "",
      returnUrl: "https://a.b",
    }),
    null
  );
  assert.equal(
    buildPayUrl({
      appId: "mb",
      bankBin: "970436",
      accountNumber: "1",
      amount: 0,
      memo: "",
      returnUrl: "https://a.b",
    }),
    null
  );
});

test("gợi ý nhóm chi tiêu", () => {
  assert.equal(guessCategory("Quán Cà Phê Muối"), "food");
  assert.equal(guessCategory("Grab Bike"), "transport");
  assert.equal(guessCategory("Khách sạn Mường Thanh"), "stay");
  assert.equal(guessCategory("xyz"), "other");
});
