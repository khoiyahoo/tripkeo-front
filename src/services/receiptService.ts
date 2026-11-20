import { auth } from "@/lib/firebase";

// Lưu ảnh bill trên Cloudinary. Việc ký yêu cầu và xóa ảnh do hàm server (Vercel) làm,
// vì cần API secret. Hàm server chỉ cho chủ chuyến / thủ quỹ của chuyến đó.

export interface UploadedReceipt {
  url: string;
  publicId: string;
}

const authHeader = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Bạn cần đăng nhập để lưu ảnh bill.");
  return `Bearer ${await user.getIdToken()}`;
};

const explain = (status: number): string => {
  if (status === 401) return "Phiên đăng nhập hết hạn. Hãy đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền lưu ảnh cho chuyến đi này.";
  if (status === 429) return "Bạn tải ảnh quá nhiều, hãy thử lại sau.";
  if (status === 404)
    return "Máy chủ lưu ảnh chưa chạy. Khi dev cục bộ hãy dùng `vercel dev`.";
  if (status === 500) return "Máy chủ chưa được cấu hình lưu ảnh (Cloudinary).";
  return "Không lưu được ảnh bill. Vui lòng thử lại.";
};

export const uploadReceipt = async (
  tripId: string,
  image: Blob
): Promise<UploadedReceipt> => {
  const signRes = await fetch("/api/cloudinary-sign", {
    method: "POST",
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tripId }),
  });
  if (!signRes.ok) throw new Error(explain(signRes.status));
  const sign = (await signRes.json()) as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    public_id: string;
    allowed_formats: string;
    signature: string;
  };

  const form = new FormData();
  form.append("file", image, "bill.jpg");
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);
  form.append("public_id", sign.public_id);
  form.append("allowed_formats", sign.allowed_formats);

  const upRes = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloudName)}/image/upload`,
    { method: "POST", body: form, signal: AbortSignal.timeout(60_000) }
  );
  if (!upRes.ok) throw new Error("Không tải được ảnh lên. Vui lòng thử lại.");
  const data = (await upRes.json()) as {
    secure_url?: string;
    public_id?: string;
  };
  if (!data.secure_url || !data.public_id) {
    throw new Error("Không tải được ảnh lên. Vui lòng thử lại.");
  }
  return { url: data.secure_url, publicId: data.public_id };
};

/** Xóa ảnh trên Cloudinary. Lỗi không chặn luồng chính (ảnh mồ côi không ảnh hưởng dữ liệu). */
export const deleteReceipt = async (
  tripId: string,
  publicId: string
): Promise<void> => {
  try {
    await fetch("/api/cloudinary-delete", {
      method: "POST",
      headers: {
        Authorization: await authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tripId, publicId }),
    });
  } catch {
    // bỏ qua
  }
};

/** Ảnh thu nhỏ cho danh sách (Cloudinary resize khi phân phối). */
export const receiptThumbUrl = (url: string, size = 160): string =>
  url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
