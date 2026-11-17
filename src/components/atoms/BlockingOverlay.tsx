import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

import { useLoadingStore } from "@/stores/loadingStore";

/**
 * Lớp phủ toàn màn hình khi có thao tác thêm/sửa/xóa đang chạy (qua runBlocking).
 * Render qua portal, nằm trên cả hộp thoại (z-100) và ép pointer-events:auto vì
 * Radix Dialog đặt pointer-events:none lên body, nếu không thì vẫn bấm xuyên qua được.
 */
export const BlockingOverlay = () => {
  const pending = useLoadingStore((s) => s.pending);
  if (pending === 0) return null;

  return createPortal(
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      role="alert"
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-card px-8 py-6 shadow-xl">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <span className="font-medium text-on-surface text-sm">
          Đang xử lý...
        </span>
      </div>
    </div>,
    document.body
  );
};
