import { useCallback } from "react";

import { useAuthStore } from "@/stores/authStore";

let pendingCallback: (() => void) | null = null;

export const consumePendingCallback = (): void => {
  const fn = pendingCallback;
  pendingCallback = null;
  fn?.();
};

export const useRequireAuth = () => {
  const user = useAuthStore((s) => s.user);
  const openLoginDialog = useAuthStore((s) => s.openLoginDialog);

  const requireAuth = useCallback(
    (fn: () => void): (() => void) => {
      return () => {
        if (user) {
          fn();
        } else {
          pendingCallback = fn;
          openLoginDialog();
        }
      };
    },
    [user, openLoginDialog]
  );

  return { requireAuth };
};
