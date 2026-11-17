import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { Field, Input, SingleChips } from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import { uploadImages } from "@/services/cloudinaryService";
import { createPost, updatePost } from "@/services/communityService";
import { fetchExpensesForTrip } from "@/services/expenseService";
import { fetchActivitiesForTrip } from "@/services/itineraryService";
import { useAuthStore } from "@/stores/authStore";
import { getTripStatus, timestampToDateStr } from "@/utils/format";

import type {
  CommunityPost,
  CommunityRegion,
  CreatePostInput,
  ExpenseSnapshot,
  ItineraryDaySnapshot,
  UpdatePostInput,
} from "@/types/community";
import type { TripWithId } from "@/types/firestore";

const REGIONS: { value: CommunityRegion; label: string }[] = [
  { value: "north", label: "Miền Bắc" },
  { value: "central", label: "Miền Trung" },
  { value: "south", label: "Miền Nam" },
  { value: "other", label: "Khác" },
];

const MAX_IMAGES = 10;
const NO_TRIP = "__none__";

interface Props {
  visible: boolean;
  trips: TripWithId[];
  editPost?: CommunityPost | null;
  onClose: () => void;
  onSuccess: (postId: string, isEdit: boolean) => void;
}

interface LocalImage {
  uri: string;
  mimeType?: string;
}

