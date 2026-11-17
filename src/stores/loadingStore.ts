import { create } from "zustand";

interface LoadingStore {
  /** Số tác vụ ghi dữ liệu đang chạy; > 0 thì khóa toàn bộ màn hình. */
  pending: number;
  begin: () => void;
  end: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  pending: 0,
  begin: () => set((s) => ({ pending: s.pending + 1 })),
  end: () => set((s) => ({ pending: Math.max(0, s.pending - 1) })),
}));
