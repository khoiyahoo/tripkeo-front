import { GoogleSignInCard } from "@/components/organisms/GoogleSignInCard";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

const LoginPage = () => {
  const { isLoading, authError, onGoogleSignIn } = useGoogleAuth();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-16 -left-20 h-72 w-72 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-orange-200/50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <GoogleSignInCard
          isLoading={isLoading}
          authError={authError}
          onGoogleSignIn={onGoogleSignIn}
        />
      </div>
    </section>
  );
};

export default LoginPage;
