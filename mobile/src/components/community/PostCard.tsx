import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Alert, Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { timeAgo } from "@/utils/timeAgo";

import type { CommunityPost } from "@/types/community";

export const REGION_LABELS: Record<string, string> = {
  north: "Miền Bắc",
  central: "Miền Trung",
  south: "Miền Nam",
  other: "Khác",
};

export const AuthorAvatar = ({
  url,
  name,
  size = 32,
}: {
  url?: string;
  name: string;
  size?: number;
}) =>
  url ? (
    <Image
      source={{ uri: url }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#3a3d4a",
      }}
    />
  ) : (
    <View
      className="items-center justify-center bg-primary-100"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-semibold text-primary-800 text-xs">
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );

interface Props {
  post: CommunityPost;
  isLiked: boolean;
  onLike: () => void;
  onView: () => void;
  currentUserId?: string;
  onEdit?: (post: CommunityPost) => void;
  onDelete?: (post: CommunityPost) => void;
}

export const PostCard = ({
  post,
  isLiked,
  onLike,
  onView,
  currentUserId,
  onEdit,
  onDelete,
}: Props) => {
  const isOwner = currentUserId === post.authorId;

  const openMenu = () =>
    Alert.alert("Bài viết", undefined, [
      ...(onEdit ? [{ text: "Chỉnh sửa", onPress: () => onEdit(post) }] : []),
      ...(onDelete
        ? [
            {
              text: "Xóa bài viết",
              style: "destructive" as const,
              onPress: () => onDelete(post),
            },
          ]
        : []),
      { text: "Hủy", style: "cancel" as const },
    ]);

  return (
    <Pressable
      className="overflow-hidden rounded-2xl bg-surface-card active:opacity-90"
      onPress={onView}
    >
      <View className="flex-row items-start justify-between gap-3 p-4 pb-2">
        <View className="flex-1 flex-row items-center gap-2">
          <AuthorAvatar name={post.authorName} url={post.authorPhotoURL} />
          <View className="flex-1">
            <Text
              className="font-semibold text-on-surface text-sm"
              numberOfLines={1}
            >
              {post.authorName}
            </Text>
            <Text className="text-on-surface-variant text-xs">
              {timeAgo(post.createdAt)}
              {post.isEdited ? " (đã sửa)" : ""}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="rounded-full border border-outline-variant px-2 py-0.5">
            <Text className="text-on-surface-variant text-xs">
              {REGION_LABELS[post.region] ?? post.region}
            </Text>
          </View>
          {isOwner && (onEdit || onDelete) && (
            <Pressable hitSlop={8} onPress={openMenu}>
              <Ionicons color="#abbbc2" name="ellipsis-vertical" size={18} />
            </Pressable>
          )}
        </View>
      </View>

      <View className="px-4 pt-1 pb-2">
        <Text className="font-bold text-base text-on-surface">
          📍 {post.title}
        </Text>
        {post.content ? (
          <Text
            className="mt-1 text-on-surface-variant text-sm"
            numberOfLines={2}
          >
            {post.content}
          </Text>
        ) : null}
      </View>

      {post.imageUrls.length > 0 && (
        <View className="flex-row gap-1.5 px-4 pb-2">
          {post.imageUrls.slice(0, 3).map((url, i) => (
            <View
              className="h-20 flex-1 overflow-hidden rounded-lg bg-secondary-800"
              key={url}
            >
              <Image
                contentFit="cover"
                source={{ uri: url }}
                style={{ width: "100%", height: "100%" }}
              />
              {i === 2 && post.imageUrls.length > 3 && (
                <View className="absolute inset-0 items-center justify-center bg-black/50">
                  <Text className="font-bold text-sm text-white">
                    +{post.imageUrls.length - 3}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {post.expenseSnapshot && (
        <View className="mx-4 mb-2 flex-row flex-wrap items-center gap-x-2 rounded-lg bg-secondary-800/50 px-3 py-2">
          <Ionicons color="#abbbc2" name="people-outline" size={12} />
          <Text className="text-on-surface-variant text-xs">
            {post.expenseSnapshot.memberCount} người ·
          </Text>
          <Text className="font-semibold text-tertiary-500 text-xs">
            ~{formatCurrency(post.expenseSnapshot.perPerson)}/người
          </Text>
          <Text className="text-on-surface-variant text-xs">
            · Tổng {formatCurrency(post.expenseSnapshot.total)}
          </Text>
        </View>
      )}

      <View className="flex-row items-center gap-5 border-outline-variant border-t px-4 py-2.5">
        <Pressable
          className="flex-row items-center gap-1"
          hitSlop={8}
          onPress={onLike}
        >
          <Ionicons
            color={isLiked ? "#eb5757" : "#abbbc2"}
            name={isLiked ? "heart" : "heart-outline"}
            size={18}
          />
          <Text
            className={cn(
              "text-sm",
              isLiked ? "text-primary-500" : "text-on-surface-variant"
            )}
          >
            {post.likeCount}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Ionicons color="#abbbc2" name="chatbubble-outline" size={17} />
          <Text className="text-on-surface-variant text-sm">
            {post.commentCount}
          </Text>
        </View>
        {post.cloneCount > 0 && (
          <View className="flex-row items-center gap-1">
            <Ionicons color="#abbbc2" name="copy-outline" size={16} />
            <Text className="text-on-surface-variant text-sm">
              {post.cloneCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};
