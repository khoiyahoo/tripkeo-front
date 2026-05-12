import { useNavigate } from "@tanstack/react-router";
import { MapPin, Plane, Umbrella } from "lucide-react";
import { useEffect } from "react";

import { GoogleSignInCard } from "@/components/organisms/GoogleSignInCard";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAuthStore } from "@/stores/authStore";

const LoginPage = () => {
  const { isLoading, authError, onGoogleSignIn } = useGoogleAuth();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface p-6">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-16 -left-20 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-tertiary-200/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-secondary-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl items-center gap-16">
        {/* Left illustration */}
        <div className="hidden flex-1 lg:block">
          <div className="space-y-6">
            <h2 className="font-extrabold font-heading text-4xl text-on-surface leading-tight">
              Lên kế hoạch
              <br />
              <span className="text-primary-600">cùng bạn bè</span>
            </h2>
            <p className="max-w-sm text-lg text-on-surface-variant">
              Tạo lịch trình, chia sẻ chi phí, bình chọn và quản lý mọi thứ cho
              chuyến đi nhóm trong một nơi duy nhất.
            </p>
            <div className="flex gap-6 pt-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                  <Plane className="h-5 w-5 text-primary-700" />
                </div>
                <span className="font-medium text-sm">Lịch trình</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-100">
                  <MapPin className="h-5 w-5 text-tertiary-700" />
                </div>
                <span className="font-medium text-sm">Bản đồ</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100">
                  <Umbrella className="h-5 w-5 text-secondary-700" />
                </div>
                <span className="font-medium text-sm">Chia tiền</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="w-full max-w-md shrink-0">
          <GoogleSignInCard
            isLoading={isLoading}
            authError={authError}
            onGoogleSignIn={onGoogleSignIn}
          />
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
