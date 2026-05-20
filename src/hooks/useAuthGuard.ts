import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useAuthStore } from "@/stores/authStore";

/**
 * Guards a page behind authentication.
 *
 * Responsibilities:
 * - Open the login dialog when the page is accessed without authentication.
 * - Redirect to "/" if the user closes the dialog without signing in.
 * - Return whether the user is authenticated so the page can conditionally render.
 *
 * @returns `{ isAuthenticated }` — true when the user is signed in and auth is initialized.
 */
export const useAuthGuard = () => {
  // 1. External hooks
  const navigate = useNavigate();

  // 2. Store state
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const loginDialogOpen = useAuthStore((s) => s.loginDialogOpen);
  const openLoginDialog = useAuthStore((s) => s.openLoginDialog);

  // Track whether this guard has opened the dialog
  const openedRef = useRef(false);

  // 3. Open dialog when unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      openLoginDialog();
      openedRef.current = true;
    }
  }, [isInitialized, user, openLoginDialog]);

  // 4. Redirect home when dialog is dismissed without signing in
  useEffect(() => {
    if (openedRef.current && !loginDialogOpen && isInitialized && !user) {
      navigate({ to: "/" });
    }
  }, [loginDialogOpen, isInitialized, user, navigate]);

  return { isAuthenticated: isInitialized && !!user };
};
