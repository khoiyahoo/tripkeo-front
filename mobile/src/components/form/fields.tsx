import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <View className="gap-1.5">
    <Text className="font-medium text-on-surface text-sm">{label}</Text>
    {hint ? (
      <Text className="text-on-surface-variant text-xs">{hint}</Text>
    ) : null}
    {children}
  </View>
);

export const Input = ({ className, ...props }: TextInputProps) => (
  <TextInput
    className={cn(
      "h-11 rounded-xl border border-outline-variant bg-surface-card px-3 text-on-surface",
      className
    )}
    placeholderTextColor="#6b7280"
    {...props}
  />
);

export const Chips = <T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) => (
  <View className="flex-row flex-wrap gap-2">
    {options.map((o) => {
      const on = selected.includes(o.value);
      return (
        <Pressable
          className={cn(
            "rounded-full border px-3 py-1.5",
            on
              ? "border-primary-500 bg-primary-100"
              : "border-outline-variant bg-surface-card"
          )}
          key={o.value}
          onPress={() => onToggle(o.value)}
        >
          <Text
            className={cn(
              "font-medium text-xs",
              on ? "text-primary-800" : "text-on-surface-variant"
            )}
          >
            {o.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/** Chọn một giá trị (radio dạng chip). */
export const SingleChips = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) => <Chips onToggle={onChange} options={options} selected={[value]} />;

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Giữ giờ trưa để tránh lệch ngày khi chuyển múi giờ.
const fromDateStr = (s: string) => new Date(`${s}T12:00:00`);

export const DateField = ({
  value,
  onChange,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) => {
  const [open, setOpen] = useState(false);
  const picker = (
    <DateTimePicker
      display={Platform.OS === "ios" ? "compact" : "default"}
      maximumDate={max ? fromDateStr(max) : undefined}
      minimumDate={min ? fromDateStr(min) : undefined}
      mode="date"
      onChange={(_, d) => {
        setOpen(false);
        if (d) onChange(toDateStr(d));
      }}
      themeVariant="dark"
      value={fromDateStr(value)}
    />
  );

  if (Platform.OS === "ios") {
    return <View className="items-start">{picker}</View>;
  }
  return (
    <>
      <Pressable
        className="h-11 justify-center rounded-xl border border-outline-variant bg-surface-card px-3"
        onPress={() => setOpen(true)}
      >
        <Text className="text-on-surface">{value}</Text>
      </Pressable>
      {open && picker}
    </>
  );
};

/** Giờ dạng "HH:mm"; rỗng nghĩa là chưa đặt. */
export const TimeField = ({
  value,
  onChange,
  placeholder = "Chưa đặt",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const date = new Date();
  if (value) {
    const [h, m] = value.split(":").map(Number);
    date.setHours(h, m, 0, 0);
  }
  const handle = (_: unknown, d?: Date) => {
    setOpen(false);
    if (d) onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  return (
    <View className="flex-row items-center gap-2">
      {Platform.OS === "ios" && value ? (
        <DateTimePicker
          display="compact"
          mode="time"
          onChange={handle}
          themeVariant="dark"
          value={date}
        />
      ) : (
        <Pressable
          className="h-11 min-w-24 justify-center rounded-xl border border-outline-variant bg-surface-card px-3"
          onPress={() =>
            Platform.OS === "ios" ? onChange("09:00") : setOpen(true)
          }
        >
          <Text
            className={value ? "text-on-surface" : "text-on-surface-variant"}
          >
            {value || placeholder}
          </Text>
        </Pressable>
      )}
      {value ? (
        <Pressable hitSlop={8} onPress={() => onChange("")}>
          <Text className="text-on-surface-variant text-xs">Xóa</Text>
        </Pressable>
      ) : null}
      {open && (
        <DateTimePicker is24Hour mode="time" onChange={handle} value={date} />
      )}
    </View>
  );
};
