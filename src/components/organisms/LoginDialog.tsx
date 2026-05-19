import { GoogleSignInCard } from "@/components/organisms/GoogleSignInCard";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAuthStore } from "@/stores/authStore";

export const LoginDialog = () => {
  const loginDialogOpen = useAuthStore((s) => s.loginDialogOpen);
  const closeLoginDialog = useAuthStore((s) => s.closeLoginDialog);
  const { isLoading, authError, onGoogleSignIn } = useGoogleAuth();

  if (!loginDialogOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to continue"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginDialog();
      }}
    >
      <div className="relative w-full max-w-md">
        <button
          type="button"
          onClick={closeLoginDialog}
          aria-label="Close sign-in dialog"
          className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-card text-on-surface-variant shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition hover:bg-surface hover:text-on-surface"
        >
          ✕
        </button>

        <GoogleSignInCard
          isLoading={isLoading}
          authError={authError}
          onGoogleSignIn={onGoogleSignIn}
        />
      </div>
    </div>
  );
};
