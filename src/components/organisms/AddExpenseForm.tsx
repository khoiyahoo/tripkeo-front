import { Loader2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/format";

import type {
  CreateExpenseInput,
  ExpensePaidByType,
  ExpenseWithId,
  TripMemberInfo,
} from "@/types/firestore";
import type { ExpenseCategory } from "@/types/trip";

// Convert Firestore Timestamp or string → YYYY-MM-DD for <input type="date">
const toDateInputStr = (ts: unknown): string => {
  if (ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate().toISOString().split("T")[0];
  }
  if (typeof ts === "string") return ts;
  return new Date().toISOString().split("T")[0];
};

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "food", label: "Ăn uống" },
  { value: "transport", label: "Di chuyển" },
  { value: "stay", label: "Chỗ ở" },
  { value: "ticket", label: "Vé tham quan" },
  { value: "shopping", label: "Mua sắm" },
  { value: "entertainment", label: "Giải trí" },
  { value: "other", label: "Khác" },
];

interface AddExpenseFormProps {
  members: Record<string, TripMemberInfo>;
  /** Pre-fill for edit mode. When provided, title and submit text change. */
  initialData?: ExpenseWithId;
  onSubmit: (input: CreateExpenseInput) => Promise<unknown>;
  onCancel: () => void;
}

export const AddExpenseForm = ({
  members,
  initialData,
  onSubmit,
  onCancel,
}: AddExpenseFormProps) => {
  const isEditMode = !!initialData;
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [amountRaw, setAmountRaw] = useState(
    initialData ? String(initialData.amount) : ""
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    initialData?.category ?? "food"
  );
  const [date, setDate] = useState(
    initialData
      ? toDateInputStr(initialData.date)
      : new Date().toISOString().split("T")[0]
  );
  const [paidByType, setPaidByType] = useState<ExpensePaidByType>(
    initialData?.paidBy.type ?? "group_fund"
  );
  const [selectedMemberId, setSelectedMemberId] = useState(
    initialData?.paidBy.userId ?? ""
  );
  const [note, setNote] = useState(initialData?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const memberIds = Object.keys(members);
  const [splitBetween, setSplitBetween] = useState<string[]>(
    initialData?.splitBetween ?? memberIds
  );

  const needsMemberSelect = paidByType === "member_shared";

  const toggleMember = (uid: string) => {
    setSplitBetween((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amountRaw) return;
    if (needsMemberSelect && !selectedMemberId) return;

    setIsSubmitting(true);

    const paidBy =
      paidByType === "group_fund"
        ? {
            type: "group_fund" as const,
            userId: null,
            displayName: "Quỹ chung",
          }
        : {
            type: paidByType,
            userId: selectedMemberId,
            displayName: members[selectedMemberId]?.displayName ?? "",
          };

    const finalSplit = splitBetween;

    await onSubmit({
      description: description.trim(),
      amount: Number(amountRaw),
      category,
      date,
      paidBy,
      splitBetween: finalSplit,
      note: note.trim() || undefined,
    });
    setIsSubmitting(false);
    onCancel();
  };

  return (
    <Card className="border border-primary-200 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-on-surface text-sm">
            {isEditMode ? "Chỉnh sửa chi phí" : "Thêm chi phí"}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Description */}
        <div>
          <Label>Mô tả *</Label>
          <Input
            placeholder="VD: Vé máy bay"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Số tiền *</Label>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={formatCurrencyInput(amountRaw)}
              onChange={(e) => setAmountRaw(parseCurrencyInput(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Ngày</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <Label>Danh mục</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment type (radio) */}
        <div>
          <Label>Nguồn chi *</Label>
          <RadioGroup
            value={paidByType}
            onValueChange={(v) => setPaidByType(v as ExpensePaidByType)}
            className="mt-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="group_fund" id="pbt-group" />
              <Label htmlFor="pbt-group" className="cursor-pointer font-normal">
                💰 Quỹ chung
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="member_shared" id="pbt-shared" />
              <Label
                htmlFor="pbt-shared"
                className="cursor-pointer font-normal"
              >
                🤝 Thành viên trả hộ
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Member select (for member_shared) */}
        {needsMemberSelect && (
          <div>
            <Label>Ai trả hộ?</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Chọn thành viên" />
              </SelectTrigger>
              <SelectContent>
                {memberIds.map((uid) => (
                  <SelectItem key={uid} value={uid}>
                    {members[uid]?.displayName ?? uid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Split between (checkboxes) */}
        <div>
          <Label>Chia cho (bỏ check nếu không tham gia):</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {memberIds.map((uid) => (
              // biome-ignore lint/a11y/noLabelWithoutControl: <explanation>
              <label
                key={uid}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <Checkbox
                  checked={splitBetween.includes(uid)}
                  onCheckedChange={() => toggleMember(uid)}
                />
                <span className="text-on-surface text-sm">
                  {members[uid]?.displayName ?? uid}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-on-surface-variant text-xs">
            {splitBetween.length}/{memberIds.length} thành viên
          </p>
        </div>

        {/* Note */}
        <div>
          <Label>Ghi chú</Label>
          <Input
            placeholder="Tùy chọn"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={
            !description.trim() ||
            !amountRaw ||
            (needsMemberSelect && !selectedMemberId) ||
            splitBetween.length === 0 ||
            isSubmitting
          }
          className="w-full"
          size="sm"
        >
          {isSubmitting && (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          )}
          {isEditMode ? "Lưu thay đổi" : "Thêm chi phí"}
        </Button>
      </CardContent>
    </Card>
  );
};
