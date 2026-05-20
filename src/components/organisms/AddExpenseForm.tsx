import { Loader2, X } from "lucide-react";
import { useState } from "react";

import { DatePicker } from "@/components/molecules/DatePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ExpenseWithId,
  SplitMethod,
} from "@/types/firestore";
import type { ExpenseCategory } from "@/types/trip";

const toDateInputStr = (ts: unknown): string => {
  if (ts && typeof (ts as { toDate: () => Date }).toDate === "function")
    return (ts as { toDate: () => Date }).toDate().toISOString().split("T")[0];
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

const SPLIT_METHODS: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Đều" },
  { value: "percentage", label: "Phần trăm" },
  { value: "amount", label: "Số tiền" },
  { value: "shares", label: "Phần" },
];

interface AddExpenseFormProps {
  /** Names from the trip's costMembers list */
  costMembers: string[];
  initialData?: ExpenseWithId;
  onSubmit: (input: CreateExpenseInput) => Promise<unknown>;
  onCancel: () => void;
}

export const AddExpenseForm = ({
  costMembers,
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
  const [paidBy, setPaidBy] = useState(initialData?.paidBy ?? "");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    initialData?.splitMethod ?? "equal"
  );
  const [splitBetween, setSplitBetween] = useState<string[]>(
    initialData?.splitBetween ?? costMembers
  );
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>(
    initialData?.splitDetails ?? {}
  );
  const [note, setNote] = useState(initialData?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amount = Number(amountRaw) || 0;

  const toggleMember = (name: string) => {
    setSplitBetween((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const updateDetail = (name: string, val: number) => {
    setSplitDetails((prev) => ({ ...prev, [name]: val }));
  };

  // Validation
  const splitValid = (() => {
    if (splitBetween.length === 0) return false;
    if (splitMethod === "equal") return true;
    if (splitMethod === "percentage") {
      const total = splitBetween.reduce(
        (s, name) => s + (splitDetails[name] ?? 0),
        0
      );
      return Math.abs(total - 100) < 0.01;
    }
    if (splitMethod === "amount") {
      const total = splitBetween.reduce(
        (s, name) => s + (splitDetails[name] ?? 0),
        0
      );
      return amount > 0 && Math.abs(total - amount) < 1;
    }
    if (splitMethod === "shares") {
      return splitBetween.every((name) => (splitDetails[name] ?? 1) >= 1);
    }
    return true;
  })();

  const canSubmit =
    description.trim() && amount > 0 && paidBy && splitValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
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
    setIsSubmitting(false);
    onCancel();
  };

  // Split detail helper text
  const splitSummary = (() => {
    if (splitMethod === "percentage") {
      const total = splitBetween.reduce(
        (s, name) => s + (splitDetails[name] ?? 0),
        0
      );
      return `Tổng: ${total}% ${Math.abs(total - 100) < 0.01 ? "✓" : `(cần 100%)`}`;
    }
    if (splitMethod === "amount") {
      const total = splitBetween.reduce(
        (s, name) => s + (splitDetails[name] ?? 0),
        0
      );
      return `Tổng: ${total.toLocaleString("vi-VN")}đ ${Math.abs(total - amount) < 1 ? "✓" : `/ ${amount.toLocaleString("vi-VN")}đ`}`;
    }
    return null;
  })();

  return (
    <Card className="border border-primary-200 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-on-surface text-sm">
            {isEditMode ? "Chỉnh sửa chi tiêu" : "Thêm chi tiêu"}
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

        <div>
          <Label>Tiêu đề *</Label>
          <Input
            placeholder="VD: Bữa sáng ở quán X"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Số tiền (VNĐ) *</Label>
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
            <DatePicker
              value={date}
              onChange={setDate}
              className="mt-1"
              placeholder="Chọn ngày"
            />
          </div>
        </div>

        <div>
          <Label>Người trả *</Label>
          <p className="mt-1 text-on-surface-variant text-xs">
            Bạn có thể thêm người trả nếu chưa có trong danh sách
          </p>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Chọn người trả" />
            </SelectTrigger>
            <SelectContent>
              {costMembers.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Người tham gia</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {costMembers.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleMember(name)}
                className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${splitBetween.includes(name) ? "border-primary-500 bg-primary-100 text-primary-800" : "border-outline-variant bg-surface text-on-surface-variant"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Cách chia</Label>
          <RadioGroup
            value={splitMethod}
            onValueChange={(v) => setSplitMethod(v as SplitMethod)}
            className="mt-2 flex gap-3"
          >
            {SPLIT_METHODS.map((m) => (
              <div key={m.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={m.value} id={`split-${m.value}`} />
                <Label
                  htmlFor={`split-${m.value}`}
                  className="cursor-pointer font-normal text-sm"
                >
                  {m.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {splitMethod !== "equal" && splitBetween.length > 0 && (
          <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-dim/50 p-3">
            {splitBetween.map((name) => {
              const rawNum = splitDetails[name];
              let displayValue = "";
              if (
                splitMethod === "amount" &&
                typeof rawNum === "number" &&
                !Number.isNaN(rawNum)
              ) {
                displayValue = formatCurrencyInput(String(rawNum));
              } else if (
                splitMethod === "percentage" &&
                typeof rawNum === "number" &&
                !Number.isNaN(rawNum)
              ) {
                displayValue = rawNum.toLocaleString("vi-VN");
              } else if (typeof rawNum === "number" && !Number.isNaN(rawNum)) {
                displayValue = String(rawNum);
              } else {
                displayValue = "";
              }
              return (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-28 truncate text-on-surface text-sm">
                    {name}
                  </span>
                  <Input
                    inputMode="numeric"
                    placeholder={splitMethod === "shares" ? "1" : "0"}
                    value={displayValue}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (
                        splitMethod === "amount" ||
                        splitMethod === "percentage"
                      ) {
                        val = parseCurrencyInput(val);
                        updateDetail(name, val ? Number(val) : 0);
                      } else {
                        updateDetail(name, Number(val) || 0);
                      }
                    }}
                    className="h-8 w-100 text-sm"
                  />
                  <span className="text-on-surface-variant text-xs">
                    {splitMethod === "percentage"
                      ? "%"
                      : splitMethod === "amount"
                        ? "đ"
                        : "phần"}
                  </span>
                </div>
              );
            })}
            {splitSummary && (
              <p
                className={`text-xs ${splitValid ? "text-success-600" : "text-error-600"}`}
              >
                {splitSummary}
              </p>
            )}
          </div>
        )}

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
          disabled={!canSubmit}
          className="w-full"
          size="sm"
        >
          {isSubmitting && (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          )}
          {isEditMode ? "Lưu thay đổi" : "Thêm chi tiêu"}
        </Button>
      </CardContent>
    </Card>
  );
};