export const PostFormModal = ({
  visible,
  trips,
  editPost,
  onClose,
  onSuccess,
}: Props) => {
  const user = useAuthStore((s) => s.user);
  const isEdit = !!editPost;

  const [tripSel, setTripSel] = useState<string>(NO_TRIP);
  const tripId = tripSel === NO_TRIP ? "" : tripSel;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState<CommunityRegion>("central");
  const [includeItinerary, setIncludeItinerary] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<LocalImage[]>([]);
  const [itineraryWarning, setItineraryWarning] = useState<string | null>(null);
  const [expenseWarning, setExpenseWarning] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedTrips = trips.filter(
    (t) => getTripStatus(t.startDate, t.endDate) === "completed"
  );

  // Nạp form mỗi lần mở
  useEffect(() => {
    if (!visible) return;
    setTitle(editPost?.title ?? "");
    setContent(editPost?.content ?? "");
    setRegion(editPost?.region ?? "central");
    setIncludeItinerary(editPost?.includeItinerary ?? true);
    setIncludeExpenses(editPost?.includeExpenses ?? true);
    setExistingUrls(editPost?.imageUrls ?? []);
    setNewImages([]);
    setTripSel(editPost?.tripId ?? NO_TRIP);
    setError(null);
    setIsSubmitting(false);
  }, [visible, editPost]);

  // Chọn chuyến: mỗi ngày phải có ≥1 hoạt động, và phải có ≥1 chi tiêu mới được chia sẻ
  useEffect(() => {
    if (!tripId) {
      setItineraryWarning(null);
      setExpenseWarning(null);
      return;
    }
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;
    let cancelled = false;
    setIsValidating(true);
    Promise.all([fetchActivitiesForTrip(tripId), fetchExpensesForTrip(tripId)])
      .then(([acts, exps]) => {
        if (cancelled) return;
        const start = trip.startDate.toDate();
        const end = trip.endDate.toDate();
        const dayMs = 24 * 60 * 60 * 1000;
        const totalDays =
          Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
        const actDates = new Set(acts.map((a) => a.date));
        const missing: number[] = [];
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(start.getTime() + i * dayMs)
            .toISOString()
            .split("T")[0];
          if (!actDates.has(d)) missing.push(i + 1);
        }
        if (missing.length > 0) {
          const preview = missing
            .slice(0, 3)
            .map((d) => `Ngày ${d}`)
            .join(", ");
          const more =
            missing.length > 3 ? ` và ${missing.length - 3} ngày khác` : "";
          setItineraryWarning(`${preview}${more} chưa có hoạt động nào.`);
          setIncludeItinerary(false);
        } else {
          setItineraryWarning(null);
        }
        if (exps.length === 0) {
          setExpenseWarning("Chuyến đi chưa có chi phí nào.");
          setIncludeExpenses(false);
        } else {
          setExpenseWarning(null);
        }
      })
      .catch(() => {
        setItineraryWarning(null);
        setExpenseWarning(null);
      })
      .finally(() => !cancelled && setIsValidating(false));
    return () => {
      cancelled = true;
    };
  }, [tripId, trips]);

  const pickImages = async () => {
    const remaining = MAX_IMAGES - existingUrls.length - newImages.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (res.canceled) return;
    setNewImages((prev) =>
      [
        ...prev,
        ...res.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType })),
      ].slice(0, MAX_IMAGES - existingUrls.length)
    );
  };

  const buildItinerarySnapshot = async (): Promise<
    ItineraryDaySnapshot[] | undefined
  > => {
    if (!includeItinerary || !tripId) return undefined;
    const acts = await fetchActivitiesForTrip(tripId);
    const byDate: Record<string, typeof acts> = {};
    for (const a of acts) (byDate[a.date] ??= []).push(a);
    if (Object.keys(byDate).length === 0) return editPost?.itinerarySnapshot;
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayActs], i) => ({
        dayNumber: i + 1,
        date,
        activities: [...dayActs]
          .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
          .map((a) => ({
            title: a.title,
            startTime: a.startTime,
            category: a.category,
            location: a.location,
          })),
      }));
  };

  const buildExpenseSnapshot = async (): Promise<
    ExpenseSnapshot | undefined
  > => {
    if (!includeExpenses || !tripId) return undefined;
    const exps = await fetchExpensesForTrip(tripId);
    if (!exps.length) return editPost?.expenseSnapshot;
    const trip = trips.find((t) => t.id === tripId);
    const currency =
      trip?.currency ?? editPost?.expenseSnapshot?.currency ?? "VND";
    const memberCount = trip
      ? Object.values(trip.members).filter(
          (m) => !m.status || m.status === "active"
        ).length
      : (editPost?.expenseSnapshot?.memberCount ?? 1);
    const total = exps.reduce((s, e) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    const byDayMap: Record<string, number> = {};
    for (const e of exps) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
      const d = timestampToDateStr(e.date);
      byDayMap[d] = (byDayMap[d] ?? 0) + e.amount;
    }
    return {
      total,
      currency,
      memberCount,
      perPerson: memberCount > 0 ? Math.round(total / memberCount) : total,
      byCategory,
      items: exps.map((e) => ({
        description: e.description,
        amount: e.amount,
        category: e.category as string,
      })),
      byDay: Object.entries(byDayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({ date, amount })),
    };
  };

  const canSubmit = !!title.trim() && !!content.trim() && !isValidating;

  const submit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const uploaded =
        newImages.length > 0 ? await uploadImages(newImages) : [];
      const imageUrls = [...existingUrls, ...uploaded];
      const destination =
        trips.find((t) => t.id === tripId)?.destination ??
        editPost?.destination ??
        "";
      const itinerarySnapshot = await buildItinerarySnapshot();
      const expenseSnapshot = await buildExpenseSnapshot();

      if (isEdit && editPost) {
        const input: UpdatePostInput = {
          title: title.trim(),
          content: content.trim(),
          tripId: tripId || undefined,
          destination,
          region,
          imageUrls,
          includeItinerary,
          includeExpenses,
          itinerarySnapshot,
          expenseSnapshot,
        };
        await updatePost(editPost.id, input);
        onSuccess(editPost.id, true);
      } else {
        const input: CreatePostInput = {
          title: title.trim(),
          content: content.trim(),
          tripId: tripId || undefined,
          destination,
          region,
          imageUrls,
          includeItinerary,
          includeExpenses,
          itinerarySnapshot,
          expenseSnapshot,
        };
        const postId = await createPost(
          input,
          user.uid,
          user.displayName ?? "Ẩn danh",
          user.photoURL ?? ""
        );
        onSuccess(postId, false);
      }
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError(
        `Không thể ${isEdit ? "cập nhật" : "đăng"} bài. ${err instanceof Error ? err.message : ""}`
      );
    }
  };

  const tripOptions = [
    { value: NO_TRIP, label: "Không liên kết" },
    ...completedTrips.map((t) => ({
      value: t.id,
      label: `${t.name} · ${t.destination}`,
    })),
  ];
  // Khi sửa bài của chuyến không còn "completed" trong danh sách, giữ lại để không mất liên kết
  if (
    editPost?.tripId &&
    !tripOptions.some((o) => o.value === editPost.tripId)
  ) {
    tripOptions.push({ value: editPost.tripId, label: "Chuyến đã liên kết" });
  }

  const totalImages = existingUrls.length + newImages.length;

  return (
    <FormModal
      canSubmit={canSubmit}
      error={error}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={isEdit ? "Lưu thay đổi" : "Đăng bài"}
      title={isEdit ? "✏️ Chỉnh sửa bài viết" : "✍️ Chia sẻ chuyến đi"}
      visible={visible}
    >
      <Field label="Chuyến đi đã kết thúc (tuỳ chọn)">
        <SingleChips
          onChange={setTripSel}
          options={tripOptions}
          value={tripSel}
        />
        {isValidating && (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="#eb5757" size="small" />
            <Text className="text-on-surface-variant text-xs">
              Đang kiểm tra chuyến đi...
            </Text>
          </View>
        )}
      </Field>

      <Field label="Tiêu đề *">
        <Input
          onChangeText={setTitle}
          placeholder="VD: 4 ngày ở Đà Nẵng"
          value={title}
        />
      </Field>

      <Field
        hint="Hỗ trợ Markdown: **đậm**, *nghiêng*, # tiêu đề, - danh sách."
        label="Nội dung *"
      >
        <Input
          className="h-40 py-2"
          multiline
          onChangeText={setContent}
          placeholder="Chia sẻ cảm nhận về chuyến đi..."
          textAlignVertical="top"
          value={content}
        />
      </Field>

      <Field label="Khu vực">
        <SingleChips onChange={setRegion} options={REGIONS} value={region} />
      </Field>

      {tripId ? (
        <View className="gap-3 rounded-xl border border-outline-variant bg-surface-card p-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="font-medium text-on-surface text-sm">
                Chia sẻ lịch trình
              </Text>
              {itineraryWarning ? (
                <Text className="text-warning-500 text-xs">
                  {itineraryWarning}
                </Text>
              ) : null}
            </View>
            <Switch
              disabled={!!itineraryWarning}
              onValueChange={setIncludeItinerary}
              value={includeItinerary}
            />
          </View>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="font-medium text-on-surface text-sm">
                Chia sẻ tổng quan chi phí
              </Text>
              {expenseWarning ? (
                <Text className="text-warning-500 text-xs">
                  {expenseWarning}
                </Text>
              ) : null}
            </View>
            <Switch
              disabled={!!expenseWarning}
              onValueChange={setIncludeExpenses}
              value={includeExpenses}
            />
          </View>
        </View>
      ) : null}

      <Field label={`Ảnh (${totalImages}/${MAX_IMAGES})`}>
        <ScrollView
          contentContainerStyle={{ gap: 8 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {existingUrls.map((url, i) => (
            <View key={url}>
              <Image
                source={{ uri: url }}
                style={{ width: 80, height: 80, borderRadius: 10 }}
              />
              <Pressable
                className="absolute top-1 right-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                onPress={() =>
                  setExistingUrls((p) => p.filter((_, idx) => idx !== i))
                }
              >
                <Ionicons color="#fff" name="close" size={12} />
              </Pressable>
            </View>
          ))}
          {newImages.map((img, i) => (
            <View key={img.uri}>
              <Image
                source={{ uri: img.uri }}
                style={{ width: 80, height: 80, borderRadius: 10 }}
              />
              <Pressable
                className="absolute top-1 right-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                onPress={() =>
                  setNewImages((p) => p.filter((_, idx) => idx !== i))
                }
              >
                <Ionicons color="#fff" name="close" size={12} />
              </Pressable>
            </View>
          ))}
          {totalImages < MAX_IMAGES && (
            <Pressable
              className="h-20 w-20 items-center justify-center rounded-xl border border-outline-variant border-dashed"
              onPress={() =>
                pickImages().catch(() =>
                  Alert.alert("Lỗi", "Không thể mở thư viện ảnh")
                )
              }
            >
              <Ionicons color="#abbbc2" name="image-outline" size={24} />
            </Pressable>
          )}
        </ScrollView>
      </Field>
    </FormModal>
  );
};
