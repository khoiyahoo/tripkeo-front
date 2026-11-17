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

import {
  Sortable,
  SortableItem,
  type SortableRenderItemProps,
} from "react-native-reanimated-dnd";

import { PdfActions } from "@/components/PdfActions";
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

const REORDER_ITEM_H = 72;

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
  buildPdfHtml: () => string;
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
  buildPdfHtml,
}: Props) => {
  const [selected, setSelected] = useState<string | undefined>(days[0]?.date);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityWithId | null>(null);

  const nextOrder = (date: string) =>
    activities
      .filter((a) => a.date === date)
      .reduce((max, a) => Math.max(max, a.order), -1) + 1;

  const [reordering, setReordering] = useState(false);

  // Thoát chế độ sắp xếp khi đổi ngày
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ phụ thuộc ngày đang chọn
  useEffect(() => setReordering(false), [selected]);

  const onDrop = (id: string, position: number) => {
    if (!selected) return;
    const byDate: Record<string, ActivityWithId[]> = {};
    for (const a of activities) (byDate[a.date] ??= []).push(a);
    const result = buildTimelineMoveUpdates({
      activitiesByDate: byDate,
      activeId: id,
      targetDate: selected,
      targetIndex: position,
    });
    if (!result) return;
    onReorder(result.updates).catch(() =>
      Alert.alert("Lỗi", "Không thể thay đổi thứ tự. Vui lòng thử lại.")
    );
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

      <PdfActions
        buildHtml={buildPdfHtml}
        guard={() => {
          if (activities.length === 0)
            return "Lịch trình chưa có hoạt động nào. Vui lòng thêm hoạt động trước khi xuất PDF.";
          const empty = days.filter(
            (d) => !activities.some((a) => a.date === d.date)
          );
          if (empty.length > 0)
            return `Vui lòng điền đầy đủ hoạt động các ngày trước khi xem (${empty
              .map((d) => `Ngày ${d.dayNumber}`)
              .join(", ")} chưa có hoạt động).`;
          return null;
        }}
        shareTitle="Lịch trình chuyến đi"
      />

      {canEdit && dayActivities.length > 1 && (
        <Pressable
          className={cn(
            "h-11 flex-row items-center justify-center gap-2 rounded-xl border active:opacity-70",
            reordering
              ? "border-primary-500 bg-primary-500/15"
              : "border-outline-variant"
          )}
          onPress={() => setReordering((v) => !v)}
        >
          <Ionicons
            color={reordering ? "#eb5757" : "#abbbc2"}
            name={reordering ? "checkmark" : "swap-vertical"}
            size={18}
          />
          <Text
            className={cn(
              "font-medium",
              reordering ? "text-primary-500" : "text-on-surface"
            )}
          >
            {reordering ? "Xong" : "Sắp xếp thứ tự"}
          </Text>
        </Pressable>
      )}

      {canEdit && !reordering && (
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
      ) : reordering ? (
        <Sortable
          data={dayActivities}
          itemHeight={REORDER_ITEM_H}
          renderItem={({
            item,
            id,
            ...rest
          }: SortableRenderItemProps<ActivityWithId>) => {
            const cfg =
              ACTIVITY_TYPE_CONFIG[item.category] ?? ACTIVITY_TYPE_CONFIG.other;
            return (
              <SortableItem
                data={item}
                id={id}
                key={id}
                onDrop={(movedId, position) => onDrop(movedId, position)}
                {...rest}
              >
                <View
                  className="mb-2 flex-row items-center gap-3 rounded-2xl bg-surface-card px-3"
                  style={{ height: REORDER_ITEM_H - 8 }}
                >
                  <SortableItem.Handle>
                    <View className="h-10 w-8 items-center justify-center">
                      <Ionicons
                        color="#abbbc2"
                        name="reorder-three"
                        size={26}
                      />
                    </View>
                  </SortableItem.Handle>
                  <View
                    className={cn(
                      "h-9 w-9 items-center justify-center rounded-xl",
                      cfg.bgColor
                    )}
                  >
                    <Text>{cfg.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-medium text-on-surface"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-on-surface-variant text-xs">
                      {item.startTime ?? "—:—"}
                      {item.endTime ? ` – ${item.endTime}` : ""}
                    </Text>
                  </View>
                </View>
              </SortableItem>
            );
          }}
          style={{
            height: dayActivities.length * REORDER_ITEM_H,
            backgroundColor: "transparent",
          }}
        />
      ) : (
        <View className="gap-3">
          {dayActivities.map((a) => {
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
                    <Ionicons
                      color="#abbbc2"
                      name="location-outline"
                      size={14}
                    />
                    <Text
                      className={cn(
                        "flex-1 text-sm",
                        a.mapsUrl
                          ? "text-primary-400"
                          : "text-on-surface-variant"
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
          })}
        </View>
      )}
    </View>
  );
};
