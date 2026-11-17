import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { signInWithGoogle } from "@/services/authService";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="font-bold text-4xl text-primary-500">Tripkeo</Text>
        <Text className="mb-6 text-center text-on-surface-variant">
          Lên kế hoạch chuyến đi cùng bạn bè
        </Text>
        <Pressable
          className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 active:bg-primary-600 disabled:opacity-60"
          disabled={isLoading}
          onPress={onPress}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons color="#fff" name="logo-google" size={18} />
          )}
          <Text className="font-semibold text-white">Tiếp tục với Google</Text>
        </Pressable>
        {error && <Text className="text-red-500 text-sm">{error}</Text>}
      </View>
    </SafeAreaView>
  );
}
