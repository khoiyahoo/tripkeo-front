import { useNavigate, useParams } from "@tanstack/react-router";
import { CalendarDays, Loader2, MapPin, Shield, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  acceptInvitation,
  declineInvitation,
  findInvitationByCode,
} from "@/services/memberService";
import { useAuthStore } from "@/stores/authStore";

import logoUrl from "@/assets/logo.webp";

import type { InvitationWithId } from "@/types/firestore";

const InvitePage = () => {
  const { inviteCode } = useParams({ strict: false }) as {
    inviteCode: string;
  };
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openLoginDialog = useAuthStore((s) => s.openLoginDialog);

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "accept" | "decline" | null
  >(null);
  const [invitation, setInvitation] = useState<
    (InvitationWithId & { tripId: string }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!inviteCode) {
          setError("Link không hợp lệ");
          return;
        }

        const inv = await findInvitationByCode(inviteCode);
        if (!inv) {
          setError("Link không hợp lệ hoặc đã hết hạn");
          return;
        }

        if (inv.expiresAt && inv.expiresAt.toMillis() < Date.now()) {
          setError("Lời mời đã hết hạn");
          return;
        }

        if (inv.status !== "pending") {
          setError("Lời mời đã được sử dụng");
          return;
        }

        setInvitation(inv);
      } catch {
        setError("Đã xảy ra lỗi khi tải lời mời");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [inviteCode]);

  const handleAccept = useCallback(async () => {
    if (!invitation || !user) return;
    setIsAccepting(true);
    try {
      await acceptInvitation(
        invitation.tripId,
        invitation.id,
        user.uid,
        user.displayName ?? "",
        user.photoURL ?? "",
        user.email ?? "",
        invitation.role
      );
      toast.success("Đã tham gia chuyến đi!");
      navigate({ to: "/trips/$tripId", params: { tripId: invitation.tripId } });
    } catch {
      toast.error("Không thể tham gia. Vui lòng thử lại.");
    } finally {
      setIsAccepting(false);
    }
  }, [invitation, user, navigate]);

  const handleDecline = useCallback(async () => {
    if (!invitation) return;
    setIsDeclining(true);
    try {
      await declineInvitation(invitation.tripId, invitation.id);
      toast.info("Đã từ chối lời mời");
      navigate({ to: "/" });
    } catch {
      toast.error("Không thể từ chối. Vui lòng thử lại.");
    } finally {
      setIsDeclining(false);
    }
  }, [invitation, navigate]);

  const handleAction = (action: "accept" | "decline") => {
    if (!user) {
      setPendingAction(action);
      openLoginDialog();
      return;
    }
    if (action === "accept") handleAccept();
    else handleDecline();
  };

  // After login, auto-execute the pending action — deps are stable (useCallback)
  useEffect(() => {
    if (!user || !invitation || !pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action === "accept") handleAccept();
    else handleDecline();
  }, [user, invitation, pendingAction, handleAccept, handleDecline]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <img src={logoUrl} alt="TripKeo" className="h-9 object-contain" />
          </div>
          <XCircle className="mx-auto h-12 w-12 text-error-500" />
          <h2 className="font-semibold text-lg text-on-surface">{error}</h2>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const roleLabel =
    invitation.role === "editor"
      ? "Biên tập"
      : invitation.role === "treasurer"
        ? "Thủ quỹ"
        : "Thành viên";

  const roleBadgeClass =
    invitation.role === "editor"
      ? "bg-primary-50 text-primary-700"
      : invitation.role === "treasurer"
        ? "bg-success-50 text-success-700"
        : "bg-surface-dim text-on-surface-variant";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="flex justify-center">
          <img src={logoUrl} alt="TripKeo" className="h-9 object-contain" />
        </div>

        {/* Invite info */}
        <div className="space-y-1 text-center">
          <p className="text-on-surface-variant text-sm">
            <span className="font-semibold text-on-surface">
              {invitation.invitedByName || "Ai đó"}
            </span>{" "}
            mời bạn tham gia chuyến đi
          </p>
        </div>

        {/* Trip card */}
        <div className="space-y-3 rounded-xl border border-outline-variant/50 bg-surface-dim/40 p-4">
          <h2 className="font-bold text-lg text-on-surface">
            {invitation.tripName || "Chuyến đi"}
          </h2>
          {invitation.destination && (
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-primary-500" />
              {invitation.destination}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-on-surface-variant" />
            <span
              className={`rounded-full px-3 py-0.5 font-medium text-sm ${roleBadgeClass}`}
            >
              {roleLabel}
            </span>
          </div>
          {invitation.expiresAt && (
            <div className="flex items-center gap-2 text-on-surface-variant text-xs">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              Hết hạn:{" "}
              {new Date(invitation.expiresAt.toMillis()).toLocaleDateString(
                "vi-VN",
                { day: "2-digit", month: "2-digit", year: "numeric" }
              )}
            </div>
          )}
        </div>

        {/* Login notice */}
        {!user && (
          <p className="rounded-lg bg-primary-50 px-4 py-2.5 text-center text-primary-700 text-sm">
            Bạn cần đăng nhập để tham gia chuyến đi
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={isDeclining || isAccepting}
            onClick={() => handleAction("decline")}
          >
            {isDeclining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Từ chối"
            )}
          </Button>
          <Button
            className="flex-1 bg-primary-500 hover:bg-primary-600"
            disabled={isAccepting || isDeclining}
            onClick={() => handleAction("accept")}
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Tham gia ngay"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
