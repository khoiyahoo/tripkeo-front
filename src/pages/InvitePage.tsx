import { useNavigate, useParams } from "@tanstack/react-router";
import { Loader2, MapPin, UserPlus, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  acceptInvitation,
  declineInvitation,
  findInvitationByCode,
} from "@/services/memberService";
import { useAuthStore } from "@/stores/authStore";

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

  const handleAccept = async () => {
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
  };

  const handleDecline = async () => {
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
  };

  const handleAction = (action: "accept" | "decline") => {
    if (!user) {
      setPendingAction(action);
      openLoginDialog();
      return;
    }
    if (action === "accept") handleAccept();
    else handleDecline();
  };

  // After login, auto-execute the stored pending action with the fresh user context
  useEffect(() => {
    if (!user || !invitation || !pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action === "accept") handleAccept();
    else handleDecline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary-500" />
          <h1 className="font-bold text-2xl text-on-surface">
            Lời mời tham gia
          </h1>
          <p className="text-on-surface-variant">
            Bạn được mời tham gia chuyến đi
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-surface-dim/50 p-5">
          <h2 className="font-semibold text-lg text-on-surface">
            {invitation.tripName || "Chuyến đi"}
          </h2>
          {invitation.destination && (
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <MapPin className="h-4 w-4" />
              {invitation.destination}
            </div>
          )}
          <div className="inline-block rounded-full bg-primary-100 px-3 py-1 text-primary-800 text-sm">
            {invitation.role === "editor"
              ? "Biên tập"
              : invitation.role === "treasurer"
                ? "Thủ quỹ"
                : "Thành viên"}
          </div>
        </div>

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
            className="flex-1"
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
