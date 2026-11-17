import { useEffect, useState } from "react";

import {
  DateField,
  Field,
  Input,
  SingleChips,
  TimeField,
} from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/format";

import type { ActivityWithId, CreateActivityInput } from "@/types/firestore";
import type { ActivityType } from "@/types/trip";

const TYPES = (Object.keys(ACTIVITY_TYPE_CONFIG) as ActivityType[]).map(
  (k) => ({
    value: k,
    label: `${ACTIVITY_TYPE_CONFIG[k].icon} ${ACTIVITY_TYPE_CONFIG[k].label}`,
  })
);

interface Props {
  visible: boolean;
  defaultDate: string;
  minDate: string;
  maxDate: string;
  /** order mặc định cho hoạt động mới (cuối ngày) */
  nextOrder: (date: string) => number;
  initialData?: ActivityWithId | null;
  onSubmit: (input: CreateActivityInput) => Promise<unknown>;
  onClose: () => void;
}

export const ActivityFormModal = ({
  visible,
  defaultDate,
  minDate,
  maxDate,
  nextOrder,
  initialData,
  onSubmit,
  onClose,
}: Props) => {
  const isEdit = !!initialData;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<ActivityType>("sights");
  const [location, setLocation] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [note, setNote] = useState("");
  const [costRaw, setCostRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(initialData?.title ?? "");
    setDate(initialData?.date ?? defaultDate);
    setStartTime(initialData?.startTime ?? "");
    setEndTime(initialData?.endTime ?? "");
    setCategory(initialData?.category ?? "sights");
    setLocation(initialData?.location ?? "");
    setMapsUrl(initialData?.mapsUrl ?? "");
    setNote(initialData?.note ?? "");
    setCostRaw(initialData?.cost ? String(initialData.cost) : "");
    setError(null);
    setIsSubmitting(false);
  }, [visible, initialData, defaultDate]);

  const timeInvalid = !!startTime && !!endTime && endTime <= startTime;
  const canSubmit = !!title.trim() && !timeInvalid;

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        category,
        location: location.trim() || undefined,
        mapsUrl: mapsUrl.trim() || undefined,
        note: note.trim() || undefined,
        cost: costRaw ? Number(costRaw) : undefined,
        order:
          initialData && initialData.date === date
            ? initialData.order
            : nextOrder(date),
      });
      onClose();
    } catch {
      setError("Không thể lưu hoạt động. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      canSubmit={canSubmit}
      error={timeInvalid ? "Giờ kết thúc phải sau giờ bắt đầu" : error}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={isEdit ? "Lưu thay đổi" : "Thêm hoạt động"}
      title={isEdit ? "Chỉnh sửa hoạt động" : "Thêm hoạt động"}
      visible={visible}
    >
      <Field label="Tên hoạt động *">
        <Input
          onChangeText={setTitle}
          placeholder="VD: Tham quan chợ đêm"
          value={title}
        />
      </Field>
      <Field label="Ngày">
        <DateField
          max={maxDate}
          min={minDate}
          onChange={setDate}
          value={date}
        />
      </Field>
      <Field label="Giờ bắt đầu">
        <TimeField onChange={setStartTime} value={startTime} />
      </Field>
      <Field label="Giờ kết thúc">
        <TimeField onChange={setEndTime} value={endTime} />
      </Field>
      <Field label="Loại">
        <SingleChips onChange={setCategory} options={TYPES} value={category} />
      </Field>
      <Field label="Địa điểm">
        <Input
          onChangeText={setLocation}
          placeholder="Tùy chọn"
          value={location}
        />
      </Field>
      <Field label="Link Google Maps">
        <Input
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={setMapsUrl}
          placeholder="https://maps.google.com/..."
          value={mapsUrl}
        />
      </Field>
      <Field label="Chi phí (VNĐ)">
        <Input
          inputMode="numeric"
          onChangeText={(t) => setCostRaw(parseCurrencyInput(t))}
          placeholder="0"
          value={formatCurrencyInput(costRaw)}
        />
      </Field>
      <Field label="Ghi chú">
        <Input
          className="h-24 py-2"
          multiline
          onChangeText={setNote}
          placeholder="Tùy chọn"
          textAlignVertical="top"
          value={note}
        />
      </Field>
    </FormModal>
  );
};
