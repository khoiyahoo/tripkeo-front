import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StatusDonut } from "@/components/StatusDonut";
import { Card } from "@/components/trip/ui";
import { useInvitations } from "@/hooks/useMembers";
import { useTrips } from "@/hooks/useTrips";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  formatDateRange,
  getCountdown,
  getStatusLabel,
  tripToCardData,
} from "@/utils/format";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const STATUS_BG = {
  upcoming: "bg-primary-500",
  ongoing: "bg-success-500",
  completed: "bg-secondary-400",
} as const;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { trips, isLoading } = useTrips();
  const {
    pendingInvitations,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = useInvitations();

  const cards = useMemo(() => trips.map(tripToCardData), [trips]);

  const stats = useMemo(() => {
    const now = Date.now();
    const nextTrip = trips
      .filter((t) => t.startDate.toDate().getTime() > now)
      .sort(
        (a, b) =>
          a.startDate.toDate().getTime() - b.startDate.toDate().getTime()
      )[0];
    const active = trips.filter(
      (t) =>
        t.startDate.toDate().getTime() <= now &&
        t.endDate.toDate().getTime() >= now
    ).length;
    const members = new Set(trips.flatMap((t) => Object.keys(t.members))).size;
    return { nextTrip, active, members };
  }, [trips]);

  const summary = {
    upcoming: cards.filter((c) => c.status === "upcoming").length,
    ongoing: cards.filter((c) => c.status === "ongoing").length,
    completed: cards.filter((c) => c.status === "completed").length,
  };
  const upcoming = cards.filter((c) => c.status === "upcoming").slice(0, 3);
  const countdownById = new Map(
    trips.map((t) => [t.id, getCountdown(t.startDate)])
  );

  const dateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const statItems: {
    icon: IconName;
    label: string;
    value: string;
    sub: string;
    color: string;
  }[] = [
    {
      icon: "map-outline",
      label: "Tổng chuyến đi",
      value: `${trips.length}`,
      sub: "Tất cả kế hoạch đã tạo",
      color: "#ff6b6b",
    },
    {
      icon: "time-outline",
      label: "Chuyến sắp tới",
      value: stats.nextTrip
        ? (getCountdown(stats.nextTrip.startDate) ?? "Sắp diễn ra")
        : "Chưa có",
      sub: stats.nextTrip?.destination ?? "Sẵn sàng tạo lịch trình mới",
      color: "#fbbf24",
    },
    {
      icon: "trending-up-outline",
      label: "Đang diễn ra",
      value: `${stats.active}`,
      sub:
        stats.active > 0
          ? "Đang theo dõi tiến độ"
          : "Không có chuyến đang hoạt động",
      color: "#50d1aa",
    },
    {
      icon: "people-outline",
      label: "Thành viên",
      value: `${stats.members}`,
      sub: "Bạn đồng hành trong hệ thống",
      color: "#c2ccd8",
    },
  ];

  const goTrip = (tripId: string) =>
    router.push({ pathname: "/trips/[tripId]", params: { tripId } });

  const accept = (inv: (typeof pendingInvitations)[number]) =>
    handleAcceptInvitation(inv.tripId, inv.id, inv.role).catch(() =>
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời. Vui lòng thử lại.")
    );
  const decline = (inv: (typeof pendingInvitations)[number]) =>
    handleDeclineInvitation(inv.tripId, inv.id).catch(() =>
      Alert.alert("Lỗi", "Không thể từ chối lời mời. Vui lòng thử lại.")
    );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="gap-1">
          <Text className="font-bold text-primary-500 text-sm tracking-widest">
            TRIPKEO
          </Text>
          <Text className="font-semibold text-2xl text-white">
            {user?.displayName ? `Xin chào, ${user.displayName}` : "Xin chào"}
          </Text>
          <Text className="text-on-surface-variant text-sm">{dateLabel}</Text>
        </View>

        <Pressable
          className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 active:bg-primary-600"
          onPress={() => router.push("/trips/create")}
        >
          <Ionicons color="#fff" name="add" size={20} />
          <Text className="font-semibold text-white">Tạo chuyến đi mới</Text>
        </Pressable>

        <View className="flex-row flex-wrap gap-3">
          {statItems.map((s) => (
            <View
              className="min-w-[46%] flex-1 gap-2 rounded-2xl bg-surface-card p-4"
              key={s.label}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-on-surface-variant text-xs">
                  {s.label}
                </Text>
                <Ionicons color={s.color} name={s.icon} size={18} />
              </View>
              <Text
                className="font-semibold text-2xl text-white"
                numberOfLines={1}
              >
                {s.value}
              </Text>
              <Text className="text-secondary-300 text-xs" numberOfLines={1}>
                {s.sub}
              </Text>
            </View>
          ))}
        </View>

        {pendingInvitations.length > 0 && (
          <Card title="Lời mời đang chờ">
            {pendingInvitations.map((inv) => (
              <View
                className="flex-row items-center gap-3 rounded-2xl border border-outline-variant p-3"
                key={inv.id}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15">
                  <Ionicons color="#ff6b6b" name="location-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-white" numberOfLines={1}>
                    {inv.tripName}
                  </Text>
                  <Text
                    className="text-on-surface-variant text-sm"
                    numberOfLines={1}
                  >
                    {inv.destination} · {inv.invitedByName}
                  </Text>
                </View>
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-lg border border-outline-variant"
                  onPress={() => decline(inv)}
                >
                  <Ionicons color="#abbbc2" name="close" size={18} />
                </Pressable>
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-lg bg-primary-500"
                  onPress={() => accept(inv)}
                >
                  <Ionicons color="#fff" name="checkmark" size={18} />
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        <View className="gap-3 rounded-2xl bg-surface-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-lg text-white">
              Báo cáo chuyến đi
            </Text>
            {cards.length > 0 && (
              <Pressable onPress={() => router.push("/trips")}>
                <Text className="text-primary-400 text-sm">Xem tất cả</Text>
              </Pressable>
            )}
          </View>
          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#eb5757" size="large" />
            </View>
          ) : cards.length === 0 ? (
            <View className="items-center py-8">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15">
                <Ionicons color="#ff6b6b" name="map-outline" size={26} />
              </View>
              <Text className="mt-4 font-semibold text-lg text-white">
                Chưa có chuyến đi nào
              </Text>
              <Text className="mt-1 text-center text-on-surface-variant text-sm">
                Tạo chuyến đi đầu tiên để theo dõi lịch trình, thành viên và chi
                phí.
              </Text>
            </View>
          ) : (
            cards.slice(0, 5).map((trip) => (
              <Pressable
                className="flex-row items-center gap-3 rounded-2xl bg-surface-dim/60 p-3 active:bg-surface-dim"
                key={trip.id}
                onPress={() => goTrip(trip.id)}
              >
                <Image
                  contentFit="cover"
                  source={{ uri: trip.coverImage }}
                  style={{ width: 56, height: 56, borderRadius: 16 }}
                />
                <View className="flex-1 gap-0.5">
                  <Text className="font-semibold text-white" numberOfLines={1}>
                    {trip.name}
                  </Text>
                  <Text
                    className="text-on-surface-variant text-sm"
                    numberOfLines={1}
                  >
                    {trip.destination}
                  </Text>
                  <Text className="text-secondary-300 text-xs">
                    {formatDateRange(trip.startDate, trip.endDate)} ·{" "}
                    {trip.memberCount} thành viên
                  </Text>
                </View>
                <View
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    STATUS_BG[trip.status]
                  )}
                >
                  <Text className="font-medium text-white text-xs">
                    {getStatusLabel(trip.status)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Card title="Trạng thái chuyến đi">
          <View className="items-center">
            <StatusDonut
              label="Trips"
              segments={[
                { value: summary.upcoming, color: "#eb5757" },
                { value: summary.ongoing, color: "#34d399" },
                { value: summary.completed, color: "#abbbc2" },
              ]}
              total={cards.length}
            />
          </View>
          {[
            {
              label: "Sắp diễn ra",
              value: summary.upcoming,
              dot: "bg-primary-500",
            },
            {
              label: "Đang diễn ra",
              value: summary.ongoing,
              dot: "bg-success-500",
            },
            {
              label: "Hoàn thành",
              value: summary.completed,
              dot: "bg-secondary-300",
            },
          ].map((it) => (
            <View
              className="flex-row items-center justify-between rounded-2xl bg-surface-dim px-4 py-3"
              key={it.label}
            >
              <View className="flex-row items-center gap-3">
                <View className={cn("h-2.5 w-2.5 rounded-full", it.dot)} />
                <Text className="text-on-surface-variant text-sm">
                  {it.label}
                </Text>
              </View>
              <Text className="font-medium text-white">{it.value}</Text>
            </View>
          ))}
        </Card>

        <Card title="Sắp khởi hành">
          {upcoming.length > 0 ? (
            upcoming.map((trip) => (
              <Pressable
                className="flex-row items-center gap-3 rounded-2xl bg-surface-dim p-3 active:opacity-80"
                key={trip.id}
                onPress={() => goTrip(trip.id)}
              >
                <Image
                  contentFit="cover"
                  source={{ uri: trip.coverImage }}
                  style={{ width: 52, height: 52, borderRadius: 14 }}
                />
                <View className="flex-1">
                  <Text className="font-medium text-white" numberOfLines={1}>
                    {trip.name}
                  </Text>
                  <Text
                    className="text-on-surface-variant text-sm"
                    numberOfLines={1}
                  >
                    {trip.destination}
                  </Text>
                </View>
                <View className="rounded-full bg-primary-500/15 px-3 py-1">
                  <Text className="font-medium text-primary-400 text-xs">
                    {countdownById.get(trip.id) ?? "Sắp tới"}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text className="text-on-surface-variant text-sm">
              Chưa có chuyến nào sắp khởi hành.
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
