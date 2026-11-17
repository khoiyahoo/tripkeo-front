import { Ionicons } from "@expo/vector-icons";
import { LONG_TIMEOUT_MS, runBlocking } from "@/lib/blocking";
import { Stack, useRouter } from "expo-router";
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

import { Card } from "@/components/trip/ui";
import {
  deleteFirebaseAccount,
  linkWithGoogle,
  reauthenticateWithGoogle,
  unlinkFromGoogle,
} from "@/services/authService";
import { deleteUserData } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";

const Row = ({ title, value }: { title: string; value: string }) => (
  <View>
    <Text className="font-medium text-on-surface text-sm">{title}</Text>
    <Text className="text-on-surface-variant text-xs">{value}</Text>
  </View>
);

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  useAuthStore((s) => s.userVersion); // re-render khi đổi provider

  const [isLinking, setIsLinking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const google = user?.providerData.find((p) => p.providerId === "google.com");
  const isGoogleLinked = !!google;
  const hasMultipleProviders = (user?.providerData.length ?? 0) > 1;

  const link = async () => {
    setIsLinking(true);
    try {
      if (await linkWithGoogle()) {
        refreshUser();
        Alert.alert("Thành công", "Đã kết nối tài khoản Google");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể kết nối Google. Vui lòng thử lại.");
    } finally {
      setIsLinking(false);
    }
  };

  const unlink = async () => {
    if (!hasMultipleProviders) {
      Alert.alert(
        "Không thể ngắt kết nối",
        "Đây là phương thức đăng nhập duy nhất của bạn."
      );
      return;
    }
    setIsLinking(true);
    try {
      await runBlocking(() => unlinkFromGoogle());
      refreshUser();
      Alert.alert("Thành công", "Đã ngắt kết nối tài khoản Google");
    } catch {
      Alert.alert("Lỗi", "Không thể ngắt kết nối. Vui lòng thử lại.");
    } finally {
      setIsLinking(false);
    }
  };

  const runDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      // 1) Dọn dữ liệu Firestore khi phiên còn hợp lệ, 2) xóa tài khoản Auth
      await runBlocking(
        () => deleteUserData(user.uid, user.email ?? ""),
        LONG_TIMEOUT_MS
      );
      try {
        await runBlocking(() => deleteFirebaseAccount());
      } catch (err) {
        const code =
          err instanceof Error && "code" in err
            ? (err as { code: string }).code
            : null;
        if (code !== "auth/requires-recent-login") throw err;
        // Phiên cũ: đăng nhập lại rồi xóa tiếp
        if (!(await reauthenticateWithGoogle())) {
          setIsDeleting(false);
          return;
        }
        await runBlocking(() => deleteFirebaseAccount());
      }
      // Auth state đổi -> app tự quay về màn đăng nhập
    } catch {
      setIsDeleting(false);
      Alert.alert(
        "Lỗi",
        "Không thể xóa tài khoản. Vui lòng đăng nhập lại và thử lại."
      );
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      "Xóa tài khoản",
      "Hành động này KHÔNG THỂ hoàn tác.\n\nTất cả dữ liệu của bạn sẽ bị xóa: thông tin cá nhân, các chuyến đi bạn tạo và dữ liệu chi tiêu liên quan.",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa tài khoản", style: "destructive", onPress: runDelete },
      ]
    );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons color="#fff" name="arrow-back" size={24} />
        </Pressable>
        <Text className="font-bold text-on-surface text-xl">Cài đặt</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card title="Ngôn ngữ & Khu vực">
          <Row title="Ngôn ngữ" value="Tiếng Việt" />
          <View className="h-px bg-outline-variant" />
          <Row title="Đơn vị tiền tệ" value="VNĐ (₫)" />
        </Card>

        <Card title="Tài khoản liên kết">
          <View className="flex-row items-center gap-3">
            <Ionicons color="#4285F4" name="logo-google" size={22} />
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-medium text-on-surface text-sm">
                  Google
                </Text>
                <View
                  className={
                    isGoogleLinked
                      ? "rounded-full bg-success-50 px-2 py-0.5"
                      : "rounded-full bg-surface-dim px-2 py-0.5"
                  }
                >
                  <Text
                    className={
                      isGoogleLinked
                        ? "text-success-700 text-xs"
                        : "text-on-surface-variant text-xs"
                    }
                  >
                    {isGoogleLinked ? "Đã kết nối" : "Chưa kết nối"}
                  </Text>
                </View>
              </View>
              {isGoogleLinked && google?.email ? (
                <Text className="text-on-surface-variant text-xs">
                  {google.email}
                </Text>
              ) : null}
              {isGoogleLinked && !hasMultipleProviders ? (
                <Text className="text-on-surface-variant text-xs italic">
                  Đây là phương thức đăng nhập duy nhất của bạn.
                </Text>
              ) : null}
            </View>
            <Pressable
              className="h-9 flex-row items-center gap-1.5 rounded-xl border border-outline-variant px-3"
              disabled={isLinking || (isGoogleLinked && !hasMultipleProviders)}
              onPress={isGoogleLinked ? unlink : link}
              style={{
                opacity:
                  isLinking || (isGoogleLinked && !hasMultipleProviders)
                    ? 0.5
                    : 1,
              }}
            >
              {isLinking && <ActivityIndicator color="#abbbc2" size="small" />}
              <Text className="text-on-surface text-sm">
                {isGoogleLinked ? "Ngắt kết nối" : "Kết nối"}
              </Text>
            </Pressable>
          </View>
        </Card>

        <View className="gap-3 rounded-2xl border border-error-500/30 bg-surface-card p-4">
          <Text className="font-semibold text-base text-error-500">
            Vùng nguy hiểm
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Row
                title="Xóa tài khoản"
                value="Xóa vĩnh viễn tất cả dữ liệu của bạn"
              />
            </View>
            <Pressable
              className="h-9 flex-row items-center gap-1.5 rounded-xl bg-error-500 px-3 active:bg-error-600"
              disabled={isDeleting}
              onPress={confirmDelete}
              style={{ opacity: isDeleting ? 0.6 : 1 }}
            >
              {isDeleting && <ActivityIndicator color="#fff" size="small" />}
              <Text className="font-medium text-sm text-white">Xóa</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
