import { useCallback } from "react";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { signOut } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();

  const handleCreateTrip = requireAuth(() => {
    // TODO: navigate to trip creation page
  });

  const handleSignOut = useCallback((): void => {
    signOut().catch(() => null);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-100 p-8">
      <div className="grid gap-4 rounded-3xl bg-white p-10 text-center shadow-slate-300/35 shadow-xl">
        <h1 className="font-bold text-4xl text-slate-900">TripKeo</h1>

        {user ? (
          <p className="text-slate-500">
            Chào mừng,{" "}
            <span className="font-semibold text-slate-800">
              {user.displayName ?? user.email}
            </span>
            !
          </p>
        ) : (
          <p className="text-slate-500">
            Khám phá tự do. Đăng nhập để tạo chuyến đi.
          </p>
        )}

        <div className="mt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleCreateTrip}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Tạo chuyến đi mới
          </button>

          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-slate-600 transition hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default HomePage;
