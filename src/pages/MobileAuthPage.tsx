import { useSearch } from "@tanstack/react-router";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as
  | string
  | undefined;

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

const NONCE_KEY = "tripkeo_mobile_auth_nonce";

const safeStorage = {
  get: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): void => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage bị chặn: bỏ qua việc kiểm tra nonce
    }
  },
  remove: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const randomNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Đọc payload của JWT (không xác minh chữ ký — Firebase sẽ xác minh ở app). */
const decodeJwtPayload = (token: string): { nonce?: string } | null => {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part)) as { nonce?: string };
  } catch {
    return null;
  }
};

const goBackToApp = (appRedirect: string, idToken: string): void => {
  const target = new URL(appRedirect);
  target.searchParams.set("idToken", idToken);
  window.location.href = target.toString();
};

const MobileAuthPage = () => {
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const allowed = !!redirect && isAllowedRedirect(redirect);

  // Google chuyển hướng về trang này kèm #id_token=...&state=<redirect của app>
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    const state = params.get("state");
    if (!idToken || !state) return;

    window.history.replaceState(null, "", window.location.pathname);

    if (!isAllowedRedirect(state)) {
      setError("Liên kết không hợp lệ. Hãy mở lại từ ứng dụng Tripkeo.");
      return;
    }
    const expectedNonce = safeStorage.get(NONCE_KEY);
    safeStorage.remove(NONCE_KEY);
    if (expectedNonce && decodeJwtPayload(idToken)?.nonce !== expectedNonce) {
      setError("Phiên đăng nhập không hợp lệ. Vui lòng thử lại.");
      return;
    }
    goBackToApp(state, idToken);
  }, []);

  const signInWithGoogleRedirect = (appRedirect: string): void => {
    // Đi thẳng tới Google (không qua *.firebaseapp.com) để tránh lỗi sessionStorage
    // trong trình duyệt xác thực của iOS.
    const nonce = randomNonce();
    safeStorage.set(NONCE_KEY, nonce);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID ?? "");
    url.searchParams.set(
      "redirect_uri",
      `${window.location.origin}/mobile-auth`
    );
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("state", appRedirect);
    url.searchParams.set("prompt", "select_account");
    window.location.href = url.toString();
  };

  const onSignIn = (): void => {
    if (!redirect || !allowed) return;
    setError(null);

    if (GOOGLE_CLIENT_ID) {
      setIsLoading(true);
      signInWithGoogleRedirect(redirect);
      return;
    }

    // Dự phòng khi chưa cấu hình VITE_GOOGLE_WEB_CLIENT_ID: popup của Firebase
    setIsLoading(true);
    signInWithPopup(auth, new GoogleAuthProvider())
      .then((result) => {
        const idToken =
          GoogleAuthProvider.credentialFromResult(result)?.idToken;
        if (!idToken) throw new Error("No ID token");
        goBackToApp(redirect, idToken);
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
