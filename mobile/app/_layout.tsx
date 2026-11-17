import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BlockingOverlay } from "@/components/BlockingOverlay";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";

const RootNavigator = () => {
  useFirebaseAuth();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);

  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator color="#eb5757" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trips/[tripId]" />
        <Stack.Screen name="trips/create" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="community/[postId]" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <RootNavigator />
          <BlockingOverlay />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
