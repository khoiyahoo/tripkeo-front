import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ActivityFormModal } from "@/components/trip/ActivityFormModal";

import { Card, Empty } from "@/components/trip/ui";
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateShort } from "@/utils/format";
import {
  buildTimelineMoveUpdates,
  sortTimelineActivities,
} from "@/utils/itineraryTimeline";

import type { ActivityWithId, CreateActivityInput } from "@/types/firestore";

interface Props {
  days: { dayNumber: number; date: string }[];
  activities: ActivityWithId[];
  isLoading: boolean;
  canEdit: boolean;
  onAdd: (input: CreateActivityInput) => Promise<unknown>;
  onUpdate: (id: string, input: Partial<CreateActivityInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (
    updates: { id: string; order: number; startTime?: string; date?: string }[]
  ) => Promise<void>;
  onExport: () => Promise<void>;
}

export const ItineraryView = ({
  days,
  activities,
  isLoading,
  canEdit,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onExport,
}: Props) => {
  const [isExporting, setIsExporting] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(days[0]?.date);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityWithId | null>(null);

  const nextOrder = (date: string) =>
    activities
      .filter((a) => a.date === date)
      .reduce((max, a) => Math.max(max, a.order), -1) + 1;

  const move = (id: string, index: number, delta: -1 | 1) => {
    if (!selected) return;
    const byDate: Record<string, ActivityWithId[]> = {};
    for (const a of activities) (byDate[a.date] ??= []).push(a);
    const result = buildTimelineMoveUpdates({
      activitiesByDate: byDate,
      activeId: id,
      targetDate: selected,
      targetIndex: index + delta,
    });
    if (!result) return;
    onReorder(result.updates).catch(() =>
      Alert.alert("Lỗi", "Không thể thay đổi thứ tự. Vui lòng thử lại.")
    );
  };

  const doExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch {
      Alert.alert("Lỗi", "Không thể xuất PDF. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = (a: ActivityWithId) =>
    Alert.alert("Xóa hoạt động", `Xóa "${a.title}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () =>
          onDelete(a.id).catch(() =>
            Alert.alert("Lỗi", "Không thể xóa hoạt động. Vui lòng thử lại.")
          ),
      },
    ]);

  useEffect(() => {
    if (!selected || !days.some((d) => d.date === selected)) {
      setSelected(days[0]?.date);
    }
  }, [days, selected]);

  const dayActivities = useMemo(
    () => sortTimelineActivities(activities.filter((a) => a.date === selected)),
    [activities, selected]
  );

  return (
    <View className="gap-4">
      {days.length > 0 && (
        <ActivityFormModal
          defaultDate={selected ?? days[0].date}
          initialData={editing}
          maxDate={days[days.length - 1].date}
          minDate={days[0].date}
          nextOrder={nextOrder}
          onClose={() => setFormOpen(false)}
          onSubmit={(input) =>
            editing ? onUpdate(editing.id, input) : onAdd(input)
          }
          visible={formOpen}
        />
      )}
      <ScrollView
        contentContainerStyle={{ gap: 8 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {days.map((d) => {
          const active = d.date === selected;
          const count = activities.filter((a) => a.date === d.date).length;
          return (
            <Pressable
              className={cn(
                "items-center rounded-xl px-4 py-2",
                active ? "bg-primary-500" : "bg-surface-card"
              )}
              key={d.date}
              onPress={() => setSelected(d.date)}
            >
              <Text
                className={cn(
                  "font-semibold text-sm",
                  active ? "text-white" : "text-on-surface"
                )}
              >
                Ngày {d.dayNumber}
              </Text>
              <Text
                className={cn(
                  "text-xs",
                  active ? "text-white/80" : "text-on-surface-variant"
                )}
              >
                {formatDateShort(d.date)} · {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        className="h-11 flex-row items-center justify-center gap-2 rounded-xl border border-outline-variant active:opacity-70"
        disabled={isExporting}
        onPress={doExport}
      >
        {isExporting ? (
          <ActivityIndicator color="#abbbc2" />
        ) : (
          <Ionicons color="#abbbc2" name="document-text-outline" size={18} />
        )}
        <Text className="font-medium text-on-surface">Xuất PDF lịch trình</Text>
      </Pressable>

      {canEdit && (
        <Pressable
          className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 active:bg-primary-600"
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Ionicons color="#fff" name="add" size={20} />
          <Text className="font-semibold text-white">Thêm hoạt động</Text>
        </Pressable>
      )}

      {isLoading ? (
        <Empty text="Đang tải lịch trình..." />
      ) : dayActivities.length === 0 ? (
        <Empty text="Chưa có hoạt động nào cho ngày này" />
      ) : (
        dayActivities.map((a, idx) => {
          const cfg =
            ACTIVITY_TYPE_CONFIG[a.category] ?? ACTIVITY_TYPE_CONFIG.other;
          return (
            <Card key={a.id}>
              <View className="flex-row items-center gap-3">
                <View
                  className={cn(
                    "h-10 w-10 items-center justify-center rounded-xl",
                    cfg.bgColor
                  )}
                >
                  <Text className="text-lg">{cfg.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-on-surface">
                    {a.title}
                  </Text>
                  <Text className="text-on-surface-variant text-xs">
                    {a.startTime ?? "—:—"}
                    {a.endTime ? ` – ${a.endTime}` : ""} · {cfg.label}
                  </Text>
                </View>
                {canEdit && (
                  <View className="flex-row items-center gap-3">
                    <View className="items-center">
                      <Pressable
                        disabled={idx === 0}
                        hitSlop={6}
                        onPress={() => move(a.id, idx, -1)}
                        style={{ opacity: idx === 0 ? 0.25 : 1 }}
                      >
                        <Ionicons color="#abbbc2" name="chevron-up" size={18} />
                      </Pressable>
                      <Pressable
                        disabled={idx === dayActivities.length - 1}
                        hitSlop={6}
                        onPress={() => move(a.id, idx, 1)}
                        style={{
                          opacity: idx === dayActivities.length - 1 ? 0.25 : 1,
                        }}
                      >
                        <Ionicons
                          color="#abbbc2"
                          name="chevron-down"
                          size={18}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => {
                        setEditing(a);
                        setFormOpen(true);
                      }}
                    >
                      <Ionicons
                        color="#eb5757"
                        name="create-outline"
                        size={18}
                      />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(a)}>
                      <Ionicons
                        color="#eb5757"
                        name="trash-outline"
                        size={18}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
              {(a.location || a.mapsUrl) && (
                <Pressable
                  className="flex-row items-center gap-1.5"
                  disabled={!a.mapsUrl}
                  onPress={() => a.mapsUrl && Linking.openURL(a.mapsUrl)}
                >
                  <Ionicons color="#abbbc2" name="location-outline" size={14} />
                  <Text
                    className={cn(
                      "flex-1 text-sm",
                      a.mapsUrl ? "text-primary-400" : "text-on-surface-variant"
                    )}
                    numberOfLines={1}
                  >
                    {a.location || "Xem bản đồ"}
                  </Text>
                </Pressable>
              )}
              {a.note ? (
                <Text className="text-on-surface-variant text-sm">
                  {a.note}
                </Text>
              ) : null}
              {a.cost !== undefined && a.cost > 0 && (
                <Text className="font-medium text-on-surface text-sm">
                  {formatCurrency(a.cost)}
                </Text>
              )}
            </Card>
          );
        })
      )}
    </View>
  );
};
