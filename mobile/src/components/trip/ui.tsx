import { Text, View } from "react-native";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export const Card = ({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <View className={cn("gap-3 rounded-2xl bg-surface-card p-4", className)}>
    {title && (
      <Text className="font-semibold text-base text-on-surface">{title}</Text>
    )}
    {children}
  </View>
);

export const StatCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View className="flex-1 items-center rounded-2xl bg-surface-card p-3">
    <Text className="text-on-surface-variant text-xs">{label}</Text>
    <Text
      adjustsFontSizeToFit
      className="mt-1 font-bold text-base text-on-surface"
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

export const Empty = ({ text }: { text: string }) => (
  <Text className="py-8 text-center text-on-surface-variant text-sm">
    {text}
  </Text>
);

export const Initial = ({
  name,
  className,
  textClassName,
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) => (
  <View
    className={cn(
      "h-9 w-9 items-center justify-center rounded-full bg-primary-100",
      className
    )}
  >
    <Text
      className={cn("font-semibold text-primary-800 text-sm", textClassName)}
    >
      {name[0]?.toUpperCase()}
    </Text>
  </View>
);
