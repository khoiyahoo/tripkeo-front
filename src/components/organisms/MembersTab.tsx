import {
  AlertCircle,
  Check,
  Copy,
  Crown,
  Eye,
  Link2,
  Loader2,
  LogOut,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DatePicker } from "@/components/molecules/DatePicker";
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
import { getMemberExpenseInfo } from "@/services/expenseService";

import type {
  ExpenseWithId,
  InvitationWithId,
  InviteMemberInput,
  MemberBalance,
  MemberStatus,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

const ROLE_LABELS: Record<TripRole, string> = {
  owner: "Chủ sở hữu",
  editor: "Biên tập",
  treasurer: "Thủ quỹ",
  member: "Thành viên",
};

const ROLE_COLORS: Record<TripRole, string> = {
  owner: "bg-tertiary-50 text-tertiary-700",
  editor: "bg-primary-50 text-primary-700",
  treasurer: "bg-success-50 text-success-700",
  member: "bg-surface-dim text-on-surface-variant",
};

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "",
  left: "Đã rời",
  removed: "Đã bị xóa",
};

interface MembersTabProps {
  members: Record<string, TripMemberInfo>;
  currentUserRole: TripRole | undefined;
  currentUserId: string | undefined;
  tripName: string;
  /** Expenses for constraint checks (block leave/kick if linked) */
  expenses: ExpenseWithId[];
  /** Pass current user's balance so the leave dialog can show a financial summary */
  balances?: MemberBalance[];
  onInviteMember: (input: InviteMemberInput) => Promise<string>;
  onRemoveMember: (userId: string) => Promise<void>;
  onLeaveTrip: (userId: string, participationEnd?: string) => Promise<void>;
  onUpdateRole: (userId: string, newRole: TripRole) => Promise<void>;
  onCheckDuplicate: (email: string) => Promise<InvitationWithId | null>;
  onCreateShareLink: (
    role: "editor" | "treasurer" | "member"
  ) => Promise<string>;
}

