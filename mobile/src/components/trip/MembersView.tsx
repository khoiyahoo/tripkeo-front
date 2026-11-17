import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";

import { DateField, Field, Input, SingleChips } from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import { Card, Initial } from "@/components/trip/ui";
import { getAppUrl } from "@/lib/appUrl";
import { getCostMemberExpenseInfo } from "@/services/expenseService";
import { formatCurrency } from "@/utils/format";

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

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "",
  left: "Đã rời",
  removed: "Đã bị xóa",
};

type InviteRole = "editor" | "treasurer" | "member";
const INVITE_ROLES: { value: InviteRole; label: string }[] = [
  { value: "editor", label: "Biên tập" },
  { value: "treasurer", label: "Thủ quỹ" },
  { value: "member", label: "Thành viên" },
];

interface Props {
  members: Record<string, TripMemberInfo>;
  costMembers: string[];
  currentUserRole: TripRole | undefined;
  currentUserId: string | undefined;
  currentUserEmail: string;
  tripEndDate: string;
  expenses: ExpenseWithId[];
  balances: MemberBalance[];
  onAddCostMember: (name: string) => Promise<void>;
  onRemoveCostMember: (name: string) => Promise<void>;
  onInviteMember: (input: InviteMemberInput) => Promise<string>;
  onRemoveMember: (userId: string) => Promise<void>;
  onLeaveTrip: (userId: string, participationEnd?: string) => Promise<void>;
  onUpdateRole: (userId: string, newRole: TripRole) => Promise<void>;
  onCheckDuplicate: (email: string) => Promise<InvitationWithId | null>;
  onCancelInvitation: (invitationId: string) => Promise<void>;
  onCreateShareLink: (role: InviteRole) => Promise<string>;
  onLeft: () => void;
}

const today = () => new Date().toISOString().split("T")[0];

