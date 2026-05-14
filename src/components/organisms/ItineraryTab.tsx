import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LucideIcon } from "lucide-react";
import {
  ExternalLink,
  Loader2,
  MapPin,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Sun,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { TripMeta } from "@/components/organisms/ItineraryPdfExport";
import { ItineraryPdfExport } from "@/components/organisms/ItineraryPdfExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_TYPE_CONFIG,
  getTimePeriod,
  TIME_PERIOD_CONFIG,
  TIME_PERIODS,
} from "@/constants/trip";
import { useFormDraft } from "@/hooks/useFormDraft";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyInput,
  formatDate,
  parseCurrencyInput,
} from "@/utils/format";

import type { ActivityWithId, CreateActivityInput } from "@/types/firestore";
import type { ActivityType, TimePeriod } from "@/types/trip";

// ─── Period UI Config (Lucide icons) ─────────────────────────

const PERIOD_UI: Record<
  TimePeriod,
  { Icon: LucideIcon; iconColor: string; iconBg: string }
> = {
  morning: {
    Icon: Sunrise,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
  },
  afternoon: {
    Icon: Sun,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
  },
  evening: {
    Icon: Moon,
    iconColor: "text-indigo-500",
    iconBg: "bg-indigo-50",
  },
};

// ─── Category Options ────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "transport", label: "Di chuyển" },
  { value: "stay", label: "Chỗ ở" },
  { value: "sights", label: "Tham quan" },
  { value: "food", label: "Ăn uống" },
  { value: "shopping", label: "Mua sắm" },
  { value: "entertainment", label: "Giải trí" },
  { value: "other", label: "Khác" },
];

// ─── Activity Row (pure display) ─────────────────────────────

