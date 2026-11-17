import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TripCard } from "@/components/TripCard";
import { cn } from "@/lib/utils";
import { useTrips } from "@/hooks/useTrips";
import { getTripStatus, tripToCardData } from "@/utils/format";

type StatusFilter = "all" | "upcoming" | "ongoing" | "completed";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "upcoming", label: "Sắp đi" },
  { value: "ongoing", label: "Đang đi" },
  { value: "completed", label: "Đã đi" },
];

export default function TripsScreen() {
  const router = useRouter();
  const { trips, isLoading, error } = useTrips();
  const [filter, setFilter] = useState<StatusFilter>("all");

  const cards = useMemo(
    () =>
      trips
        .filter(
          (t) =>
            filter === "all" || getTripStatus(t.startDate, t.endDate) === filter
        )
        .map(tripToCardData),
    [trips, filter]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="gap-4 px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-2xl text-on-surface">Chuyến đi</Text>
          <Pressable
            className="h-10 flex-row items-center gap-1.5 rounded-xl bg-primary-500 px-4 active:bg-primary-600"
            onPress={() => router.push("/trips/create")}
          >
            <Ionicons color="#fff" name="add" size={18} />
            <Text className="font-semibold text-white text-sm">
              Tạo chuyến đi
            </Text>
          </Pressable>
        </View>
        <View className="flex-row gap-1 rounded-lg bg-surface-dim p-1">
          {STATUS_TABS.map((tab) => (
            <Pressable
              className={cn(
                "flex-1 items-center rounded-md py-1.5",
                filter === tab.value && "bg-primary-500"
              )}
              key={tab.value}
              onPress={() => setFilter(tab.value)}
            >
              <Text
                className={cn(
                  "font-medium text-sm",
                  filter === tab.value
                    ? "text-white"
                    : "text-on-surface-variant"
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#eb5757" size="large" />
          <Text className="text-on-surface-variant text-sm">
            Đang tải chuyến đi...
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}
          data={cards}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={
            <View className="items-center rounded-2xl border border-neutral-600 border-dashed py-16">
              <Ionicons color="#6b7280" name="location-outline" size={48} />
              <Text className="mt-4 font-semibold text-lg text-on-surface">
                {error ? "Không tải được chuyến đi" : "Không có chuyến đi nào"}
              </Text>
              {!error && (
                <Text className="mt-1 text-on-surface-variant text-sm">
                  Bấm "Tạo chuyến đi" để bắt đầu lên kế hoạch
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TripCard
              onPress={() =>
                router.push({
                  pathname: "/trips/[tripId]",
                  params: { tripId: item.id },
                })
              }
              trip={item}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
