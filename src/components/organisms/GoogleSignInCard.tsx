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
    <div className="grid w-full max-w-md gap-6 rounded-3xl bg-white p-8 text-left shadow-slate-300/35 shadow-xl">
      <div className="grid gap-2 text-center">
        <h1 className="font-bold text-3xl text-slate-900">TripKeo</h1>
        <p className="text-slate-500">
          Continue your trip planning with one tap.
        </p>
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={isLoading}
        className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 font-semibold text-base text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <GoogleIcon />
        {isLoading ? "Signing in..." : "Sign in with Google"}
      </button>

      {authError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
          {authError}
        </p>
      ) : null}
    </div>
  );
};
