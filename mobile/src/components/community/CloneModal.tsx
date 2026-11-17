import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { DateField, Field, Input } from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import {
  addDays,
  generateCoverSeed,
  getTodayDateStr,
  picsumCoverUrl,
} from "@/utils/cover";
import { formatDate } from "@/utils/format";

interface Props {
  visible: boolean;
  defaultName: string;
  dayCount: number;
  onClose: () => void;
  onConfirm: (
    tripName: string,
    startDate: string,
    coverImage: string
  ) => Promise<void>;
}

export const CloneModal = ({
  visible,
  defaultName,
  dayCount,
  onClose,
  onConfirm,
}: Props) => {
  const today = getTodayDateStr();
  const [name, setName] = useState(defaultName);
  const [startDate, setStartDate] = useState(today);
  const [seed, setSeed] = useState(generateCoverSeed());
  const [customUrl, setCustomUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(defaultName);
    setStartDate(today);
    setSeed(generateCoverSeed());
    setCustomUrl("");
    setError(null);
    setIsCloning(false);
  }, [visible, defaultName, today]);

  const cover = customUrl.trim() || picsumCoverUrl(seed);

  const submit = async () => {
    setIsCloning(true);
    setError(null);
    try {
      await onConfirm(name.trim(), startDate, cover);
      onClose();
    } catch {
      setIsCloning(false);
      setError("Không thể tạo chuyến đi. Vui lòng thử lại.");
    }
  };

  return (
    <FormModal
      canSubmit={!!name.trim()}
      error={error}
      isSubmitting={isCloning}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Tạo chuyến đi mới"
      title="📋 Clone lịch trình"
      visible={visible}
    >
      <Text className="text-on-surface-variant text-sm">
        Tạo chuyến đi mới từ lịch trình bài viết này? Sẽ clone {dayCount} ngày
        lịch trình. Không clone chi phí và thành viên.
      </Text>
      <Field label="Tên chuyến đi">
        <Input
          onChangeText={setName}
          placeholder="Tên chuyến đi mới..."
          value={name}
        />
      </Field>
      <Field label="Ngày bắt đầu">
        <DateField min={today} onChange={setStartDate} value={startDate} />
        <Text className="text-on-surface-variant text-xs">
          Kết thúc: {formatDate(addDays(startDate, dayCount - 1))}
        </Text>
      </Field>
      <Field label="Ảnh bìa chuyến đi">
        <View className="overflow-hidden rounded-xl">
          <Image
            contentFit="cover"
            source={{ uri: cover }}
            style={{ width: "100%", height: 112 }}
          />
        </View>
        <Pressable
          className="mt-1 h-9 flex-row items-center justify-center gap-2 self-start rounded-xl border border-outline-variant px-3"
          onPress={() => {
            setSeed(generateCoverSeed());
            setCustomUrl("");
          }}
        >
          <Ionicons color="#abbbc2" name="refresh" size={14} />
          <Text className="text-on-surface text-xs">Đổi ảnh</Text>
        </Pressable>
        <Input
          autoCapitalize="none"
          className="h-9 text-xs"
          keyboardType="url"
          onChangeText={setCustomUrl}
          placeholder="Hoặc nhập URL ảnh bìa..."
          value={customUrl}
        />
      </Field>
    </FormModal>
  );
};
