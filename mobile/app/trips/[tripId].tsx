import { Ionicons } from "@expo/vector-icons";
import { LONG_TIMEOUT_MS, runBlocking } from "@/lib/blocking";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BalanceView } from "@/components/trip/BalanceView";
import { ExpensesView } from "@/components/trip/ExpensesView";
import { ItineraryView } from "@/components/trip/ItineraryView";
import { EditTripModal } from "@/components/trip/EditTripModal";
import { MembersView } from "@/components/trip/MembersView";
import { buildItineraryHtml } from "@/utils/pdfExport";
import { useExpenses } from "@/hooks/useExpenses";
import { useItinerary } from "@/hooks/useItinerary";
import { useTripMembers } from "@/hooks/useMembers";
import { usePermissions } from "@/hooks/usePermissions";
import { useTrip } from "@/hooks/useTrip";
import { cn } from "@/lib/utils";
import {
  countPostsByTripId,
  deletePostsByTripId,
} from "@/services/communityService";
import {
  addCostMember,
  deleteTrip,
  removeCostMember,
} from "@/services/tripService";
import { useAuthStore } from "@/stores/authStore";
import {
  formatTimestampRange,
  generateDaysList,
  getStatusLabel,
  getTripStatus,
} from "@/utils/format";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { value: string; label: string; icon: IconName }[] = [
  { value: "itinerary", label: "Lịch trình", icon: "clipboard-outline" },
  { value: "members", label: "Thành viên", icon: "people-outline" },
  { value: "expenses", label: "Chi tiêu", icon: "cash-outline" },
  { value: "balance", label: "Số dư", icon: "scale-outline" },
];

const STATUS_BG = {
  upcoming: "bg-primary-500",
  ongoing: "bg-success-500",
  completed: "bg-secondary-400",
} as const;

