import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";
import {
  formatDateRange,
  getStatusLabel,
  tripToCardData,
} from "@/utils/format";

type CardData = ReturnType<typeof tripToCardData>;

const STATUS_BG: Record<CardData["status"], string> = {
  upcoming: "bg-primary-500",
  ongoing: "bg-success-500",
  completed: "bg-secondary-400",
};

export const TripCard = ({
  trip,
  onPress,
}: {
  trip: CardData;
  onPress: () => void;
}) => (
  <Pressable
    className="overflow-hidden rounded-2xl bg-surface-card active:opacity-80"
    onPress={onPress}
  >
    <View className="h-44">
      <Image
        contentFit="cover"
        source={{ uri: trip.coverImage }}
        style={{ width: "100%", height: "100%" }}
      />
      <View
        className={cn(
          "absolute top-3 right-3 rounded-full px-3 py-1",
          STATUS_BG[trip.status]
        )}
      >
        <Text className="font-medium text-white text-xs">
          {getStatusLabel(trip.status)}
        </Text>
      </View>
    </View>
    <View className="gap-1.5 p-3">
      <Text
        className="font-semibold text-base text-on-surface"
        numberOfLines={1}
      >
        {trip.name}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Ionicons color="#abbbc2" name="location-outline" size={14} />
        <Text className="text-on-surface-variant text-sm" numberOfLines={1}>
          {trip.destination}
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Ionicons color="#abbbc2" name="calendar-outline" size={14} />
        <Text className="text-on-surface-variant text-sm">
          {formatDateRange(trip.startDate, trip.endDate)}
        </Text>
      </View>
      <View className="mt-2 flex-row items-center justify-between border-neutral-600 border-t pt-3">
        <View className="flex-row">
          {trip.memberAvatars.slice(0, 3).map((avatar, i) => (
            <Image
              // biome-ignore lint/suspicious/noArrayIndexKey: avatars may repeat
              key={`${trip.id}-${i}`}
              source={{ uri: avatar }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                marginLeft: i === 0 ? 0 : -8,
                borderWidth: 2,
                borderColor: "#252836",
                backgroundColor: "#3a3d4a",
              }}
            />
          ))}
          {trip.memberCount > 3 && (
            <View className="-ml-2 h-7 w-7 items-center justify-center rounded-full border-2 border-surface-card bg-neutral-700">
              <Text className="text-on-surface-variant text-xs">
                +{trip.memberCount - 3}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons color="#abbbc2" name="people-outline" size={14} />
          <Text className="text-on-surface-variant text-sm">
            {trip.memberCount}
          </Text>
        </View>
      </View>
    </View>
  </Pressable>
);