export const MembersTab = ({
  members,
  currentUserRole,
  currentUserId,
  tripName,
  expenses,
  balances,
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
    "editor" | "treasurer" | "member"
  >("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveDate, setLeaveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [kickTarget, setKickTarget] = useState<{
    uid: string;
    displayName: string;
  } | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [blockDialog, setBlockDialog] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const hasExpenses = expenses.length > 0;

  const isOwner = currentUserRole === "owner";
  const isTreasurer = currentUserRole === "treasurer";

  // Separate active vs left/removed members
  const activeEntries = Object.entries(members).filter(
    ([, m]) => (m.status ?? "active") === "active"
  );
  const formerEntries = Object.entries(members).filter(
    ([, m]) => m.status === "left" || m.status === "removed"
  );

  const canLeave = currentUserRole !== undefined && currentUserRole !== "owner";
  const ownerName =
    Object.values(members).find((m) => m.role === "owner")?.displayName ?? "";

  // Current user's balance summary for leave dialog
  const currentUserBalance = balances?.find((b) => b.uid === currentUserId);
  const hasTreasurerInGroup = activeEntries.some(
    ([uid, m]) => m.role === "treasurer" && uid !== currentUserId
  );

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
    // Check if user is linked to expenses
    const info = getMemberExpenseInfo(expenses, currentUserId);
    if (info.hasExpenses) {
      setBlockDialog({
        title: "🚫 Không thể rời chuyến đi",
        message: `Bạn liên quan đến ${info.asPayer.length + info.asParticipant.length} chi tiêu. Hãy xóa hoặc chuyển chi tiêu trước khi rời.`,
      });
      setIsLeaveDialogOpen(false);
      return;
    }
    setIsLeaving(true);
    try {
      await onLeaveTrip(currentUserId, leaveDate);
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
    // Check if member is linked to expenses
    const info = getMemberExpenseInfo(expenses, kickTarget.uid);
    if (info.hasExpenses) {
      setBlockDialog({
        title: "🚫 Không thể xóa thành viên",
        message: `${kickTarget.displayName} liên quan đến ${info.asPayer.length + info.asParticipant.length} chi tiêu. Hãy xóa hoặc chỉnh sửa chi tiêu trước.`,
      });
      setKickTarget(null);
      return;
    }
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
      {/* Block action dialog */}
      <Dialog
        open={!!blockDialog}
        onOpenChange={(open) => !open && setBlockDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blockDialog?.title}</DialogTitle>
            <DialogDescription>{blockDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Leave trip dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rời chuyến đi</DialogTitle>
            <DialogDescription>
              Bạn đang chuẩn bị rời &quot;{tripName}&quot;. Dữ liệu chi phí của
              bạn vẫn được giữ lại.
            </DialogDescription>
          </DialogHeader>

          {/* Treasurer must transfer role first */}
          {isTreasurer && !hasTreasurerInGroup && (
            <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Bạn đang là thủ quỹ</p>
                <p>
                  Vui lòng chuyển quyền thủ quỹ cho thành viên khác trước khi
                  rời.
                </p>
              </div>
            </div>
          )}

          {/* Financial summary */}
          {currentUserBalance && (
            <div className="rounded-lg border border-outline-variant bg-surface-dim/50 p-4 text-sm">
              <p className="mb-3 font-medium text-on-surface">
                Tóm tắt tài chính của bạn
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Đã đóng vào nhóm:
                  </span>
                  <span className="font-medium text-on-surface">
                    {currentUserBalance.totalPaid.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Tổng phần bạn chi:
                  </span>
                  <span className="font-medium text-on-surface">
                    {currentUserBalance.totalOwed.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Số dư:</span>
                  <span
                    className={`font-semibold ${
                      currentUserBalance.net >= 0
                        ? "text-success-600"
                        : "text-error-600"
                    }`}
                  >
                    {currentUserBalance.net >= 0 ? "+" : ""}
                    {currentUserBalance.net.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
              {currentUserBalance.net < 0 && (
                <p className="mt-2 text-error-600 text-xs">
                  ⚠ Bạn còn nợ nhóm. Vui lòng thanh toán trước khi rời.
                </p>
              )}
              {currentUserBalance.net > 0 && (
                <p className="mt-2 text-success-600 text-xs">
                  ✓ Nhóm còn nợ bạn. Hãy đảm bảo thu hồi trước khi rời.
                </p>
              )}
            </div>
          )}

          {/* Participation end date */}
          <div>
            <Label>Ngày kết thúc tham gia</Label>
            <DatePicker
              value={leaveDate}
              onChange={setLeaveDate}
              maxDate={new Date().toISOString().split("T")[0]}
              className="mt-1"
            />
          </div>

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
              disabled={isLeaving || (isTreasurer && !hasTreasurerInGroup)}
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

      {/* Non-owner read-only banner */}
      {currentUserRole && currentUserRole !== "owner" && (
        <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Chỉ chủ sở hữu mới quản lý được thành viên.
            {ownerName ? (
              <>
                {" "}
                Liên hệ <strong>{ownerName}</strong> nếu cần thay đổi.
              </>
            ) : (
              " Liên hệ chủ chuyến đi nếu cần thay đổi."
            )}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-on-surface">
          Thành viên ({activeEntries.length})
        </h3>
        {isOwner && !isInviting && (
          <Button
            size="sm"
            onClick={() => {
              if (hasExpenses) {
                setBlockDialog({
                  title: "🚫 Không thể thêm thành viên",
                  message:
                    "Không thể thêm thành viên khi đã có chi tiêu. Hãy xóa tất cả chi tiêu trước khi mời thêm người.",
                });
                return;
              }
              setIsInviting(true);
            }}
          >
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
                  setInviteRole(v as "editor" | "treasurer" | "member");
                  setShareLink(null);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    Biên tập (thêm/sửa lịch trình)
                  </SelectItem>
                  <SelectItem value="treasurer">
                    Thủ quỹ (quản lý chi phí)
                  </SelectItem>
                  <SelectItem value="member">Thành viên (chỉ xem)</SelectItem>
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
        {activeEntries.map(([uid, member]) => (
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
                      <SelectItem value="editor">
                        Biên tập — thêm/sửa lịch trình
                      </SelectItem>
                      <SelectItem value="treasurer">
                        Thủ quỹ — quản lý chi phí
                      </SelectItem>
                      <SelectItem value="member">
                        Thành viên — chỉ xem
                      </SelectItem>
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

      {/* Former members section */}
      {formerEntries.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="flex items-center gap-1 text-on-surface-variant text-xs">
              <UserMinus className="h-3.5 w-3.5" />
              Thành viên cũ ({formerEntries.length})
            </span>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {formerEntries.map(([uid, member]) => {
              const statusLabel = STATUS_LABELS[member.status ?? "left"];
              return (
                <Card
                  key={uid}
                  className="border-none bg-surface-dim/40 shadow-none"
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <Avatar className="h-10 w-10 grayscale">
                      <AvatarImage
                        src={member.photoURL}
                        alt={member.displayName}
                      />
                      <AvatarFallback className="bg-neutral-200 text-neutral-500">
                        {member.displayName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-on-surface-variant text-sm">
                          {member.displayName}
                        </span>
                        <Badge className="bg-neutral-100 px-1.5 py-0 text-neutral-500 text-xs">
                          {statusLabel}
                        </Badge>
                      </div>
                      {member.participationEnd && (
                        <p className="text-on-surface-variant text-xs">
                          Đến {member.participationEnd}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
