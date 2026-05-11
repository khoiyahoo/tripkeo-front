import type { User } from "firebase/auth";

export type AuthUser = User;

export interface UseGoogleAuthResult {
  isLoading: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
}
