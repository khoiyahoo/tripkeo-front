import assert from "node:assert/strict";
import test from "node:test";
import {
  isOwnReceipt,
  isValidTripId,
  newReceiptId,
  receiptFolder,
  signParams,
} from "../api/_lib/cloudinary.ts";

test("chữ ký khớp ví dụ trong tài liệu Cloudinary", () => {
  const sig = signParams(
    {
      eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
      public_id: "sample_image",
      timestamp: "1315060510",
    },
    "abcd"
  );
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("chữ ký không phụ thuộc thứ tự tham số và bỏ giá trị rỗng", () => {
  assert.equal(
    signParams({ b: 2, a: 1, c: "" }, "s"),
    signParams({ a: 1, c: undefined, b: 2 }, "s")
  );
});

test("kiểm tra tripId và quyền xóa ảnh theo thư mục của chuyến", () => {
  assert.ok(isValidTripId("abc123XYZ_-9"));
  assert.ok(!isValidTripId("../x"));
  assert.ok(!isValidTripId("a b c d e f"));
  const id = newReceiptId();
  assert.match(id, /^[0-9a-f]{24}$/);
  assert.ok(isOwnReceipt(`${receiptFolder("trip12345")}/${id}`, "trip12345"));
  assert.ok(!isOwnReceipt(`${receiptFolder("other12345")}/${id}`, "trip12345"));
  assert.ok(!isOwnReceipt(`${receiptFolder("trip12345")}/../x`, "trip12345"));
  assert.ok(!isOwnReceipt(undefined, "trip12345"));
});
