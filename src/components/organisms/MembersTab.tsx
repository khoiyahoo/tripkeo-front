import { Crown, Loader2, UserPlus, X } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  InviteMemberInput,
  TripMemberInfo,
  TripRole,
} from "@/types/firestore";

const ROLE_LABELS: Record<TripRole, string> = {
  owner: "Chủ sở hữu",
  editor: "Biên tập",
  viewer: "Xem",
};

const ROLE_COLORS: Record<TripRole, string> = {
  owner: "bg-tertiary-50 text-tertiary-700",
  editor: "bg-primary-50 text-primary-700",
  viewer: "bg-surface-dim text-on-surface-variant",
};

interface MembersTabProps {
  members: Record<string, TripMemberInfo>;
  currentUserRole: TripRole | undefined;
  onInviteMember: (input: InviteMemberInput) => Promise<string>;
  onRemoveMember: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, newRole: TripRole) => Promise<void>;
}

export const MembersTab = ({
  members,
  currentUserRole,
  onInviteMember,
  onRemoveMember,
}: MembersTabProps) => {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = currentUserRole === "owner";
  const memberEntries = Object.entries(members);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsSubmitting(true);
    try {
      await onInviteMember({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      setIsInviting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
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
                onClick={() => setIsInviting(false)}
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
                onValueChange={(v) => setInviteRole(v as "editor" | "viewer")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    Biên tập (thêm/sửa nội dung)
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
                <Badge className={ROLE_COLORS[member.role]}>
                  {ROLE_LABELS[member.role]}
                </Badge>
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-error-500"
                    onClick={() => onRemoveMember(uid)}
                  >
                    <X className="h-3.5 w-3.5" />
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
