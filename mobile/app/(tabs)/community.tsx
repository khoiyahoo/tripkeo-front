import { Ionicons } from "@expo/vector-icons";
import { runBlocking } from "@/lib/blocking";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Input } from "@/components/form/fields";
import { PostCard } from "@/components/community/PostCard";
import { PostFormModal } from "@/components/community/PostFormModal";
import { useCommunity } from "@/hooks/useCommunity";
import { useTrips } from "@/hooks/useTrips";
import { cn } from "@/lib/utils";
import { deletePost } from "@/services/communityService";
import { useAuthStore } from "@/stores/authStore";

import type { CommunityPost, CommunityRegion } from "@/types/community";

const REGION_FILTERS: { value: CommunityRegion | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "north", label: "Miền Bắc" },
  { value: "central", label: "Miền Trung" },
  { value: "south", label: "Miền Nam" },
  { value: "other", label: "Khác" },
];

export default function CommunityScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { trips } = useTrips();
  const {
    posts,
    isLoading,
    hasMore,
    likedIds,
    loadMore,
    handleToggleLike,
    region,
    setRegion,
    refetch,
  } = useCommunity();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityPost | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.destination.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
      )
    : posts;

  const confirmDelete = (post: CommunityPost) =>
    Alert.alert("Xóa bài viết", "Bạn có chắc muốn xóa bài viết này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          runBlocking(() => deletePost(post.id))
            .then(() => refetch())
            .catch(() => Alert.alert("Lỗi", "Không thể xóa bài viết")),
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="gap-3 px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-bold text-2xl text-on-surface">
              🌍 Cộng đồng
            </Text>
            <Text className="text-on-surface-variant text-sm">
              Chia sẻ và khám phá các chuyến đi thú vị
            </Text>
          </View>
          <Pressable
            className="h-10 flex-row items-center gap-1.5 rounded-xl bg-primary-500 px-4 active:bg-primary-600"
            onPress={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Ionicons color="#fff" name="create-outline" size={16} />
            <Text className="font-semibold text-sm text-white">Chia sẻ</Text>
          </Pressable>
        </View>
        <Input
          onChangeText={setSearch}
          placeholder="Tìm kiếm điểm đến, tiêu đề..."
          value={search}
        />
        <ScrollView
          contentContainerStyle={{ gap: 8 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {REGION_FILTERS.map((f) => {
            const active = region === f.value;
            return (
              <Pressable
                className={cn(
                  "rounded-full border px-3.5 py-1.5",
                  active
                    ? "border-primary-500 bg-primary-500"
                    : "border-outline-variant"
                )}
                key={f.value}
                onPress={() => setRegion(f.value)}
              >
                <Text
                  className={cn(
                    "font-medium text-sm",
                    active ? "text-white" : "text-on-surface"
                  )}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#eb5757" size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}
          data={filtered}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-lg text-on-surface-variant">
                Chưa có bài viết nào.
              </Text>
              <Text className="mt-1 text-on-surface-variant text-sm">
                Hãy là người đầu tiên chia sẻ chuyến đi!
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && !q ? (
              <Pressable
                className="h-11 items-center justify-center self-center rounded-xl border border-outline-variant px-6"
                onPress={loadMore}
              >
                <Text className="text-on-surface">Xem thêm</Text>
              </Pressable>
            ) : undefined
          }
          renderItem={({ item }) => (
            <PostCard
              currentUserId={user?.uid}
              isLiked={likedIds.has(item.id)}
              onDelete={confirmDelete}
              onEdit={(p) => {
                setEditing(p);
                setFormOpen(true);
              }}
              onLike={() => handleToggleLike(item.id)}
              onView={() =>
                router.push({
                  pathname: "/community/[postId]",
                  params: { postId: item.id },
                })
              }
              post={item}
            />
          )}
        />
      )}

      <PostFormModal
        editPost={editing}
        onClose={() => setFormOpen(false)}
        onSuccess={(postId, isEdit) => {
          refetch();
          if (!isEdit)
            router.push({
              pathname: "/community/[postId]",
              params: { postId },
            });
        }}
        trips={trips}
        visible={formOpen}
      />
    </SafeAreaView>
  );
}