export const MembersView = ({
  members,
  costMembers,
  currentUserRole,
  currentUserId,
  currentUserEmail,
  tripEndDate,
  expenses,
  balances,
  onAddCostMember,
  onRemoveCostMember,
  onInviteMember,
  onRemoveMember,
  onLeaveTrip,
  onUpdateRole,
  onCheckDuplicate,
  onCancelInvitation,
  onCreateShareLink,
  onLeft,
}: Props) => {
  const isOwner = currentUserRole === "owner";
  const canLeave = currentUserRole !== undefined && !isOwner;
  const hasExpenses = expenses.length > 0;
  const tripEnded = tripEndDate < today();

  const [newName, setNewName] = useState("");
  const [isAddingCost, setIsAddingCost] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState(today());
  const [isLeaving, setIsLeaving] = useState(false);

  const active = Object.entries(members).filter(
    ([, m]) => (m.status ?? "active") === "active"
  );
  const former = Object.entries(members).filter(
    ([, m]) => m.status === "left" || m.status === "removed"
  );

  const myName = currentUserId
    ? members[currentUserId]?.displayName
    : undefined;
  const myBalance = balances.find((b) => b.name === myName);

  const fail = (msg: string) => Alert.alert("Lỗi", msg);

  // ── Người chia chi phí ──
  const addCostMember = async () => {
    const name = newName.trim();
    if (!name) return;
    if (costMembers.includes(name)) {
      Alert.alert("Đã có", `"${name}" đã có trong danh sách`);
      return;
    }
    if (hasExpenses) {
      Alert.alert(
        "Không thể thêm thành viên",
        "Đã có chi tiêu trong chuyến đi. Không thể thêm thành viên mới vì sẽ ảnh hưởng đến phép tính chia chi phí."
      );
      return;
    }
    setIsAddingCost(true);
    try {
      await onAddCostMember(name);
      setNewName("");
    } catch {
      fail("Không thể thêm thành viên. Vui lòng thử lại.");
    } finally {
      setIsAddingCost(false);
    }
  };

  const removeCostMember = (name: string) => {
    const info = getCostMemberExpenseInfo(expenses, name);
    if (info.hasExpenses && !tripEnded) {
      Alert.alert(
        "Không thể xóa thành viên",
        `"${name}" đang có khoản chi tiêu liên quan (trả ${info.asPayer.length}, tham gia ${info.asParticipant.length}). Vui lòng xóa hoặc điều chỉnh các khoản chi tiêu đó trước.`
      );
      return;
    }
    Alert.alert(
      "Xóa thành viên",
      `Xóa "${name}" khỏi danh sách chia chi phí?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () =>
            onRemoveCostMember(name).catch(() =>
              fail("Không thể xóa thành viên. Vui lòng thử lại.")
            ),
        },
      ]
    );
  };

  // ── Quyền ──
  const changeRole = (uid: string, name: string) =>
    Alert.alert(`Quyền của ${name}`, "Chọn vai trò", [
      ...INVITE_ROLES.map((r) => ({
        text: r.label,
        onPress: () =>
          onUpdateRole(uid, r.value).catch(() =>
            fail("Không thể cập nhật quyền. Vui lòng thử lại.")
          ),
      })),
      { text: "Hủy", style: "cancel" as const },
    ]);

  const kick = (uid: string, name: string) =>
    Alert.alert(
      "Xóa quyền truy cập",
      `Xóa ${name} khỏi chuyến đi? Lịch sử chi tiêu của họ vẫn được giữ lại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () =>
            onRemoveMember(uid).catch(() =>
              fail("Không thể xóa thành viên. Vui lòng thử lại.")
            ),
        },
      ]
    );

  // ── Mời ──
  const openInvite = () => {
    setInviteEmail("");
    setInviteRole("member");
    setInviteError(null);
    setInviteOpen(true);
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (currentUserEmail && email === currentUserEmail.toLowerCase()) {
      setInviteError("Bạn không thể mời chính mình.");
      return;
    }
    const isActiveMember = Object.values(members).some(
      (m) =>
        m.email?.toLowerCase() === email && (m.status ?? "active") === "active"
    );
    if (isActiveMember) {
      setInviteError("Người này đã là thành viên của chuyến đi.");
      return;
    }

    setIsInviting(true);
    setInviteError(null);
    try {
      // Lời mời cũ còn treo (email không còn là thành viên) -> huỷ rồi mời lại.
      const existing = await onCheckDuplicate(email);
      if (existing) await onCancelInvitation(existing.id);
      await onInviteMember({ email, role: inviteRole });
      setInviteOpen(false);
      Alert.alert("Đã gửi", `Đã gửi lời mời đến ${email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("BREVO_API_KEY") ||
        message.includes("send email") ||
        message.includes("Failed to send")
      ) {
        setInviteOpen(false);
        Alert.alert(
          "Chưa gửi được email",
          "Lời mời đã được tạo nhưng không thể gửi email. Hãy chia sẻ link thủ công."
        );
      } else {
        setInviteError("Không thể gửi lời mời. Vui lòng thử lại.");
      }
    } finally {
      setIsInviting(false);
    }
  };

  const shareLink = async () => {
    setIsLinking(true);
    setInviteError(null);
    try {
      const code = await onCreateShareLink(inviteRole);
      await Share.share({ message: `${getAppUrl()}/invite/${code}` });
    } catch {
      setInviteError("Không thể tạo link. Vui lòng thử lại.");
    } finally {
      setIsLinking(false);
    }
  };

  // ── Rời chuyến ──
  const leave = async () => {
    if (!currentUserId) return;
    setIsLeaving(true);
    try {
      await onLeaveTrip(currentUserId, leaveDate);
      setLeaveOpen(false);
      onLeft();
    } catch {
      setIsLeaving(false);
      fail("Không thể rời chuyến đi. Vui lòng thử lại.");
    }
  };

  const renderAvatar = (m: TripMemberInfo) =>
    m.photoURL ? (
      <Image
        source={{ uri: m.photoURL }}
        style={{ width: 36, height: 36, borderRadius: 18 }}
      />
    ) : (
      <Initial name={m.displayName || "?"} />
    );

  return (
    <View className="gap-4">
      {/* Người chia chi phí */}
      <Card title={`Thành viên tính chi phí (${costMembers.length})`}>
        <Text className="-mt-2 text-on-surface-variant text-xs">
          Danh sách tên dùng để chia chi phí. Không cần chấp nhận lời mời.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {costMembers.map((name) => (
            <View
              className="flex-row items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 py-1.5 pr-2 pl-3"
              key={name}
            >
              <Text className="font-medium text-primary-800 text-sm">
                {name}
              </Text>
              {isOwner && costMembers.length > 1 && (
                <Pressable hitSlop={8} onPress={() => removeCostMember(name)}>
                  <Ionicons color="#b63f3f" name="close" size={14} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
        {isOwner && (
          <View className="flex-row gap-2">
            <Input
              className="flex-1"
              editable={!isAddingCost}
              onChangeText={setNewName}
              onSubmitEditing={addCostMember}
              placeholder="Nhập tên thành viên..."
              returnKeyType="done"
              value={newName}
            />
            <Pressable
              className="h-11 items-center justify-center rounded-xl bg-primary-500 px-4 active:bg-primary-600"
              disabled={!newName.trim() || isAddingCost}
              onPress={addCostMember}
              style={{ opacity: newName.trim() && !isAddingCost ? 1 : 0.5 }}
            >
              {isAddingCost ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Thêm</Text>
              )}
            </Pressable>
          </View>
        )}
      </Card>

      {/* Thành viên có tài khoản */}
      <Card title={`Quyền truy cập (${active.length})`}>
        {active.map(([uid, m]) => {
          const isMe = uid === currentUserId;
          const editable = isOwner && !isMe && m.role !== "owner";
          return (
            <View className="flex-row items-center gap-3" key={uid}>
              {renderAvatar(m)}
              <View className="flex-1">
                <Text
                  className="font-medium text-on-surface text-sm"
                  numberOfLines={1}
                >
                  {m.displayName}
                  {isMe ? " (Bạn)" : ""}
                </Text>
                <Text
                  className="text-on-surface-variant text-xs"
                  numberOfLines={1}
                >
                  {m.email}
                </Text>
              </View>
              <Pressable
                className="flex-row items-center gap-1 rounded-full bg-surface-dim px-2.5 py-1"
                disabled={!editable}
                onPress={() => changeRole(uid, m.displayName)}
              >
                <Text className="text-on-surface-variant text-xs">
                  {ROLE_LABELS[m.role]}
                </Text>
                {editable && (
                  <Ionicons color="#abbbc2" name="chevron-down" size={12} />
                )}
              </Pressable>
              {editable && (
                <Pressable hitSlop={8} onPress={() => kick(uid, m.displayName)}>
                  <Ionicons
                    color="#eb5757"
                    name="person-remove-outline"
                    size={18}
                  />
                </Pressable>
              )}
            </View>
          );
        })}
        {isOwner && (
          <Pressable
            className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-primary-500 active:opacity-70"
            onPress={openInvite}
          >
            <Ionicons color="#eb5757" name="person-add-outline" size={18} />
            <Text className="font-semibold text-primary-500">
              Mời thành viên
            </Text>
          </Pressable>
        )}
      </Card>

      {former.length > 0 && (
        <Card title={`Đã rời / bị xóa (${former.length})`}>
          {former.map(([uid, m]) => (
            <View className="flex-row items-center gap-3 opacity-60" key={uid}>
              {renderAvatar(m)}
              <View className="flex-1">
                <Text
                  className="font-medium text-on-surface text-sm"
                  numberOfLines={1}
                >
                  {m.displayName}
                </Text>
                <Text className="text-on-surface-variant text-xs">
                  {STATUS_LABELS[m.status ?? "active"]}
                  {m.participationEnd ? ` · ${m.participationEnd}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {canLeave && (
        <Pressable
          className="h-11 items-center justify-center rounded-xl border border-error-500 active:opacity-70"
          onPress={() => {
            setLeaveDate(today());
            setLeaveOpen(true);
          }}
        >
          <Text className="font-semibold text-error-500">Rời chuyến đi</Text>
        </Pressable>
      )}

      {/* Modal mời */}
      <FormModal
        canSubmit={!!inviteEmail.trim() && !isLinking}
        error={inviteError}
        isSubmitting={isInviting}
        onClose={() => setInviteOpen(false)}
        onSubmit={sendInvite}
        submitLabel="Gửi lời mời qua email"
        title="Mời thành viên"
        visible={inviteOpen}
      >
        <Field label="Vai trò">
          <SingleChips
            onChange={setInviteRole}
            options={INVITE_ROLES}
            value={inviteRole}
          />
        </Field>
        <Field label="Email *">
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setInviteEmail}
            placeholder="email@example.com"
            value={inviteEmail}
          />
        </Field>
        <Pressable
          className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-outline-variant active:opacity-70"
          disabled={isLinking || isInviting}
          onPress={shareLink}
        >
          {isLinking ? (
            <ActivityIndicator color="#abbbc2" />
          ) : (
            <Ionicons color="#abbbc2" name="share-outline" size={18} />
          )}
          <Text className="font-medium text-on-surface">
            Hoặc chia sẻ link mời
          </Text>
        </Pressable>
      </FormModal>

      {/* Modal rời chuyến */}
      <FormModal
        canSubmit
        isSubmitting={isLeaving}
        onClose={() => setLeaveOpen(false)}
        onSubmit={leave}
        submitLabel="Rời chuyến đi"
        title="Rời chuyến đi"
        visible={leaveOpen}
      >
        {myBalance && (
          <View className="gap-1 rounded-xl border border-outline-variant bg-surface-dim/50 p-3">
            <Text className="font-medium text-on-surface">
              {myBalance.name}
            </Text>
            <Text className="text-on-surface-variant text-sm">
              Đã trả: {formatCurrency(myBalance.totalPaid)}
            </Text>
            <Text className="text-on-surface-variant text-sm">
              Phần chịu: {formatCurrency(myBalance.totalOwed)}
            </Text>
            <Text className="text-on-surface-variant text-sm">
              Số dư: {formatCurrency(Math.round(myBalance.net))}
            </Text>
          </View>
        )}
        <Field label="Ngày kết thúc tham gia">
          <DateField
            max={tripEndDate}
            onChange={setLeaveDate}
            value={leaveDate}
          />
        </Field>
      </FormModal>
    </View>
  );
};
