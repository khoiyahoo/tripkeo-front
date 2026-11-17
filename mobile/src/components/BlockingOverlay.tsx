import { ActivityIndicator, Text, View } from "react-native";

import { useLoadingStore } from "@/stores/loadingStore";

/** Lớp phủ toàn màn hình: chặn mọi chạm và hiện vòng loading. */
export const LoadingCover = ({
  label = "Đang xử lý...",
}: {
  label?: string;
}) => (
  <View
    className="absolute inset-0 items-center justify-center bg-black/60"
    pointerEvents="auto"
    style={{ zIndex: 9999, elevation: 9999 }}
  >
    <View className="items-center gap-3 rounded-2xl bg-surface-card px-8 py-6">
      <ActivityIndicator color="#eb5757" size="large" />
      <Text className="font-medium text-on-surface text-sm">{label}</Text>
    </View>
  </View>
);

/** Gắn một lần ở gốc app; hiện khi có tác vụ CRUD đang chạy qua runBlocking. */
export const BlockingOverlay = () => {
  const pending = useLoadingStore((s) => s.pending);
  if (pending === 0) return null;
  return <LoadingCover />;
};
