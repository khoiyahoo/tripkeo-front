import { useSearch } from "@tanstack/react-router";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState } from "react";

import { auth } from "@/lib/firebase";

const PRIVATE_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

/**
 * Chỉ cho phép redirect về app Tripkeo: scheme `tripkeo://` (bản build) hoặc
 * `exp://` tới địa chỉ mạng nội bộ (Expo Go khi phát triển). Chặn mọi đích khác
 * để ID token không bị gửi tới nơi lạ.
 */
const isAllowedRedirect = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol === "tripkeo:") return true;
    if (url.protocol === "exp:") return PRIVATE_HOST.test(url.hostname);
    return false;
  } catch {
    return false;
  }
};

const MobileAuthPage = () => {
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const allowed = !!redirect && isAllowedRedirect(redirect);

  const onSignIn = (): void => {
    if (!redirect || !allowed) return;
    setIsLoading(true);
    setError(null);

    signInWithPopup(auth, new GoogleAuthProvider())
      .then((result) => {
        const idToken =
          GoogleAuthProvider.credentialFromResult(result)?.idToken;
        if (!idToken) throw new Error("No ID token");
        const target = new URL(redirect);
        target.searchParams.set("idToken", idToken);
        window.location.href = target.toString();
      })
      .catch(() => {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
        setIsLoading(false);
      });
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="font-bold font-heading text-2xl">Đăng nhập Tripkeo</h1>
        {allowed ? (
          <button
            className="w-full rounded-xl bg-primary-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
            disabled={isLoading}
            onClick={onSignIn}
            type="button"
          >
            {isLoading ? "Đang đăng nhập..." : "Tiếp tục với Google"}
          </button>
        ) : (
          <p className="text-on-surface-variant text-sm">
            Liên kết không hợp lệ. Hãy mở lại từ ứng dụng Tripkeo.
          </p>
        )}
        {error && <p className="text-error text-sm">{error}</p>}
      </div>
    </section>
  );
};

export default MobileAuthPage;
