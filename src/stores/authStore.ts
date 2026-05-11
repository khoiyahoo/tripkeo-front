import { create } from "zustand";

import type { AuthUser } from "@/types/auth";

interface AuthStore {
  user: AuthUser | null;
  isInitialized: boolean;
  loginDialogOpen: boolean;
  setUser: (user: AuthUser | null) => void;
  setIsInitialized: (value: boolean) => void;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isInitialized: false,
  loginDialogOpen: false,
  setUser: (user) => set({ user }),
  setIsInitialized: (isInitialized) => set({ isInitialized }),
  openLoginDialog: () => set({ loginDialogOpen: true }),
  closeLoginDialog: () => set({ loginDialogOpen: false }),
}));
