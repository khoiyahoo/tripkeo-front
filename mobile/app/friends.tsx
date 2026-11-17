import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Web hiện cũng chỉ có màn giữ chỗ cho Bạn bè — giữ nguyên để đồng bộ.
export default function FriendsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons color="#fff" name="arrow-back" size={24} />
        </Pressable>
        <Text className="font-bold text-on-surface text-xl">Bạn bè</Text>
      </View>
      <View className="px-4">
        <Text className="text-on-surface-variant">
          Quản lý danh sách bạn bè để dễ dàng mời vào chuyến đi
        </Text>
      </View>
      <View className="m-4 flex-1 items-center justify-center rounded-2xl border border-outline-variant border-dashed">
        <Ionicons color="#6b7280" name="people-outline" size={56} />
        <Text className="mt-4 font-semibold text-lg text-on-surface">
          Tính năng đang phát triển
        </Text>
        <Text className="mt-1 max-w-xs text-center text-on-surface-variant text-sm">
          Sắp tới bạn có thể kết bạn, xem profile bạn bè và mời họ vào chuyến đi
          dễ dàng hơn.
        </Text>
      </View>
    </SafeAreaView>
  );
}
