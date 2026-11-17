import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { DateField, Field, Input } from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import { computeDateChangeImpact, useEditTrip } from "@/hooks/useEditTrip";
import {
  generateCoverSeed,
  getTodayDateStr,
  picsumCoverUrl,
} from "@/utils/cover";
import {
  getStatusLabel,
  getTripStatus,
  timestampToDateStr,
} from "@/utils/format";

import type { DateChangeImpact } from "@/hooks/useEditTrip";
import type {
  ActivityWithId,
  CreateTripInput,
  TripWithId,
} from "@/types/firestore";

interface Props {
  visible: boolean;
  trip: TripWithId;
  activities: ActivityWithId[];
  onClose: () => void;
}

export const EditTripModal = ({
  visible,
  trip,
  activities,
  onClose,
}: Props) => {
  const { handleSave } = useEditTrip();
  const today = getTodayDateStr();
  const oldStart = timestampToDateStr(trip.startDate);
  const oldEnd = timestampToDateStr(trip.endDate);
  // Chuyến đã bắt đầu thì chỉ được sửa tên (giống web)
  const isLocked = oldStart <= today;
  const status = getTripStatus(trip.startDate, trip.endDate);

  const [name, setName] = useState(trip.name);
  const [destination, setDestination] = useState(trip.destination);
  const [coverImage, setCoverImage] = useState(trip.coverImage);
  const [startDate, setStartDate] = useState(oldStart);
  const [endDate, setEndDate] = useState(oldEnd);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(trip.name);
    setDestination(trip.destination);
    setCoverImage(trip.coverImage);
    setStartDate(oldStart);
    setEndDate(oldEnd);
    setIsSaving(false);
  }, [visible, trip, oldStart, oldEnd]);

  const dateError = isLocked
    ? null
    : startDate < today
      ? "Ngày bắt đầu không thể trong quá khứ"
      : startDate > endDate
        ? "Ngày kết thúc không thể trước ngày bắt đầu"
        : null;
  const valid = isLocked
    ? !!name.trim()
    : !!name.trim() && !!destination.trim() && !dateError;

  const doSave = async (
    input: Partial<CreateTripInput>,
    impact: DateChangeImpact
  ) => {
    setIsSaving(true);
    try {
      await handleSave(trip.id, input, impact);
      onClose();
    } catch {
      setIsSaving(false);
      Alert.alert("Lỗi", "Không thể lưu thay đổi. Vui lòng thử lại.");
    }
  };

  const submit = async () => {
    if (!valid) return;
    if (isLocked) {
      await doSave({ name: name.trim() }, { toUpdate: [], toDelete: [] });
      return;
    }

    const input: Partial<CreateTripInput> = {
      name: name.trim(),
      destination: destination.trim(),
      coverImage,
      startDate,
      endDate,
    };
    const datesChanged = startDate !== oldStart || endDate !== oldEnd;
    const impact: DateChangeImpact = datesChanged
      ? computeDateChangeImpact(
          activities,
          oldStart,
          oldEnd,
          startDate,
          endDate
        )
      : { toUpdate: [], toDelete: [] };

    if (impact.toDelete.length > 0) {
      Alert.alert(
        "Rút ngắn chuyến đi",
        `Việc rút ngắn sẽ xóa ${impact.toDelete.length} hoạt động ở những ngày bị cắt. Bạn có chắc chắn?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa và lưu",
            style: "destructive",
            onPress: () => doSave(input, impact),
          },
        ]
      );
      return;
    }
    await doSave(input, impact);
  };

  return (
    <FormModal
      canSubmit={valid}
      error={dateError}
      isSubmitting={isSaving}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Lưu thay đổi"
      title="Chỉnh sửa chuyến đi"
      visible={visible}
    >
      {isLocked && (
        <View className="flex-row items-start gap-2 rounded-xl bg-warning-50 px-4 py-3">
          <Ionicons
            color="#a97000"
            name="information-circle-outline"
            size={18}
          />
          <Text className="flex-1 text-sm text-warning-700">
            Chuyến đi {getStatusLabel(status).toLowerCase()}. Chỉ có thể chỉnh
            sửa tên chuyến đi.
          </Text>
        </View>
      )}

      {!isLocked && (
        <Field label="Ảnh bìa">
          <View className="overflow-hidden rounded-xl">
            <Image
              contentFit="cover"
              source={{ uri: coverImage }}
              style={{ width: "100%", height: 144 }}
            />
          </View>
          <Pressable
            className="mt-1 h-10 flex-row items-center justify-center gap-2 self-start rounded-xl border border-outline-variant px-4"
            onPress={() => setCoverImage(picsumCoverUrl(generateCoverSeed()))}
          >
            <Ionicons color="#abbbc2" name="refresh" size={16} />
            <Text className="font-medium text-on-surface text-sm">Đổi ảnh</Text>
          </Pressable>
        </Field>
      )}

      <Field label="Tên chuyến đi *">
        <Input onChangeText={setName} value={name} />
      </Field>

      {!isLocked && (
        <>
          <Field label="Điểm đến *">
            <Input onChangeText={setDestination} value={destination} />
          </Field>
          <Field label="Ngày bắt đầu *">
            <DateField
              min={today}
              onChange={(v) => {
                setStartDate(v);
                if (v > endDate) setEndDate(v);
              }}
              value={startDate}
            />
          </Field>
          <Field label="Ngày kết thúc *">
            <DateField
              min={startDate < today ? today : startDate}
              onChange={setEndDate}
              value={endDate}
            />
          </Field>
        </>
      )}
    </FormModal>
  );
};
