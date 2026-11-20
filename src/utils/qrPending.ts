import type { SplitMethod } from "@/types/firestore";
import type { ExpenseCategory } from "@/types/trip";

// Khi người dùng rời Tripkeo để trả tiền ở app ngân hàng, trang có thể bị tải lại
// lúc quay về. Lưu bản nháp khoản chi để khôi phục và hỏi "đã chuyển khoản chưa?".

export interface QrDraft {
  description: string;
  amount?: number;
  category: ExpenseCategory;
  note: string;
  paidFrom?: "fund" | "member";
  paidBy?: string;
  splitMethod?: SplitMethod;
  splitBetween?: string[];
  splitDetails?: Record<string, number>;
  /** Chỉ có với khoản quét từ QR thanh toán */
  payment?: {
    merchantName?: string;
    bankBin?: string;
    bankName?: string;
    accountNumber?: string;
    memo?: string;
  };
  duplicateWarning?: string;
}

const MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** Mỗi trang chuyến đi có một bản nháp riêng (theo đường dẫn). */
const keyFor = (): string => `tripkeo_pending_qr:${window.location.pathname}`;

export const savePendingQr = (draft: QrDraft): void => {
  try {
    window.localStorage.setItem(
      keyFor(),
      JSON.stringify({ at: Date.now(), draft })
    );
  } catch {
    // Storage bị chặn: bỏ qua, vẫn còn ô tích "đã chuyển khoản" trong form
  }
};

export const loadPendingQr = (): QrDraft | null => {
  try {
    const raw = window.localStorage.getItem(keyFor());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; draft?: QrDraft };
    if (!parsed.draft || !parsed.at || Date.now() - parsed.at > MAX_AGE_MS) {
      window.localStorage.removeItem(keyFor());
      return null;
    }
    return parsed.draft;
  } catch {
    return null;
  }
};

export const clearPendingQr = (): void => {
  try {
    window.localStorage.removeItem(keyFor());
  } catch {
    // bỏ qua
  }
};
