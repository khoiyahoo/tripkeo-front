import { useCallback, useState } from "react";

import { AUTH_ERRORS } from "@/constants/auth";
import { consumePendingCallback } from "@/hooks/useRequireAuth";
import { signInWithGoogle } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

import type { UseGoogleAuthResult } from "@/types/auth";

export const useGoogleAuth = (): UseGoogleAuthResult => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const closeLoginDialog = useAuthStore((s) => s.closeLoginDialog);

  const onGoogleSignIn = useCallback((): void => {
    setIsLoading(true);
    setAuthError(null);

    signInWithGoogle()
      .then(() => {
        closeLoginDialog();
        consumePendingCallback();
      })
      .catch(() => {
        setAuthError(AUTH_ERRORS.signInFailed);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [closeLoginDialog]);

  return { isLoading, authError, onGoogleSignIn };
};
