import {
  Check,
  Copy,
  Crown,
  Eye,
  Link2,
  Loader2,
  LogOut,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import type {
  InvitationWithId,
  InviteMemberInput,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

const ROLE_LABELS: Record<TripRole, string> = {
  owner: "Chủ sở hữu",
  treasurer: "Thủ quỹ",
  editor: "Biên tập",
  viewer: "Xem",
};

const ROLE_COLORS: Record<TripRole, string> = {
  owner: "bg-tertiary-50 text-tertiary-700",
  treasurer: "bg-emerald-50 text-emerald-700",
  editor: "bg-primary-50 text-primary-700",
  viewer: "bg-surface-dim text-on-surface-variant",
};

interface MembersTabProps {
  members: Record<string, TripMemberInfo>;
  currentUserRole: TripRole | undefined;
  currentUserId: string | undefined;
  tripName: string;
  onInviteMember: (input: InviteMemberInput) => Promise<string>;
  onRemoveMember: (userId: string) => Promise<void>;
  onLeaveTrip: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, newRole: TripRole) => Promise<void>;
  onCheckDuplicate: (email: string) => Promise<InvitationWithId | null>;
  onCreateShareLink: (
    role: "treasurer" | "editor" | "viewer"
  ) => Promise<string>;
}

export const MembersTab = ({
  members,
  currentUserRole,
  currentUserId,
  tripName,
  onInviteMember,
  onRemoveMember,
  onLeaveTrip,
  onUpdateRole,
  onCheckDuplicate,
  onCreateShareLink,
}: MembersTabProps) => {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "treasurer" | "editor" | "viewer"
  >("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [kickTarget, setKickTarget] = useState<{
    uid: string;
    displayName: string;
  } | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  const isOwner = currentUserRole === "owner";
  const memberEntries = Object.entries(members);
  const canLeave = currentUserRole !== undefined && currentUserRole !== "owner";
  const ownerName =
    Object.values(members).find((m) => m.role === "owner")?.displayName ?? "";

  const handleUpdateRole = async (uid: string, newRole: TripRole) => {
    try {
      await onUpdateRole(uid, newRole);
      toast.success(`Đã cập nhật quyền thành ${ROLE_LABELS[newRole]}`);
    } catch {
      toast.error("Không thể cập nhật quyền. Vui lòng thử lại.");
    }
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const existing = await onCheckDuplicate(email);
      if (existing) {
        toast.warning(`Đã gửi lời mời đến ${email} trước đó.`);
        setIsSubmitting(false);
        return;
      }

      await onInviteMember({ email, role: inviteRole });
      toast.success(`Đã gửi lời mời đến ${email}`);
      setInviteEmail("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("RESEND_API_KEY") ||
        message.includes("send email") ||
        message.includes("Failed to send")
      ) {
        // Invitation created but email failed — user can still share the link
        toast.warning(
          "Lời mời đã được tạo nhưng không thể gửi email. Hãy chia sẻ link thủ công."
        );
        setInviteEmail("");
      } else {
        toast.error("Không thể gửi lời mời. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      const code = await onCreateShareLink(inviteRole);
      const link = `${window.location.origin}/invite/${code}`;
      setShareLink(link);
    } catch {
      toast.error("Không thể tạo link. Vui lòng thử lại.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      toast.success("Đã sao chép link");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép link");
    }
  };

  const handleLeaveTrip = async () => {
    if (!currentUserId) return;
    setIsLeaving(true);
    try {
      await onLeaveTrip(currentUserId);
      toast.success("Đã rời khỏi chuyến đi");
    } catch {
      toast.error("Không thể rời chuyến đi. Vui lòng thử lại.");
    } finally {
      setIsLeaving(false);
      setIsLeaveDialogOpen(false);
    }
  };

  const handleKickMember = async () => {
    if (!kickTarget) return;
    setIsKicking(true);
    try {
      await onRemoveMember(kickTarget.uid);
      toast.success(`Đã xóa ${kickTarget.displayName} khỏi chuyến đi`);
    } catch {
      toast.error("Không thể xóa thành viên. Vui lòng thử lại.");
    } finally {
      setIsKicking(false);
      setKickTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kick member confirmation dialog */}
      <Dialog
        open={!!kickTarget}
        onOpenChange={(open) => !open && setKickTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa thành viên</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa{" "}
              <span className="font-semibold text-on-surface">
                {kickTarget?.displayName}
              </span>{" "}
              khỏi chuyến đi &quot;{tripName}&quot;? Họ sẽ mất quyền truy cập
              lịch trình và chi phí.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKickTarget(null)}
              disabled={isKicking}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleKickMember}
              disabled={isKicking}
            >
              {isKicking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Xóa khỏi chuyến đi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave trip confirmation dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rời chuyến đi</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn rời khỏi chuyến đi &quot;{tripName}&quot;? Bạn sẽ
              không thể xem lịch trình và chi phí nữa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLeaveDialogOpen(false)}
              disabled={isLeaving}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveTrip}
              disabled={isLeaving}
            >
              {isLeaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Rời chuyến đi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer read-only banner */}
      {currentUserRole === "viewer" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Bạn chỉ có quyền xem chuyến đi này.
            {ownerName ? (
              <>
                {" "}
                Liên hệ <strong>{ownerName}</strong> để được cấp quyền chỉnh
                sửa.
              </>
            ) : (
              " Liên hệ chủ chuyến đi để được cấp quyền chỉnh sửa."
            )}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-on-surface">
          Thành viên ({memberEntries.length})
        </h3>
        {isOwner && !isInviting && (
          <Button size="sm" onClick={() => setIsInviting(true)}>
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            Mời thêm
          </Button>
        )}
      </div>

      {isInviting && (
        <Card className="border border-primary-200 shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-on-surface text-sm">
                Mời thành viên
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setIsInviting(false);
                  setShareLink(null);
                  setIsCopied(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                placeholder="email@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Vai trò</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => {
                  setInviteRole(v as "treasurer" | "editor" | "viewer");
                  setShareLink(null);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treasurer">
                    Thủ quỹ (quản lý chi phí)
                  </SelectItem>
                  <SelectItem value="editor">
                    Biên tập (thêm/sửa lịch trình)
                  </SelectItem>
                  <SelectItem value="viewer">Xem (chỉ đọc)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || isSubmitting}
              className="w-full"
              size="sm"
            >
              {isSubmitting && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              Gửi lời mời
            </Button>

            {/* Share link section */}
            <div className="relative py-2">
              <Separator />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-on-surface-variant text-xs">
                hoặc chia sẻ link
              </span>
            </div>

            {shareLink ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={shareLink} className="flex-1 text-xs" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0 gap-1"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-success-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {isCopied ? "Đã chép" : "Copy"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={handleGenerateShareLink}
                disabled={isGeneratingLink}
              >
                {isGeneratingLink ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                Tạo link mời
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {memberEntries.map(([uid, member]) => (
          <Card key={uid} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.photoURL} alt={member.displayName} />
                <AvatarFallback className="bg-primary-100 text-primary-800">
                  {member.displayName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-on-surface">
                    {member.displayName}
                  </span>
                  {member.role === "owner" && (
                    <Crown className="h-4 w-4 text-tertiary-500" />
                  )}
                </div>
                <p className="truncate text-on-surface-variant text-xs">
                  {member.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && member.role !== "owner" ? (
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleUpdateRole(uid, v as TripRole)}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-2 py-0 font-medium text-xs shadow-none focus:ring-0">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          ROLE_COLORS[member.role as TripRole]
                        }`}
                      >
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="treasurer">
                        Thủ quỹ — quản lý chi phí
                      </SelectItem>
                      <SelectItem value="editor">
                        Biên tập — thêm/sửa lịch trình
                      </SelectItem>
                      <SelectItem value="viewer">Xem — chỉ đọc</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={ROLE_COLORS[member.role]}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                )}
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-error-500"
                    onClick={() =>
                      setKickTarget({
                        uid,
                        displayName: member.displayName,
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canLeave && uid === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-error-500 text-xs hover:bg-error-50 hover:text-error-600"
                    onClick={() => setIsLeaveDialogOpen(true)}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Rời
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
