import type { ContributionStatus } from "@/utils/fundCalc";

/** Chữ dùng chung cho Quỹ (web và app giữ giống nhau). */
export const FUND_COPY = {
  syncBanner:
    "Các khoản chi từ quỹ lấy từ tab Chi tiêu. Sửa hoặc xóa ở đó sẽ làm thay đổi số dư quỹ.",
  expenseListNote: "Khoản có nhãn Quỹ được trừ vào quỹ chung.",
  balanceNote: "Số dư đã tính cả quỹ chung. Tất toán thực hiện ở tab Quỹ.",
  closedNote:
    "Quỹ đã đóng: không thể thêm giao dịch hay sửa các khoản chi từ quỹ. Chủ chuyến có thể mở lại.",
  cannotDisable:
    'Không thể tắt quỹ khi còn khoản chi từ quỹ hoặc giao dịch quỹ đang hiệu lực. Hãy hủy các giao dịch, chuyển các khoản chi sang "Cá nhân ứng trước", hoặc dùng "Đóng quỹ".',
  closeWithPending: (count: number) =>
    `Còn ${count} khoản chưa tất toán. Vẫn đóng quỹ? (Đóng quỹ sẽ khóa ghi giao dịch; chủ chuyến có thể mở lại.)`,
  refundExceedsBalance: (balance: string) =>
    `Số tiền hoàn lớn hơn số dư quỹ hiện có (${balance}). Hãy chắc chắn thủ quỹ có đủ tiền, hoặc ghi nhận các khoản thu thêm trước.`,
  noContributionTitle: "Quỹ chưa có khoản đóng nào",
  noContributionBody:
    'Chưa có thành viên nào đóng quỹ nên chưa thể chi từ quỹ. Hãy ghi nhận đóng quỹ ở tab Quỹ trước, hoặc chọn "Cá nhân ứng trước".',
  negativeWarning: (shortage: string, perPerson: string) =>
    `Quỹ đang thiếu ${shortage}. Cần thu thêm khoảng ${perPerson}/người.`,
  impactTitle: "Thay đổi này ảnh hưởng đến quỹ chung",
  impactBody: (before: string, after: string) =>
    `Số dư quỹ sẽ đổi từ ${before} thành ${after}.`,
} as const;

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
  unpaid: "Chưa nộp",
  partial: "Nộp thiếu",
  paid: "Đã nộp",
  over: "Nộp dư",
};

export const FUND_TX_LABEL = {
  contribution: "Đóng quỹ",
  refund: "Hoàn quỹ",
} as const;

export const PAYMENT_METHOD_LABEL = {
  cash: "Tiền mặt",
  bank: "Chuyển khoản",
} as const;
