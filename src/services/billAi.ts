import { auth } from "@/lib/firebase";
import { type BillResult, normalizeBillResult } from "@/utils/billResult";

// Đọc bill bằng AI (Gemini) qua hàm server /api/read-bill. Khóa API chỉ nằm ở server.

const MAX_SIDE = 1600;

const loadBitmap = async (
  file: File
): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === "function") {
    try {
      // Xoay đúng chiều theo thông tin EXIF của ảnh chụp từ điện thoại
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // thử cách dự phòng bên dưới
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Không đọc được ảnh này."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Thu nhỏ và nén ảnh (JPEG) để nhẹ và nhanh: trả về ảnh và chuỗi base64 để gửi cho AI. */
export const prepareBillImage = async (
  file: File
): Promise<{ blob: Blob; base64: string }> => {
  const bmp = await loadBitmap(file);
  const srcW = "naturalWidth" in bmp ? bmp.naturalWidth : bmp.width;
  const srcH = "naturalHeight" in bmp ? bmp.naturalHeight : bmp.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  if ("close" in bmp) bmp.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Không nén được ảnh."))),
      "image/jpeg",
      0.8
    )
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { blob, base64: btoa(binary) };
};

const explain = (status: number): string => {
  if (status === 401) return "Phiên đăng nhập hết hạn. Hãy đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền đọc bill cho chuyến đi này.";
  if (status === 404)
    return "Máy chủ đọc bill chưa chạy. Khi dev cục bộ hãy dùng `vercel dev`.";
  if (status === 429)
    return "Đã hết lượt đọc bill (miễn phí) tạm thời. Hãy thử lại sau ít phút.";
  if (status === 500)
    return "Máy chủ chưa được cấu hình đọc bill (thiếu GEMINI_API_KEY).";
  return "AI chưa đọc được bill. Hãy thử lại hoặc nhập tay.";
};

export interface BillReadResult {
  bill: BillResult;
  /** Ảnh bill đã nén, dùng để lưu làm chứng từ */
  image: Blob;
}

export const readBillWithAi = async (
  tripId: string,
  file: File
): Promise<BillReadResult> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập để đọc bill.");
  const prepared = await prepareBillImage(file);
  const res = await fetch("/api/read-bill", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tripId,
      image: prepared.base64,
      mimeType: "image/jpeg",
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(explain(res.status));
  const data = (await res.json()) as { bill?: unknown };
  return { bill: normalizeBillResult(data.bill), image: prepared.blob };
};