export default function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("itinerary");
  const [editOpen, setEditOpen] = useState(false);

  const { trip, isLoading, error } = useTrip(tripId);
  const user = useAuthStore((s) => s.user);
  const {
    activities,
    isLoading: activitiesLoading,
    handleAddActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleBatchUpdateOrders,
  } = useItinerary(tripId);
  const {
    expenses,
    summary,
    balances,
    debts,
    isLoading: expensesLoading,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
  } = useExpenses(tripId, trip?.costMembers ?? []);
  const role = user ? trip?.members[user.uid]?.role : undefined;
  const perms = usePermissions(role);
  const members = useTripMembers(
    tripId,
    trip?.name ?? "",
    trip?.destination ?? ""
  );

  const pdfMeta = trip
    ? {
        title: trip.name,
        destination: trip.destination,
        startDate: new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(trip.startDate.toDate()),
        endDate: new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(trip.endDate.toDate()),
        memberNames: Object.values(trip.members)
          .filter((m) => (m.status ?? "active") === "active")
          .map((m) => m.displayName),
        memberCount: (trip.costMembers ?? []).length,
      }
    : null;

  const confirmDeleteTrip = async () => {
    if (!trip) return;
    let postCount = 0;
    try {
      postCount = await countPostsByTripId(tripId);
    } catch {
      // bỏ qua: chỉ để cảnh báo thêm
    }
    Alert.alert(
      "Xóa chuyến đi",
      `Bạn có chắc muốn xóa "${trip.name}"? Tất cả lịch trình, chi phí và thành viên sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.${
        postCount > 0
          ? `\n\nChuyến đi này có ${postCount} bài viết trong Community, các bài đó cũng sẽ bị xóa.`
          : ""
      }`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa chuyến đi",
          style: "destructive",
          onPress: async () => {
            try {
              await runBlocking(async () => {
                if (postCount > 0) await deletePostsByTripId(tripId);
                await deleteTrip(tripId);
              }, LONG_TIMEOUT_MS);
              router.replace("/trips");
            } catch {
              Alert.alert("Lỗi", "Không thể xóa chuyến đi. Vui lòng thử lại.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#eb5757" size="large" />
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-surface">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="font-medium text-on-surface">
          Không tìm thấy chuyến đi
        </Text>
        <Pressable
          className="rounded-xl border border-primary-500 px-5 py-2.5"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-primary-500">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const status = getTripStatus(trip.startDate, trip.endDate);
  const days = generateDaysList(trip.startDate, trip.endDate);

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen options={{ headerShown: false }} />
      {perms.isOwner && (
        <EditTripModal
          activities={activities}
          onClose={() => setEditOpen(false)}
          trip={trip}
          visible={editOpen}
        />
      )}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        stickyHeaderIndices={[1]}
      >
        <View className="h-64">
          <Image
            contentFit="cover"
            source={{ uri: trip.coverImage }}
            style={{ width: "100%", height: "100%" }}
          />
          <View className="absolute inset-0 bg-black/40" />
          <Pressable
            className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-black/30"
            onPress={() => router.back()}
            style={{ top: insets.top + 8 }}
          >
            <Ionicons color="#fff" name="arrow-back" size={22} />
          </Pressable>
          {perms.isOwner && (
            <Pressable
              className="absolute right-16 h-11 w-11 items-center justify-center rounded-full bg-black/30"
              onPress={() => setEditOpen(true)}
              style={{ top: insets.top + 8 }}
            >
              <Ionicons color="#fff" name="create-outline" size={20} />
            </Pressable>
          )}
          {perms.isOwner && (
            <Pressable
              className="absolute right-4 h-11 w-11 items-center justify-center rounded-full bg-black/30"
              onPress={confirmDeleteTrip}
              style={{ top: insets.top + 8 }}
            >
              <Ionicons color="#fff" name="trash-outline" size={20} />
            </Pressable>
          )}
          <View className="absolute right-4 bottom-4 left-4 gap-2">
            <View
              className={cn(
                "self-start rounded-full px-3 py-1",
                STATUS_BG[status]
              )}
            >
              <Text className="font-medium text-white text-xs">
                {getStatusLabel(status)}
              </Text>
            </View>
            <Text className="font-bold text-2xl text-white">{trip.name}</Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-1">
              <View className="flex-row items-center gap-1">
                <Ionicons color="#ffffffcc" name="location-outline" size={14} />
                <Text className="text-sm text-white/80">
                  {trip.destination}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons color="#ffffffcc" name="calendar-outline" size={14} />
                <Text className="text-sm text-white/80">
                  {formatTimestampRange(trip.startDate, trip.endDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-surface px-4 py-2">
          <View className="flex-row gap-1">
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <Pressable
                  className={cn(
                    "min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2",
                    active && "bg-primary-100"
                  )}
                  key={t.value}
                  onPress={() => setTab(t.value)}
                >
                  <Ionicons
                    color={active ? "#913535" : "#abbbc2"}
                    name={t.icon}
                    size={16}
                  />
                  {active && (
                    <Text className="font-medium text-primary-800 text-xs">
                      {t.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="px-4 pt-4">
          {tab === "itinerary" && (
            <ItineraryView
              activities={activities}
              canEdit={perms.canEditItinerary}
              days={days}
              isLoading={activitiesLoading}
              onAdd={handleAddActivity}
              onDelete={handleDeleteActivity}
              buildPdfHtml={() =>
                buildItineraryHtml(pdfMeta!, days, activities)
              }
              onReorder={handleBatchUpdateOrders}
              onUpdate={handleUpdateActivity}
            />
          )}
          {tab === "members" && (
            <MembersView
              balances={balances}
              costMembers={trip.costMembers ?? []}
              currentUserEmail={user?.email ?? ""}
              currentUserId={user?.uid}
              currentUserRole={role}
              expenses={expenses}
              members={trip.members}
              onAddCostMember={(name) =>
                runBlocking(() => addCostMember(tripId, name))
              }
              onCancelInvitation={members.handleCancelInvitation}
              onCheckDuplicate={members.handleCheckDuplicate}
              onCreateShareLink={members.handleCreateShareLink}
              onInviteMember={members.handleInviteMember}
              onLeaveTrip={members.handleLeaveTrip}
              onLeft={() => router.replace("/trips")}
              onRemoveCostMember={(name) =>
                runBlocking(() => removeCostMember(tripId, name))
              }
              onRemoveMember={members.handleRemoveMember}
              onUpdateRole={members.handleUpdateRole}
              tripEndDate={trip.endDate.toDate().toISOString().split("T")[0]}
            />
          )}
          {tab === "expenses" && (
            <ExpensesView
              balances={balances}
              canEdit={perms.canEditExpenses}
              debts={debts}
              meta={pdfMeta!}
              tripId={tripId}
              costMembers={trip.costMembers ?? []}
              expenses={expenses}
              isLoading={expensesLoading}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
              onUpdate={handleUpdateExpense}
              summary={summary}
            />
          )}
          {tab === "balance" && (
            <BalanceView
              balances={balances}
              canTogglePayment={perms.isOwner || perms.isTreasurer}
              debts={debts}
              expenses={expenses}
              meta={pdfMeta!}
              summary={summary}
              tripId={tripId}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
