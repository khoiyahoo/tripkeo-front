interface GoogleSignInCardProps {
  isLoading: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
}

const GoogleIcon = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.35 11.1h-9.18v2.98h5.31c-.23 1.46-1.72 4.3-5.31 4.3a5.91 5.91 0 1 1 0-11.82 5.2 5.2 0 0 1 3.73 1.46l2.56-2.46A9.4 9.4 0 0 0 12.17 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.58-.06-1.03-.16-1.1Z"
      fill="currentColor"
    />
  </svg>
);

export const GoogleSignInCard = ({
  isLoading,
  authError,
  onGoogleSignIn,
}: GoogleSignInCardProps) => {
  return (
    <div className="grid w-full max-w-md gap-6 rounded-[20px] bg-surface-card p-8 text-left shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid gap-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 font-bold text-lg text-white">
          TK
        </div>
        <h1 className="font-bold font-heading text-3xl text-on-surface">
          TripKeo
        </h1>
        <p className="text-on-surface-variant">
          Đăng nhập để bắt đầu lên kế hoạch chuyến đi.
        </p>
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className="flex items-center justify-center gap-3 rounded-full bg-primary-500 px-6 py-3.5 font-semibold text-base text-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <GoogleIcon />
        {isLoading ? "Đang đăng nhập..." : "Đăng nhập bằng Google"}
      </button>

      {authError ? (
        <p className="rounded-xl border border-error-500/20 bg-error-50 p-3 text-error-700 text-sm">
          {authError}
        </p>
      ) : null}
    </div>
  );
};
