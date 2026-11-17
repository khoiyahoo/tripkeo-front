import type { User } from "firebase/auth";
import { create } from "zustand";

interface AuthStore {
  user: User | null;
  isInitialized: boolean;
  /** Tăng khi thông tin user thay đổi tại chỗ (tên, provider) vì object User giữ nguyên tham chiếu */
  userVersion: number;
  refreshUser: () => void;
  setUser: (user: User | null) => void;
  setIsInitialized: (value: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isInitialized: false,
  userVersion: 0,
  refreshUser: () => set((s) => ({ userVersion: s.userVersion + 1 })),
  setUser: (user) => set({ user }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
}));
