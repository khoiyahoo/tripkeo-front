import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import {
  DateField,
  Field,
  Input,
  Chips,
  SingleChips,
} from "@/components/form/fields";
import { FormModal } from "@/components/form/FormModal";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/format";

import type {
  CreateExpenseInput,
  ExpenseWithId,
  SplitMethod,
} from "@/types/firestore";
import type { ExpenseCategory } from "@/types/trip";

const toDateStr = (ts: unknown): string => {
  if (ts && typeof (ts as { toDate: () => Date }).toDate === "function")
    return (ts as { toDate: () => Date }).toDate().toISOString().split("T")[0];
  if (typeof ts === "string") return ts;
  return new Date().toISOString().split("T")[0];
};

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "food", label: "Ăn uống" },
  { value: "transport", label: "Di chuyển" },
  { value: "stay", label: "Chỗ ở" },
  { value: "ticket", label: "Vé tham quan" },
  { value: "shopping", label: "Mua sắm" },
  { value: "entertainment", label: "Giải trí" },
  { value: "other", label: "Khác" },
];

const SPLIT_METHODS: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Đều" },
  { value: "percentage", label: "Phần trăm" },
  { value: "amount", label: "Số tiền" },
  { value: "shares", label: "Phần" },
];

interface Props {
  visible: boolean;
  costMembers: string[];
  initialData?: ExpenseWithId | null;
  onSubmit: (input: CreateExpenseInput) => Promise<unknown>;
  onClose: () => void;
}

export const ExpenseFormModal = ({
  visible,
  costMembers,
  initialData,
  onSubmit,
  onClose,
}: Props) => {
  const isEdit = !!initialData;
  const [description, setDescription] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidBy, setPaidBy] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nạp lại state mỗi lần mở form (thêm mới hoặc sửa một khoản khác).
  useEffect(() => {
    if (!visible) return;
    setDescription(initialData?.description ?? "");
    setAmountRaw(initialData ? String(initialData.amount) : "");
    setCategory(initialData?.category ?? "food");
    setDate(
      initialData
        ? toDateStr(initialData.date)
        : new Date().toISOString().split("T")[0]
    );
    setPaidBy(initialData?.paidBy ?? "");
    setSplitMethod(initialData?.splitMethod ?? "equal");
    setSplitBetween(initialData?.splitBetween ?? costMembers);
    setSplitDetails(initialData?.splitDetails ?? {});
    setNote(initialData?.note ?? "");
    setError(null);
    setIsSubmitting(false);
  }, [visible, initialData, costMembers]);

  const amount = Number(amountRaw) || 0;
  const sumDetails = splitBetween.reduce(
    (s, n) => s + (splitDetails[n] ?? 0),
    0
  );

  const splitValid = (() => {
    if (splitBetween.length === 0) return false;
    if (splitMethod === "percentage") return Math.abs(sumDetails - 100) < 0.01;
    if (splitMethod === "amount")
      return amount > 0 && Math.abs(sumDetails - amount) < 1;
    if (splitMethod === "shares")
      return splitBetween.every((n) => (splitDetails[n] ?? 1) >= 1);
    return true;
  })();

  const canSubmit =
    !!description.trim() && amount > 0 && !!paidBy && splitValid;

  const toggleMember = (name: string) =>
    setSplitBetween((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        description: description.trim(),
        amount,
        category,
        date,
        paidBy,
        splitBetween,
        splitMethod,
        splitDetails: splitMethod !== "equal" ? splitDetails : undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch {
      setError("Không thể lưu chi tiêu. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  const members = costMembers.map((n) => ({ value: n, label: n }));

  return (
    <FormModal
      canSubmit={canSubmit}
      error={error}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={isEdit ? "Lưu thay đổi" : "Thêm chi tiêu"}
      title={isEdit ? "Chỉnh sửa chi tiêu" : "Thêm chi tiêu"}
      visible={visible}
    >
      <Field label="Tiêu đề *">
        <Input
          onChangeText={setDescription}
          placeholder="VD: Bữa sáng ở quán X"
          value={description}
        />
      </Field>
      <Field label="Số tiền (VNĐ) *">
        <Input
          inputMode="numeric"
          onChangeText={(t) => setAmountRaw(parseCurrencyInput(t))}
          placeholder="0"
          value={formatCurrencyInput(amountRaw)}
        />
      </Field>
      <Field label="Ngày">
        <DateField onChange={setDate} value={date} />
      </Field>
      <Field label="Người trả *">
        <SingleChips onChange={setPaidBy} options={members} value={paidBy} />
      </Field>
      <Field label="Người tham gia">
        <Chips
          onToggle={toggleMember}
          options={members}
          selected={splitBetween}
        />
      </Field>
      <Field label="Cách chia">
        <SingleChips
          onChange={setSplitMethod}
          options={SPLIT_METHODS}
          value={splitMethod}
        />
      </Field>

      {splitMethod !== "equal" && splitBetween.length > 0 && (
        <View className="gap-2 rounded-xl border border-outline-variant bg-surface-dim/50 p-3">
          {splitBetween.map((name) => {
            const v = splitDetails[name];
            const display =
              typeof v === "number" && !Number.isNaN(v) && v !== 0
                ? splitMethod === "amount"
                  ? formatCurrencyInput(String(v))
                  : String(v)
                : "";
            return (
              <View className="flex-row items-center gap-2" key={name}>
                <Text
                  className="w-24 text-on-surface text-sm"
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <Input
                  className="h-9 flex-1 text-sm"
                  inputMode="numeric"
                  onChangeText={(t) =>
                    setSplitDetails((p) => ({
                      ...p,
                      [name]: Number(parseCurrencyInput(t)) || 0,
                    }))
                  }
                  placeholder={splitMethod === "shares" ? "1" : "0"}
                  value={display}
                />
                <Text className="w-9 text-on-surface-variant text-xs">
                  {splitMethod === "percentage"
                    ? "%"
                    : splitMethod === "amount"
                      ? "đ"
                      : "phần"}
                </Text>
              </View>
            );
          })}
          {splitMethod !== "shares" && (
            <Text
              className={
                splitValid
                  ? "text-success-500 text-xs"
                  : "text-error-500 text-xs"
              }
            >
              {splitMethod === "percentage"
                ? `Tổng: ${sumDetails}% ${splitValid ? "✓" : "(cần 100%)"}`
                : `Tổng: ${sumDetails.toLocaleString("vi-VN")}đ ${
                    splitValid ? "✓" : `/ ${amount.toLocaleString("vi-VN")}đ`
                  }`}
            </Text>
          )}
        </View>
      )}

      <Field label="Danh mục">
        <SingleChips
          onChange={setCategory}
          options={CATEGORIES}
          value={category}
        />
      </Field>
      <Field label="Ghi chú">
        <Input onChangeText={setNote} placeholder="Tùy chọn" value={note} />
      </Field>
    </FormModal>
  );
};
