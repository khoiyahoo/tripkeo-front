import { createHash, randomBytes } from "node:crypto";

// Tiện ích ký yêu cầu Cloudinary. Chỉ dùng trong hàm server (có API secret).

/**
 * Chữ ký theo tài liệu Cloudinary: sắp xếp tham số theo tên, nối `k=v` bằng `&`,
 * cộng API secret rồi băm SHA-1. Không đưa `file`, `api_key`, `resource_type`, `cloud_name` vào.
 */
export const signParams = (
  params: Record<string, string | number | boolean | undefined>,
  apiSecret: string
): string => {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
};

export const isValidTripId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(id);

/** Thư mục chứa ảnh bill của một chuyến đi. */
export const receiptFolder = (tripId: string): string =>
  `tripkeo/receipts/${tripId}`;

/** Mã định danh ngẫu nhiên (khó đoán) cho ảnh mới. */
export const newReceiptId = (): string => randomBytes(12).toString("hex");

/** Chỉ cho xóa ảnh nằm trong thư mục bill của đúng chuyến đi. */
export const isOwnReceipt = (publicId: unknown, tripId: string): boolean =>
  typeof publicId === "string" &&
  publicId.startsWith(`${receiptFolder(tripId)}/`) &&
  !publicId.includes("..") &&
  /^[A-Za-z0-9_\-/]+$/.test(publicId);

export const ALLOWED_FORMATS = "jpg,jpeg,png,webp";
