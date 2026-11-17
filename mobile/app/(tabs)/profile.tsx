import { Ionicons } from "@expo/vector-icons";
import { runBlocking } from "@/lib/blocking";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Field, Input } from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import { Card } from "@/components/trip/ui";
import { useProfileStats } from "@/hooks/useProfileStats";
import { auth } from "@/lib/firebase";
import { signOut } from "@/services/authService";
import { updateDisplayName } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/utils/format";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  useAuthStore((s) => s.userVersion); // re-render khi đổi tên

  const stats = useProfileStats(user?.uid, user?.displayName);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEdit = () => {
    setEditName(user?.displayName ?? "");
    setError(null);
    setEditOpen(true);
  };

  const saveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !user) return;
    setIsSaving(true);
    setError(null);
    try {
      await runBlocking(() => updateDisplayName(user.uid, trimmed));
      refreshUser();
      setEditOpen(false);
    } catch {
      setError("Không thể cập nhật tên. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: () => signOut() },
    ]);

  const dash = stats.isLoading;
  const statCards: {
    icon: IconName;
    label: string;
    value: string;
    color: string;
  }[] = [
    {
      icon: "airplane-outline",
      label: "Chuyến đi",
      value: dash ? "—" : `${stats.tripCount}`,
      color: "#eb5757",
    },
    {
      icon: "location-outline",
      label: "Điểm đến",
      value: dash ? "—" : `${stats.destinationCount}`,
      color: "#8391a2",
    },
    {
      icon: "wallet-outline",
      label: "Tổng chi",
      value: dash ? "—" : formatCurrency(stats.totalSpent),
      color: "#f0a500",
    },
    {
      icon: "people-outline",
      label: "Bạn bè",
      value: dash ? "—" : `${stats.friendCount}`,
      color: "#34d399",
    },
  ];

  const initial = user?.displayName?.charAt(0).toUpperCase() ?? "U";

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="overflow-hidden rounded-2xl bg-surface-card">
          <View className="h-24 bg-primary-500" />
          <View className="px-4 pb-4">
            <View className="-mt-10 self-start rounded-full border-4 border-surface-card">
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-100">
                  <Text className="font-bold text-2xl text-primary-800">
                    {initial}
                  </Text>
                </View>
              )}
            </View>
            <View className="mt-3 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  className="font-bold text-on-surface text-xl"
                  numberOfLines={1}
                >
                  {user?.displayName ?? "Người dùng"}
                </Text>
                <Text className="text-on-surface-variant" numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
              <Pressable
                className="h-9 flex-row items-center gap-1 rounded-xl border border-outline-variant px-3"
                onPress={openEdit}
              >
                <Ionicons color="#abbbc2" name="create-outline" size={14} />
                <Text className="text-on-surface text-sm">Chỉnh sửa</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          {statCards.map((s) => (
            <View
              className="min-w-[45%] flex-1 flex-row items-center gap-3 rounded-2xl bg-surface-card p-3"
              key={s.label}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-dim">
                <Ionicons color={s.color} name={s.icon} size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-on-surface-variant text-xs">
                  {s.label}
                </Text>
                <Text className="font-bold text-on-surface" numberOfLines={1}>
                  {s.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Card title="Nơi đã đến">
          {stats.isLoading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#eb5757" size="small" />
              <Text className="text-on-surface-variant text-sm">
                Đang tải...
              </Text>
            </View>
          ) : stats.places.length === 0 ? (
            <Text className="text-on-surface-variant text-sm">
              Chưa có nơi nào.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {stats.places.map((p) => (
                <View
                  className="flex-row items-center gap-1 rounded-full bg-primary-50 px-3 py-1"
                  key={p}
                >
                  <Ionicons color="#b63f3f" name="location" size={12} />
                  <Text className="text-primary-700 text-sm">{p}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <View className="overflow-hidden rounded-2xl bg-surface-card">
          <Pressable
            className="flex-row items-center gap-3 p-4 active:bg-surface-dim"
            onPress={() => router.push("/settings")}
          >
            <Ionicons color="#abbbc2" name="settings-outline" size={20} />
            <Text className="flex-1 text-on-surface">Cài đặt</Text>
            <Ionicons color="#6b7280" name="chevron-forward" size={18} />
          </Pressable>
          <View className="h-px bg-outline-variant" />
          <Pressable
            className="flex-row items-center gap-3 p-4 active:bg-surface-dim"
            onPress={() => router.push("/friends")}
          >
            <Ionicons color="#abbbc2" name="people-outline" size={20} />
            <Text className="flex-1 text-on-surface">Bạn bè</Text>
            <Ionicons color="#6b7280" name="chevron-forward" size={18} />
          </Pressable>
          <View className="h-px bg-outline-variant" />
          <Pressable
            className="flex-row items-center gap-3 p-4 active:bg-surface-dim"
            onPress={confirmSignOut}
          >
            <Ionicons color="#eb5757" name="log-out-outline" size={20} />
            <Text className="flex-1 text-error-500">Đăng xuất</Text>
          </Pressable>
        </View>
      </ScrollView>

      <FormModal
        canSubmit={!!editName.trim()}
        error={error}
        isSubmitting={isSaving}
        onClose={() => setEditOpen(false)}
        onSubmit={saveName}
        submitLabel="Lưu"
        title="Chỉnh sửa tên"
        visible={editOpen}
      >
        <Field label="Tên hiển thị">
          <Input
            maxLength={60}
            onChangeText={setEditName}
            placeholder="Nhập tên của bạn..."
            value={editName}
          />
        </Field>
        <Field hint="Email không thể thay đổi." label="Email">
          <Input
            editable={false}
            style={{ opacity: 0.6 }}
            value={auth.currentUser?.email ?? ""}
          />
        </Field>
      </FormModal>
    </SafeAreaView>
  );
}
