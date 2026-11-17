import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";

import { Input } from "@/components/form/fields";
import { AuthorAvatar, REGION_LABELS } from "@/components/community/PostCard";
import { CloneModal } from "@/components/community/CloneModal";
import { GifPicker } from "@/components/community/GifPicker";
import { PostFormModal } from "@/components/community/PostFormModal";
import { Card } from "@/components/trip/ui";
import {
  ACTIVITY_TYPE_CONFIG,
  EXPENSE_CATEGORY_CONFIG,
} from "@/constants/trip";
import { usePost } from "@/hooks/usePost";
import { uploadToCloudinary } from "@/services/cloudinaryService";
import { cloneItineraryToTrip } from "@/services/cloneService";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, formatDate } from "@/utils/format";
import { timeAgo } from "@/utils/timeAgo";

import type { Comment } from "@/types/community";

const SCREEN_W = Dimensions.get("window").width;

const markdownStyles = {
  body: { color: "#abbbc2", fontSize: 15, lineHeight: 22 },
  heading1: { color: "#fff", fontSize: 22, marginVertical: 6 },
  heading2: { color: "#fff", fontSize: 19, marginVertical: 6 },
  heading3: { color: "#fff", fontSize: 17, marginVertical: 4 },
  strong: { color: "#fff" },
  link: { color: "#ff6b6b" },
  code_inline: { backgroundColor: "#2d303e", color: "#fff" },
  blockquote: { backgroundColor: "#2d303e", borderColor: "#eb5757" },
  bullet_list_icon: { color: "#abbbc2" },
};

const findActivityConfig = (category: string) =>
  ACTIVITY_TYPE_CONFIG[category as keyof typeof ACTIVITY_TYPE_CONFIG] ??
  Object.values(ACTIVITY_TYPE_CONFIG).find((c) => c.label === category) ??
  ACTIVITY_TYPE_CONFIG.other;

