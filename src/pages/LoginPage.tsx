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
    <section className="tripkeo-auth-bg relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0 bg-primary-950/10" />

      <div className="relative z-10 flex w-full max-w-5xl items-center gap-16">
        {/* Left illustration */}
        <div className="hidden flex-1 lg:block">
          <div className="space-y-6 text-white">
            <h2 className="font-bold font-heading text-5xl leading-tight">
              Lên kế hoạch
              <br />
              <span className="text-secondary-100">cùng bạn bè</span>
            </h2>
            <p className="max-w-sm text-lg text-white/90">
              Tạo lịch trình, chia sẻ chi phí, bình chọn và quản lý mọi thứ cho
              chuyến đi nhóm trong một nơi duy nhất.
            </p>
            <div className="flex gap-6 pt-4">
              <div className="flex items-center gap-2 text-white/90">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-sm">Lịch trình</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-sm">Bản đồ</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Umbrella className="h-5 w-5 text-white" />
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