const ActivityRow = ({
  activity,
  onEdit,
  onDelete,
  canEdit,
  isDragging,
}: {
  activity: ActivityWithId;
  onEdit: () => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isDragging?: boolean;
}) => {
  const config = ACTIVITY_TYPE_CONFIG[activity.category];
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5",
        isDragging && "rotate-[0.5deg] bg-white shadow-xl ring-2 ring-teal-400"
      )}
    >
      {/* Time column */}
      <div className="flex w-11 shrink-0 flex-col items-start text-right">
        {activity.startTime ? (
          <>
            <span className="font-mono text-on-surface-variant text-xs">
              {activity.startTime}
            </span>
            {activity.endTime && (
              <span className="block font-mono text-[10px] text-on-surface-variant/50">
                {activity.endTime}
              </span>
            )}
          </>
        ) : (
          <span className="font-mono text-on-surface-variant/30 text-xs">
            – : –
          </span>
        )}
      </div>

      {/* Category dot */}
      <div
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", config.bgColor)}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm leading-none">{config.icon}</span>
          <span className="min-w-0 flex-1 font-medium text-on-surface text-sm leading-snug">
            {activity.title}
          </span>
          {activity.cost !== undefined && activity.cost > 0 && (
            <span className="shrink-0 font-semibold text-primary-600 text-xs">
              {formatCurrency(activity.cost)}
            </span>
          )}
        </div>
        {(activity.location || activity.note || activity.mapsUrl) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-on-surface-variant text-xs">
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{activity.location}</span>
              </span>
            )}
            {activity.mapsUrl && (
              <a
                href={activity.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-secondary-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Bản đồ
              </a>
            )}
            {activity.note && (
              <span className="text-on-surface-variant/60">
                *NOTE: {activity.note}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      {canEdit && (
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-md p-1 text-on-surface-variant"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(activity.id);
            }}
            className="rounded-md p-1 text-error-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Sortable Activity Row (entire card draggable) ───────────

const SortableActivityRow = ({
  activity,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  canEdit,
  tripId,
}: {
  activity: ActivityWithId;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: Partial<CreateActivityInput>) => Promise<void>;
  onDelete: (id: string) => void;
  canEdit: boolean;
  tripId: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id, disabled: isEditing });

  if (isEditing) {
    return (
      <div ref={setNodeRef} className="px-3 pb-2">
        <ActivityForm
          mode="edit"
          tripId={tripId}
          date={activity.date}
          order={activity.order}
          initialPeriod={getTimePeriod(activity.startTime)}
          initialValues={{
            title: activity.title,
            startTime: activity.startTime ?? "",
            endTime: activity.endTime ?? "",
            category: activity.category,
            location: activity.location ?? "",
            costRaw: activity.cost != null ? String(activity.cost) : "",
            note: activity.note ?? "",
            period: getTimePeriod(activity.startTime),
          }}
          onSubmit={async (input) => {
            await onSaveEdit(input);
          }}
          onCancel={onCancelEdit}
          onSuccess={() => {
            // no-op: parent handles notification
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <ActivityRow
        activity={activity}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={canEdit}
      />
    </div>
  );
};

// ─── Activity Form (unified Add + Edit) ──────────────────────

interface ActivityFormValues {
  title: string;
  startTime: string;
  endTime: string;
  category: ActivityType;
  location: string;
  costRaw: string;
  note: string;
  period: TimePeriod;
}

const INITIAL_FORM: ActivityFormValues = {
  title: "",
  startTime: "",
  endTime: "",
  category: "sights",
  location: "",
  costRaw: "",
  note: "",
  period: "morning",
};

const ActivityForm = ({
  mode,
  tripId,
  date,
  order,
  initialPeriod,
  initialValues,
  onSubmit,
  onCancel,
  onSuccess,
}: {
  mode: "add" | "edit";
  tripId: string;
  date: string;
  order: number;
  initialPeriod: TimePeriod;
  initialValues?: ActivityFormValues;
  onSubmit: (input: CreateActivityInput) => Promise<unknown>;
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const draftKey = `draft_activity_${tripId}_${date}`;
  const { savedDraft, saveDraft, clearDraft, hasDraft } =
    useFormDraft<ActivityFormValues>(draftKey, INITIAL_FORM);

  const defaults = initialValues ?? INITIAL_FORM;
  const [title, setTitle] = useState(defaults.title);
  const [startTime, setStartTime] = useState(
    defaults.startTime || TIME_PERIOD_CONFIG[initialPeriod].defaultTime
  );
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [category, setCategory] = useState<ActivityType>(defaults.category);
  const [location, setLocation] = useState(defaults.location);
  const [costRaw, setCostRaw] = useState(defaults.costRaw);
  const [note, setNote] = useState(defaults.note);
  const [period, setPeriod] = useState<TimePeriod>(defaults.period);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(
    mode === "add" && hasDraft
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);

  // Auto-save draft (add mode only)
  useEffect(() => {
    if (mode !== "add") return;
    saveDraft({
      title,
      startTime,
      endTime,
      category,
      location,
      costRaw,
      note,
      period,
    });
  }, [
    mode,
    title,
    startTime,
    endTime,
    category,
    location,
    costRaw,
    note,
    period,
    saveDraft,
  ]);

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    if (!startTime) setStartTime(TIME_PERIOD_CONFIG[newPeriod].defaultTime);
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    if (newTime) setPeriod(getTimePeriod(newTime));
    if (endTime && newTime && endTime <= newTime) {
      setEndTimeError("Phải sau giờ bắt đầu");
    } else {
      setEndTimeError(null);
    }
  };

  const validate = (): boolean => {
    const t = title.trim();
    if (!t) {
      setTitleError("Tên không được để trống");
      return false;
    }
    if (t.length > 100) {
      setTitleError("Tối đa 100 ký tự");
      return false;
    }
    setTitleError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        date,
        title: title.trim(),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        category,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
        cost: costRaw ? Number(costRaw) : undefined,
        order,
      });
      if (mode === "add") clearDraft();
      toast.success(
        mode === "add" ? "Đã thêm hoạt động" : "Đã cập nhật hoạt động"
      );
      onSuccess();
      onCancel();
    } catch {
      toast.error(
        mode === "add" ? "Không thể thêm hoạt động" : "Không thể lưu thay đổi"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-1 border border-teal-200 shadow-sm">
      <CardContent className="space-y-3 p-4">
        {/* Draft banner (add mode only) */}
        {mode === "add" && showDraftBanner && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
            <span className="flex items-center gap-2 text-amber-800 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Có bản nháp chưa lưu
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-amber-700 text-xs"
                onClick={() => {
                  if (savedDraft) {
                    setTitle(savedDraft.title);
                    setStartTime(savedDraft.startTime);
                    setEndTime(savedDraft.endTime);
                    setCategory(savedDraft.category);
                    setLocation(savedDraft.location);
                    setCostRaw(savedDraft.costRaw);
                    setNote(savedDraft.note);
                    setPeriod(savedDraft.period);
                  }
                  setShowDraftBanner(false);
                }}
              >
                Khôi phục
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-on-surface-variant text-xs"
                onClick={() => {
                  clearDraft();
                  setShowDraftBanner(false);
                }}
              >
                Bỏ qua
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-semibold text-on-surface text-sm">
            {mode === "add" ? "Thêm hoạt động" : "Chỉnh sửa hoạt động"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Title (required) */}
        <div>
          <Label htmlFor="act-title" className="text-xs">
            Tên *
          </Label>
          <Input
            id="act-title"
            placeholder="VD: Tham quan Bà Nà Hills"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            className={cn("mt-1 h-8 text-sm", titleError && "border-error-500")}
          />
          {titleError && (
            <p className="mt-0.5 text-error-500 text-xs">{titleError}</p>
          )}
        </div>

        {/* Period + Category (required) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Buổi</Label>
            <Select
              value={period}
              onValueChange={(v) => handlePeriodChange(v as TimePeriod)}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((p) => {
                  const ui = PERIOD_UI[p];
                  return (
                    <SelectItem key={p} value={p} className="text-sm">
                      <span className="flex items-center gap-1.5">
                        <ui.Icon className={cn("h-3.5 w-3.5", ui.iconColor)} />
                        {TIME_PERIOD_CONFIG[p].label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Danh mục *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ActivityType)}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Times (optional) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label
              htmlFor="act-start"
              className="flex items-center gap-1 text-xs"
            >
              Giờ bắt đầu
              <span className="text-on-surface-variant/50">(tùy chọn)</span>
            </Label>
            <Input
              id="act-start"
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label
              htmlFor="act-end"
              className="flex items-center gap-1 text-xs"
            >
              Kết thúc
              <span className="text-on-surface-variant/50">(tùy chọn)</span>
            </Label>
            <Input
              id="act-end"
              type="time"
              value={endTime}
              min={startTime || undefined}
              onChange={(e) => {
                setEndTime(e.target.value);
                if (
                  startTime &&
                  e.target.value &&
                  e.target.value <= startTime
                ) {
                  setEndTimeError("Phải sau giờ bắt đầu");
                } else {
                  setEndTimeError(null);
                }
              }}
              className={cn(
                "mt-1 h-8 text-sm",
                endTimeError && "border-error-500"
              )}
            />
            {endTimeError && (
              <p className="mt-0.5 text-error-500 text-xs">{endTimeError}</p>
            )}
          </div>
        </div>

        {/* Location (optional) */}
        <div>
          <Label
            htmlFor="act-location"
            className="flex items-center gap-1 text-xs"
          >
            Địa điểm
            <span className="text-on-surface-variant/50">(tùy chọn)</span>
          </Label>
          <Input
            id="act-location"
            placeholder="VD: Bà Nà Hills, Đà Nẵng"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Cost (optional) */}
        <div>
          <Label htmlFor="act-cost" className="flex items-center gap-1 text-xs">
            Chi phí (₫)
            <span className="text-on-surface-variant/50">(tùy chọn)</span>
          </Label>
          <Input
            id="act-cost"
            inputMode="numeric"
            placeholder="0"
            value={formatCurrencyInput(costRaw)}
            onChange={(e) => setCostRaw(parseCurrencyInput(e.target.value))}
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Note (optional) */}
        <div>
          <Label htmlFor="act-note" className="flex items-center gap-1 text-xs">
            Ghi chú
            <span className="text-on-surface-variant/50">(tùy chọn)</span>
          </Label>
          <Textarea
            id="act-note"
            placeholder="Thêm ghi chú..."
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 resize-none text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="mx-auto flex items-center justify-center rounded-sm bg-primary-500 px-2 py-1 font-semibold text-primary-800 text-sm"
          size="sm"
        >
          {isSubmitting && (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          )}
          {mode === "add" ? "Thêm hoạt động" : "Lưu thay đổi"}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Period Section ──────────────────────────────────────────

const PeriodSection = ({
  period,
  activities,
  tripId,
  date,
  totalActivitiesForDay,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  addingForPeriod,
  setAddingForPeriod,
  editingActivityId,
  setEditingActivityId,
  canEditActivity,
}: {
  period: TimePeriod;
  activities: ActivityWithId[];
  tripId: string;
  date: string;
  totalActivitiesForDay: number;
  onAddActivity: (input: CreateActivityInput) => Promise<string>;
  onUpdateActivity: (
    id: string,
    data: Partial<CreateActivityInput>
  ) => Promise<void>;
  onDeleteActivity: (id: string) => void;
  addingForPeriod: string | null;
  setAddingForPeriod: (key: string | null) => void;
  editingActivityId: string | null;
  setEditingActivityId: (id: string | null) => void;
  canEditActivity: (a: ActivityWithId) => boolean;
}) => {
  const { label } = TIME_PERIOD_CONFIG[period];
  const ui = PERIOD_UI[period];
  const periodKey = `${date}_${period}`;
  const isAdding = addingForPeriod === periodKey;

  return (
    <div className="pt-2">
      {/* Period header */}
      <div className="flex items-center gap-2 px-4 pb-1">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            ui.iconBg
          )}
        >
          <ui.Icon className={cn("h-3.5 w-3.5", ui.iconColor)} />
        </div>
        <span className="font-medium text-on-surface text-xs">{label}</span>
      </div>

      {/* Activity list */}
      {activities.length > 0 && (
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="pl-6">
            {activities.map((activity) => (
              <SortableActivityRow
                key={activity.id}
                activity={activity}
                isEditing={editingActivityId === activity.id}
                onEdit={() => setEditingActivityId(activity.id)}
                onCancelEdit={() => setEditingActivityId(null)}
                onSaveEdit={async (data) => {
                  await onUpdateActivity(activity.id, data);
                  setEditingActivityId(null);
                }}
                onDelete={onDeleteActivity}
                canEdit={canEditActivity(activity)}
                tripId={tripId}
              />
            ))}
          </div>
        </SortableContext>
      )}

      {/* Add button / form */}
      {isAdding ? (
        <div className="px-4">
          <ActivityForm
            mode="add"
            tripId={tripId}
            date={date}
            order={totalActivitiesForDay}
            initialPeriod={period}
            onSubmit={onAddActivity}
            onCancel={() => setAddingForPeriod(null)}
            onSuccess={() => {
              // toast is fired inside ActivityForm
            }}
          />
        </div>
      ) : (
        <div className="px-4 pt-1.5 pb-3">
          <button
            type="button"
            onClick={() => setAddingForPeriod(periodKey)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-teal-300 border-dashed py-2.5 font-medium text-sm text-teal-600 transition-colors hover:border-teal-400 hover:bg-teal-50"
          >
            <Plus className="h-4 w-4" />
            Thêm hoạt động
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────

interface ItineraryTabProps {
  tripId: string;
  tripMeta?: TripMeta;
  days: { dayNumber: number; date: string }[];
  activitiesByDate: Record<string, ActivityWithId[]>;
  isLoading: boolean;
  onAddActivity: (input: CreateActivityInput) => Promise<string>;
  onUpdateActivity: (
    activityId: string,
    data: Partial<CreateActivityInput>
  ) => Promise<void>;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onBatchUpdateOrders: (
    updates: { id: string; order: number; startTime?: string; date?: string }[]
  ) => Promise<void>;
  currentUserRole?: "owner" | "editor" | "viewer";
  currentUserId?: string;
}

export const ItineraryTab = ({
  tripId,
  tripMeta,
  days,
  activitiesByDate,
  isLoading,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onBatchUpdateOrders,
  currentUserRole,
  currentUserId,
}: ItineraryTabProps) => {
  const [addingForPeriod, setAddingForPeriod] = useState<string | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedActivity, setDraggedActivity] = useState<ActivityWithId | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const canEditActivity = useCallback(
    (activity: ActivityWithId): boolean => {
      if (!currentUserRole || currentUserRole === "viewer") return false;
      if (currentUserRole === "owner") return true;
      return activity.createdBy === currentUserId;
    },
    [currentUserRole, currentUserId]
  );

  // Flat lookup: activityId → { date, period, activity }
  const activityMap = useMemo(() => {
    const map = new Map<
      string,
      { date: string; period: TimePeriod; activity: ActivityWithId }
    >();
    for (const [date, acts] of Object.entries(activitiesByDate)) {
      for (const a of acts) {
        map.set(a.id, {
          date,
          period: getTimePeriod(a.startTime),
          activity: a,
        });
      }
    }
    return map;
  }, [activitiesByDate]);

  const handleDragStart = (event: DragStartEvent) => {
    const entry = activityMap.get(String(event.active.id));
    if (entry) setDraggedActivity(entry.activity);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedActivity(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeEntry = activityMap.get(String(active.id));
    const overEntry = activityMap.get(String(over.id));
    if (!activeEntry || !overEntry) return;

    const sourceDate = activeEntry.date;
    const targetDate = overEntry.date;
    const isCrossDay = sourceDate !== targetDate;
    const movedToDifferentPeriod = activeEntry.period !== overEntry.period;
    const newStartTime =
      isCrossDay || movedToDifferentPeriod
        ? TIME_PERIOD_CONFIG[overEntry.period].defaultTime
        : undefined;

    if (isCrossDay) {
      // Cross-day: reorder source (remove), insert into target
      const sourceActs = (activitiesByDate[sourceDate] ?? []).filter(
        (a) => a.id !== String(active.id)
      );
      const targetActs = [...(activitiesByDate[targetDate] ?? [])];
      const insertIdx = targetActs.findIndex((a) => a.id === String(over.id));
      const insertAt = insertIdx >= 0 ? insertIdx : targetActs.length;
      targetActs.splice(insertAt, 0, activeEntry.activity);

      const sourceUpdates = sourceActs.map((a, i) => ({ id: a.id, order: i }));
      const targetUpdates = targetActs.map((a, i) => ({
        id: a.id,
        order: i,
        startTime: a.id === String(active.id) ? newStartTime : undefined,
        date: a.id === String(active.id) ? targetDate : undefined,
      }));

      onBatchUpdateOrders([...sourceUpdates, ...targetUpdates]);
    } else {
      // Same-day reorder
      const dayActs = activitiesByDate[sourceDate] ?? [];
      const oldIdx = dayActs.findIndex((a) => a.id === active.id);
      const newIdx = dayActs.findIndex((a) => a.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = [...dayActs];
      const [moved] = reordered.splice(oldIdx, 1);
      reordered.splice(newIdx, 0, moved);

      onBatchUpdateOrders(
        reordered.map((a, i) => ({
          id: a.id,
          order: i,
          startTime: a.id === String(active.id) ? newStartTime : undefined,
        }))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Export toolbar */}
        {tripMeta && (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-on-surface text-sm">
              Lịch trình
            </h2>
            <ItineraryPdfExport
              tripMeta={tripMeta}
              days={days}
              activitiesByDate={activitiesByDate}
            />
          </div>
        )}

        {days.map((day) => {
          const dayActivities = activitiesByDate[day.date] ?? [];
          const byPeriod: Record<TimePeriod, ActivityWithId[]> = {
            morning: [],
            afternoon: [],
            evening: [],
          };
          for (const a of dayActivities) {
            byPeriod[getTimePeriod(a.startTime)].push(a);
          }
          for (const p of TIME_PERIODS) {
            byPeriod[p].sort((a, b) =>
              a.order !== b.order
                ? a.order - b.order
                : (a.startTime ?? "").localeCompare(b.startTime ?? "")
            );
          }

          return (
            <div
              key={day.date}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
            >
              {/* Day header */}
              <div className="flex items-center gap-3 border-black/5 border-b px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500 font-bold text-sm text-white">
                  {day.dayNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface text-sm">
                    Ngày {day.dayNumber}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {formatDate(day.date)}
                  </p>
                </div>
                {dayActivities.length > 0 && (
                  <span className="shrink-0 rounded-full bg-surface-dim px-2.5 py-0.5 text-on-surface-variant text-xs">
                    {dayActivities.length} hoạt động
                  </span>
                )}
              </div>

              {/* Period sections */}
              <div className="divide-y divide-black/[0.04]">
                {TIME_PERIODS.map((p) => (
                  <PeriodSection
                    key={p}
                    period={p}
                    activities={byPeriod[p]}
                    tripId={tripId}
                    date={day.date}
                    totalActivitiesForDay={dayActivities.length}
                    onAddActivity={onAddActivity}
                    onUpdateActivity={onUpdateActivity}
                    onDeleteActivity={setConfirmDeleteId}
                    addingForPeriod={addingForPeriod}
                    setAddingForPeriod={setAddingForPeriod}
                    editingActivityId={editingActivityId}
                    setEditingActivityId={setEditingActivityId}
                    canEditActivity={canEditActivity}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa hoạt động?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Hoạt động sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmDeleteId) return;
                const id = confirmDeleteId;
                setConfirmDeleteId(null);
                try {
                  await onDeleteActivity(id);
                  toast.success("Đã xóa hoạt động");
                } catch {
                  toast.error("Không thể xóa hoạt động");
                }
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedActivity && (
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl ring-2 ring-teal-400">
            <ActivityRow
              activity={draggedActivity}
              onEdit={() => {
                // noop during drag
              }}
              onDelete={() => {
                // noop during drag
              }}
              canEdit={false}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