const CommentItem = ({
  comment,
  isOwner,
  onUpdate,
  onDelete,
}: {
  comment: Comment;
  isOwner: boolean;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onUpdate(comment.id, text.trim());
      setEditing(false);
    } catch {
      Alert.alert("Lỗi", "Không thể sửa bình luận");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert("Xóa bình luận", "Bạn có chắc muốn xóa bình luận này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          onDelete(comment.id).catch(() =>
            Alert.alert("Lỗi", "Không thể xóa bình luận")
          ),
      },
    ]);

  return (
    <View className="flex-row gap-2.5">
      <AuthorAvatar
        name={comment.authorName}
        size={32}
        url={comment.authorPhotoURL}
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-on-surface text-sm">
            {comment.authorName}
          </Text>
          <Text className="text-on-surface-variant text-xs">
            {timeAgo(comment.createdAt)}
            {comment.isEdited ? " (đã sửa)" : ""}
          </Text>
        </View>
        {editing ? (
          <View className="mt-1 gap-2">
            <Input
              className="h-20 py-2"
              multiline
              onChangeText={setText}
              textAlignVertical="top"
              value={text}
            />
            <View className="flex-row gap-3">
              <Pressable disabled={saving || !text.trim()} onPress={save}>
                <Text className="font-medium text-primary-400 text-sm">
                  {saving ? "Đang lưu..." : "Lưu"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setText(comment.content);
                  setEditing(false);
                }}
              >
                <Text className="text-on-surface-variant text-sm">Hủy</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {comment.content ? (
              <Text className="mt-0.5 text-on-surface text-sm">
                {comment.content}
              </Text>
            ) : null}
            {comment.imageUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: comment.imageUrl }}
                style={{
                  width: 180,
                  height: 140,
                  borderRadius: 10,
                  marginTop: 6,
                }}
              />
            ) : null}
            {comment.gifUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: comment.gifUrl }}
                style={{
                  width: 180,
                  height: 140,
                  borderRadius: 10,
                  marginTop: 6,
                }}
              />
            ) : null}
            {isOwner && (
              <View className="mt-1 flex-row gap-4">
                <Pressable onPress={() => setEditing(true)}>
                  <Text className="text-on-surface-variant text-xs">Sửa</Text>
                </Pressable>
                <Pressable onPress={confirmDelete}>
                  <Text className="text-error-500 text-xs">Xóa</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    post,
    isLoading,
    comments,
    isLiked,
    handleToggleLike,
    handleAddComment,
    handleDeleteComment,
    handleUpdateComment,
    handleDeletePost,
    refetchPost,
  } = usePost(postId);

  const [cloneOpen, setCloneOpen] = useState(false);
  const [commentImage, setCommentImage] = useState<{
    uri: string;
    mimeType?: string;
  } | null>(null);
  const [commentGif, setCommentGif] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isAuthor = !!user && post?.authorId === user.uid;

  const pickCommentImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (res.canceled) return;
    setCommentGif(null);
    setCommentImage({
      uri: res.assets[0].uri,
      mimeType: res.assets[0].mimeType,
    });
  };

  const canSendComment = !!commentText.trim() || !!commentImage || !!commentGif;

  const sendComment = async () => {
    const text = commentText.trim();
    if (!canSendComment) return;
    setSending(true);
    try {
      const imageUrl = commentImage
        ? await uploadToCloudinary(commentImage.uri, commentImage.mimeType)
        : null;
      await handleAddComment(text, imageUrl, commentGif);
      setCommentText("");
      setCommentImage(null);
      setCommentGif(null);
      setGifOpen(false);
    } catch {
      Alert.alert("Lỗi", "Không thể gửi bình luận");
    } finally {
      setSending(false);
    }
  };

  const confirmDeletePost = () =>
    Alert.alert("Xóa bài viết", "Bạn có chắc muốn xóa bài viết này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          handleDeletePost()
            .then(() => router.back())
            .catch(() => Alert.alert("Lỗi", "Không thể xóa bài viết")),
      },
    ]);

  const Header = (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Pressable hitSlop={8} onPress={() => router.back()}>
        <Ionicons color="#fff" name="arrow-back" size={24} />
      </Pressable>
      <Text className="flex-1 font-semibold text-lg text-on-surface">
        Bài viết
      </Text>
      {isAuthor && (
        <>
          <Pressable hitSlop={8} onPress={() => setEditOpen(true)}>
            <Ionicons color="#eb5757" name="create-outline" size={22} />
          </Pressable>
          <Pressable hitSlop={8} onPress={confirmDeletePost}>
            <Ionicons color="#eb5757" name="trash-outline" size={22} />
          </Pressable>
        </>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <Stack.Screen options={{ headerShown: false }} />
        {Header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#eb5757" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <Stack.Screen options={{ headerShown: false }} />
        {Header}
        <View className="flex-1 items-center justify-center">
          <Text className="text-on-surface-variant">
            Bài viết không tồn tại.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const exp = post.expenseSnapshot;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      {Header}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center gap-3">
            <AuthorAvatar
              name={post.authorName}
              size={40}
              url={post.authorPhotoURL}
            />
            <View className="flex-1">
              <Text className="font-semibold text-on-surface">
                {post.authorName}
              </Text>
              <Text className="text-on-surface-variant text-xs">
                {timeAgo(post.createdAt)}
                {post.isEdited ? " (đã sửa)" : ""}
              </Text>
            </View>
            <View className="rounded-full border border-outline-variant px-2.5 py-1">
              <Text className="text-on-surface-variant text-xs">
                {REGION_LABELS[post.region] ?? post.region}
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="font-bold text-on-surface text-xl">
              📍 {post.title}
            </Text>
            {post.destination ? (
              <Text className="text-on-surface-variant text-sm">
                {post.destination}
              </Text>
            ) : null}
            <Markdown style={markdownStyles}>{post.content}</Markdown>
          </View>

          {post.imageUrls.length > 0 && (
            <ScrollView
              contentContainerStyle={{ gap: 8 }}
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
            >
              {post.imageUrls.map((url) => (
                <Image
                  contentFit="cover"
                  key={url}
                  source={{ uri: url }}
                  style={{
                    width: SCREEN_W * 0.75,
                    height: 200,
                    borderRadius: 14,
                  }}
                />
              ))}
            </ScrollView>
          )}

          <View className="flex-row items-center gap-6">
            <Pressable
              className="flex-row items-center gap-1.5"
              hitSlop={8}
              onPress={() =>
                handleToggleLike().catch(() =>
                  Alert.alert("Lỗi", "Không thể thích bài viết")
                )
              }
            >
              <Ionicons
                color={isLiked ? "#eb5757" : "#abbbc2"}
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
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
            <View className="flex-row items-center gap-1.5">
              <Ionicons color="#abbbc2" name="chatbubble-outline" size={20} />
              <Text className="text-on-surface-variant text-sm">
                {post.commentCount}
              </Text>
            </View>
          </View>

          {post.itinerarySnapshot && post.itinerarySnapshot.length > 0 && (
            <Card title="Lịch trình">
              {post.itinerarySnapshot.map((day) => (
                <View className="gap-2" key={day.date}>
                  <Text className="font-semibold text-primary-400 text-sm">
                    Ngày {day.dayNumber} · {formatDate(day.date)}
                  </Text>
                  {day.activities.map((a, i) => {
                    const cfg = findActivityConfig(a.category);
                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: snapshot items have no id
                      <View className="flex-row items-start gap-2.5" key={i}>
                        <View
                          className={cn(
                            "h-8 w-8 items-center justify-center rounded-lg",
                            cfg.bgColor
                          )}
                        >
                          <Text>{cfg.icon}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-on-surface text-sm">
                            {a.title}
                          </Text>
                          <Text className="text-on-surface-variant text-xs">
                            {a.startTime ?? "—:—"}
                            {a.location ? ` · ${a.location}` : ""}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </Card>
          )}

          {post.itinerarySnapshot &&
            post.itinerarySnapshot.length > 0 &&
            user && (
              <Pressable
                className="h-11 items-center justify-center rounded-xl border border-primary-500 active:opacity-70"
                onPress={() => setCloneOpen(true)}
              >
                <Text className="font-semibold text-primary-500">
                  📋 Clone lịch trình
                </Text>
              </Pressable>
            )}

          {exp && (
            <Card title="Tổng quan chi phí">
              <View className="flex-row gap-3">
                <View className="flex-1 items-center rounded-xl bg-surface-dim p-3">
                  <Text className="text-on-surface-variant text-xs">
                    Tổng chi
                  </Text>
                  <Text
                    className="font-bold text-tertiary-500"
                    numberOfLines={1}
                  >
                    {formatCurrency(exp.total)}
                  </Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-surface-dim p-3">
                  <Text className="text-on-surface-variant text-xs">
                    Số người
                  </Text>
                  <Text className="font-bold text-on-surface">
                    {exp.memberCount}
                  </Text>
                </View>
                <View className="flex-1 items-center rounded-xl bg-surface-dim p-3">
                  <Text className="text-on-surface-variant text-xs">
                    Mỗi người
                  </Text>
                  <Text
                    className="font-bold text-primary-500"
                    numberOfLines={1}
                  >
                    {formatCurrency(exp.perPerson)}
                  </Text>
                </View>
              </View>

              {Object.entries(exp.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const cfg =
                    EXPENSE_CATEGORY_CONFIG[
                      cat as keyof typeof EXPENSE_CATEGORY_CONFIG
                    ] ?? EXPENSE_CATEGORY_CONFIG.other;
                  const pct = exp.total > 0 ? (amount / exp.total) * 100 : 0;
                  return (
                    <View className="gap-1.5" key={cat}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              cfg.dotColor
                            )}
                          />
                          <Text className="text-on-surface text-sm">
                            {cfg.label}
                          </Text>
                        </View>
                        <Text className="font-medium text-on-surface text-sm">
                          {formatCurrency(amount)}
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-surface-dim">
                        <View
                          className={cn("h-full rounded-full", cfg.dotColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </View>
                    </View>
                  );
                })}

              {exp.items && exp.items.length > 0 && (
                <View className="gap-2">
                  <Text className="font-medium text-on-surface-variant text-xs">
                    Các khoản chi
                  </Text>
                  {exp.items.map((it, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: snapshot items have no id
                    <View
                      className="flex-row items-center justify-between gap-3"
                      key={i}
                    >
                      <Text
                        className="flex-1 text-on-surface text-sm"
                        numberOfLines={1}
                      >
                        {it.description}
                      </Text>
                      <Text className="text-on-surface text-sm">
                        {formatCurrency(it.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {exp.byDay && exp.byDay.length > 0 && (
                <View className="gap-2">
                  <Text className="font-medium text-on-surface-variant text-xs">
                    Theo ngày
                  </Text>
                  {exp.byDay.map((d) => (
                    <View
                      className="flex-row items-center justify-between"
                      key={d.date}
                    >
                      <Text className="text-on-surface-variant text-sm">
                        {formatDate(d.date)}
                      </Text>
                      <Text className="text-on-surface text-sm">
                        {formatCurrency(d.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          <Card title={`Bình luận (${post.commentCount})`}>
            {comments.length === 0 ? (
              <Text className="text-on-surface-variant text-sm">
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </Text>
            ) : (
              comments.map((c) => (
                <CommentItem
                  comment={c}
                  isOwner={user?.uid === c.authorId}
                  key={c.id}
                  onDelete={handleDeleteComment}
                  onUpdate={handleUpdateComment}
                />
              ))
            )}
          </Card>
        </ScrollView>

        {gifOpen && (
          <GifPicker
            onSelect={(url) => {
              setCommentGif(url);
              setCommentImage(null);
              setGifOpen(false);
            }}
          />
        )}
        {(commentImage || commentGif) && (
          <View className="flex-row items-center gap-2 border-outline-variant border-t px-3 pt-2">
            <Image
              contentFit="cover"
              source={{ uri: commentImage?.uri ?? commentGif ?? "" }}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
            <Pressable
              onPress={() => {
                setCommentImage(null);
                setCommentGif(null);
              }}
            >
              <Text className="text-error-500 text-xs">Bỏ đính kèm</Text>
            </Pressable>
          </View>
        )}
        <View className="flex-row items-center gap-2 border-outline-variant border-t p-3">
          <Pressable
            hitSlop={6}
            onPress={() =>
              pickCommentImage().catch(() =>
                Alert.alert("Lỗi", "Không thể mở thư viện ảnh")
              )
            }
          >
            <Ionicons color="#abbbc2" name="image-outline" size={22} />
          </Pressable>
          <Pressable hitSlop={6} onPress={() => setGifOpen((v) => !v)}>
            <Ionicons
              color={gifOpen ? "#eb5757" : "#abbbc2"}
              name="happy-outline"
              size={22}
            />
          </Pressable>
          <Input
            className="flex-1"
            onChangeText={setCommentText}
            onSubmitEditing={sendComment}
            placeholder="Viết bình luận..."
            returnKeyType="send"
            value={commentText}
          />
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-xl bg-primary-500 active:bg-primary-600"
            disabled={sending || !canSendComment}
            onPress={sendComment}
            style={{ opacity: sending || !canSendComment ? 0.5 : 1 }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons color="#fff" name="send" size={18} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {user && post.itinerarySnapshot && post.itinerarySnapshot.length > 0 && (
        <CloneModal
          dayCount={post.itinerarySnapshot.length}
          defaultName={post.title}
          onClose={() => setCloneOpen(false)}
          onConfirm={async (name, startDate, cover) => {
            const newTripId = await cloneItineraryToTrip(
              post,
              user,
              name,
              startDate,
              cover
            );
            router.replace({
              pathname: "/trips/[tripId]",
              params: { tripId: newTripId },
            });
          }}
          visible={cloneOpen}
        />
      )}

      {isAuthor && (
        <PostFormModal
          editPost={post}
          onClose={() => setEditOpen(false)}
          onSuccess={() => refetchPost()}
          trips={[]}
          visible={editOpen}
        />
      )}
    </SafeAreaView>
  );
}
