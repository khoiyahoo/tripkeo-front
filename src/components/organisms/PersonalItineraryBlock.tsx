/**
 * PersonalItineraryBlock — renders the "Lịch trình của tôi" section.
 *
 * Responsibilities:
 * - Display personal activities grouped by day → period.
 * - Conflict detection: warn when a personal activity shares the same
 *   date + period + startTime with a shared activity.
 * - CRUD via modal forms.
 * - Drag-and-drop reordering (same dnd-kit approach as shared itinerary).
 * - Collapse/expand toggling (localStorage-persisted).
 */
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
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
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Moon,
  Pencil,
  Plus,
  Sun,
  Sunrise,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { usePersonalItinerary } from "@/hooks/usePersonalItinerary";
import { cn } from "@/lib/utils";
import {
  addMinutesToTime,
  getDefaultStartTime,
  getSessionBase,
  getSessionRange,
} from "@/utils/format";

import type {
  ActivityWithId,
  CreatePersonalActivityInput,
  PersonalActivityWithId,
} from "@/types/firestore";
import type { ActivityType, TimePeriod } from "@/types/trip";

// ─── Helpers ──────────────────────────────────────────────────

const PERIOD_UI: Record<
  TimePeriod,
  { Icon: React.ElementType; iconColor: string; iconBg: string }
> = {
  morning: {
    Icon: Sunrise,
    iconColor: "text-warning-500",
    iconBg: "bg-warning-50",
  },
  afternoon: {
    Icon: Sun,
    iconColor: "text-primary-500",
    iconBg: "bg-primary-50",
  },
  evening: {
    Icon: Moon,
    iconColor: "text-secondary-700",
    iconBg: "bg-secondary-100",
  },
};

const PERIOD_TIME_LABEL: Record<TimePeriod, string> = {
  morning: "06:00 – 11:59",
  afternoon: "12:00 – 17:59",
  evening: "18:00 – 23:59",
};

const CATEGORY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "transport", label: "Di chuyển" },
  { value: "stay", label: "Chỗ ở" },
  { value: "sights", label: "Tham quan" },
  { value: "food", label: "Ăn uống" },
  { value: "shopping", label: "Mua sắm" },
  { value: "entertainment", label: "Giải trí" },
  { value: "other", label: "Khác" },
];

/** Returns shared activities that conflict (same date + period + startTime). */
const findConflicts = (
  personal: { date: string; startTime?: string },
  sharedActivities: ActivityWithId[]
): ActivityWithId[] => {
  if (!personal.startTime) return [];
  const period = getTimePeriod(personal.startTime);
  return sharedActivities.filter(
    (a) =>
      a.date === personal.date &&
      a.startTime === personal.startTime &&
      getTimePeriod(a.startTime) === period
  );
};

// ─── Personal Activity Form ────────────────────────────────────

interface PersonalFormValues {
  title: string;
  startTime: string;
  endTime: string;
  category: ActivityType;
  note: string;
}

const INITIAL_FORM: PersonalFormValues = {
  title: "",
  startTime: "",
  endTime: "",
  category: "other",
  note: "",
};

interface PersonalActivityFormProps {
  open: boolean;
  mode: "add" | "edit";
  date: string;
  initialValues?: PersonalFormValues;
  initialPeriod?: TimePeriod;
  /** Number of existing activities in the same date+period (for default time) */
  existingCountInPeriod?: number;
  sharedActivities: ActivityWithId[];
  existingPersonalActivities?: PersonalActivityWithId[];
  editingId?: string;
  onSubmit: (input: CreatePersonalActivityInput) => Promise<unknown>;
  onCancel: () => void;
}

const PersonalActivityForm = ({
  open,
  mode,
  date,
  initialValues,
  initialPeriod = "morning",
  sharedActivities,
  existingPersonalActivities,
  editingId,
  onSubmit,
  onCancel,
}: PersonalActivityFormProps) => {
  const defaults = initialValues ?? INITIAL_FORM;
  const activitiesInPeriod = (existingPersonalActivities ?? []).filter(
    (a) =>
      a.date === date &&
      a.startTime &&
      getTimePeriod(a.startTime) === initialPeriod
  );
  const [title, setTitle] = useState(defaults.title);
  const [startTime, setStartTime] = useState(
    defaults.startTime ||
      getDefaultStartTime(activitiesInPeriod, initialPeriod) ||
      TIME_PERIOD_CONFIG[initialPeriod].defaultTime
  );
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [category, setCategory] = useState<ActivityType>(defaults.category);
  const [note, setNote] = useState(defaults.note);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [startTimeRangeError, setStartTimeRangeError] = useState<string | null>(
    null
  );

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    if (newTime) {
      const period = getTimePeriod(newTime);
      const range = getSessionRange(period);
      if (newTime < range.min || newTime > range.max) {
        setStartTimeRangeError(
          `Giờ phải từ ${range.min} đến ${range.max} cho buổi ${TIME_PERIOD_CONFIG[period].label}.`
        );
      } else {
        setStartTimeRangeError(null);
      }
    } else {
      setStartTimeRangeError(null);
    }
  };

  const sharedConflicts = findConflicts({ date, startTime }, sharedActivities);

  // Bug 5: also detect personal-to-personal conflicts
  const personalConflict = useMemo(() => {
    if (!startTime || !existingPersonalActivities?.length) return null;
    return (
      existingPersonalActivities.find(
        (a) =>
          a.date === date && a.startTime === startTime && a.id !== editingId
      ) ?? null
    );
  }, [startTime, date, existingPersonalActivities, editingId]);

  const hasBlockingConflict =
    sharedConflicts.length > 0 || !!personalConflict || !!startTimeRangeError;

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      setTitleError("Tên không được để trống");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        date,
        title: t,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        category,
        note: note.trim() || undefined,
      });
      toast.success(mode === "add" ? "Đã thêm ghi chú cá nhân" : "Đã cập nhật");
      onCancel();
    } catch (error) {
      toast.error(`Không thể lưu. Vui lòng thử lại.${error}`);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Thêm ghi chú cá nhân" : "Chỉnh sửa ghi chú"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Title */}
          <div>
            <Label htmlFor="pa-title" className="text-xs">
              Nội dung *
            </Label>
            <Input
              id="pa-title"
              placeholder="VD: Chạy bộ ven biển"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              className={cn(
                "mt-1 h-8 text-sm",
                titleError && "border-error-500"
              )}
            />
            {titleError && (
              <p className="mt-0.5 text-error-500 text-xs">{titleError}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs">Danh mục</Label>
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

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pa-start" className="text-xs">
                Bắt đầu
              </Label>
              <Input
                id="pa-start"
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={cn(
                  "mt-1 h-8 text-sm",
                  startTimeRangeError && "border-error-500"
                )}
              />
              {startTimeRangeError && (
                <p className="mt-0.5 text-error-500 text-xs">
                  {startTimeRangeError}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="pa-end" className="text-xs">
                Kết thúc
              </Label>
              <Input
                id="pa-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          {/* Conflict warning — shared activities */}
          {sharedConflicts.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error-500" />
              <div className="text-error-800 text-xs">
                <p className="font-medium">Trùng giờ với lịch trình chung:</p>
                {sharedConflicts.map((c) => (
                  <p key={c.id}>
                    {c.startTime} – {c.title}
                  </p>
                ))}
                <p className="mt-0.5 opacity-80">
                  Vui lòng chọn thời gian khác.
                </p>
              </div>
            </div>
          )}

          {/* Conflict warning — personal-to-personal */}
          {!sharedConflicts.length && personalConflict && (
            <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error-500" />
              <p className="text-error-800 text-xs">
                Bạn đã có ghi chú &quot;{personalConflict.title}&quot; vào lúc{" "}
                {personalConflict.startTime}. Vui lòng chọn thời gian khác.
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <Label htmlFor="pa-note" className="text-xs">
              Ghi chú (tùy chọn)
            </Label>
            <Textarea
              id="pa-note"
              placeholder="Thêm ghi chú..."
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 resize-none bg-surface-dim text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || hasBlockingConflict}
            className="bg-primary-500 text-white"
          >
            {isSubmitting && (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            )}
            {mode === "add" ? "Thêm" : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Personal Activity Row ────────────────────────────────────

interface PersonalActivityRowProps {
  activity: PersonalActivityWithId;
  conflicts: ActivityWithId[];
  onEdit: () => void;
  onDelete: () => void;
}

const PersonalActivityRow = ({
  activity,
  conflicts,
  onEdit,
  onDelete,
}: PersonalActivityRowProps) => {
  const config = ACTIVITY_TYPE_CONFIG[activity.category];
  const hasConflict = conflicts.length > 0;

  return (
    <div className="rounded-xl bg-secondary-800/60 p-3">
      <div className="flex items-start gap-2">
        <div className="flex w-12 shrink-0 flex-col items-end pt-0.5">
          {activity.startTime ? (
            <span className="font-mono font-semibold text-primary-400 text-xs leading-tight">
              {activity.startTime}
            </span>
          ) : (
            <span className="font-mono text-on-surface-variant/30 text-xs">
              –:–
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center self-stretch pt-1">
          <div className="h-2 w-2 shrink-0 rounded-full bg-primary-400" />
          <div className="my-1 w-px flex-1 bg-secondary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-sm">{config.icon}</span>
              <span className="font-semibold text-on-surface text-sm leading-snug">
                {activity.title}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-secondary-700 hover:text-on-surface"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md p-1 text-error-400 transition-colors hover:bg-error-900/20 hover:text-error-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {activity.note && (
            <p className="mt-1 text-on-surface-variant/60 text-xs">
              *{activity.note}
            </p>
          )}

          {/* Conflict warning inline */}
          {hasConflict && (
            <div className="mt-1 flex items-center gap-1 text-warning-500 text-xs">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>
                Trùng giờ với &quot;{conflicts[0].title}&quot;
                {conflicts.length > 1 &&
                  ` và ${conflicts.length - 1} hoạt động khác`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sortable wrapper for personal activity ──────────────────

const SortablePersonalActivityRow = ({
  activity,
  conflicts,
  onEdit,
  onDelete,
}: PersonalActivityRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

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
      <PersonalActivityRow
        activity={activity}
        conflicts={conflicts}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

// ─── Empty-period drop zone (personal) ───────────────────────

const PersonalDropZone = ({
  date,
  period,
  isOver,
  dropRef,
}: {
  date: string;
  period: string;
  isOver: boolean;
  dropRef: (el: HTMLElement | null) => void;
}) => {
  void date;
  void period;
  return (
    <div
      ref={dropRef}
      className={cn(
        "flex min-h-10 items-center justify-center rounded-xl border-2 border-dashed p-3 text-sm text-white italic opacity-50 transition-colors",
        isOver
          ? "border-secondary-400 bg-secondary-800/30"
          : "border-secondary-700/30"
      )}
    >
      Kéo hoạt động vào đây
    </div>
  );
};

// ─── Personal Period Section (with SortableContext + drop zone) ─

const PersonalPeriodSection = ({
  period,
  ui,
  date,
  activities,
  getConflicts,
  onOpenEdit,
  onDelete,
  onOpenAdd,
}: {
  period: TimePeriod;
  ui: { Icon: React.ElementType; iconColor: string; iconBg: string };
  date: string;
  activities: PersonalActivityWithId[];
  getConflicts: (pa: PersonalActivityWithId) => ActivityWithId[];
  onOpenEdit: (pa: PersonalActivityWithId) => void;
  onDelete: (id: string) => void;
  onOpenAdd: () => void;
}) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `personal-period-empty::${date}::${period}`,
    data: { type: "personal-period-empty", date, period },
    disabled: activities.length > 0,
  });

  return (
    <div className="flex flex-col gap-3 p-2">
      {/* Period header */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            ui.iconBg
          )}
        >
          <ui.Icon className={cn("h-4 w-4", ui.iconColor)} />
        </div>
        <span className="font-semibold text-on-surface text-sm">
          {TIME_PERIOD_CONFIG[period].label}
        </span>
        <span className="ml-auto text-on-surface-variant/60 text-xs">
          {PERIOD_TIME_LABEL[period]}
        </span>
      </div>

      {/* Sortable activity list */}
      {activities.length > 0 ? (
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {activities.map((pa) => (
              <SortablePersonalActivityRow
                key={pa.id}
                activity={pa}
                conflicts={getConflicts(pa)}
                onEdit={() => onOpenEdit(pa)}
                onDelete={() => onDelete(pa.id)}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        <PersonalDropZone
          date={date}
          period={period}
          isOver={isOver}
          dropRef={setDropRef}
        />
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={onOpenAdd}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-secondary-600/50 border-dashed py-3 font-medium text-on-surface-variant text-sm transition-colors hover:border-secondary-500 hover:bg-secondary-800/30"
      >
        <Plus className="h-4 w-4" />
        Thêm hoạt động
      </button>
    </div>
  );
};

// ─── Personal Dialog State ────────────────────────────────────

type PersonalDialogState =
  | { mode: "add"; date: string; period: TimePeriod }
  | { mode: "edit"; activity: PersonalActivityWithId };

// ─── Block Props ──────────────────────────────────────────────

export interface PersonalItineraryBlockProps {
  tripId: string;
  days: { dayNumber: number; date: string }[];
  sharedActivitiesByDate: Record<string, ActivityWithId[]>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── Main Component ──────────────────────────────────────────

export const PersonalItineraryBlock = ({
  tripId,
  days,
  sharedActivitiesByDate,
  isCollapsed,
  onToggleCollapse,
}: PersonalItineraryBlockProps) => {
  const {
    activities,
    isLoading,
    handleAdd,
    handleUpdate,
    handleDelete,
    handleBatchUpdateOrders,
  } = usePersonalItinerary(tripId);

  const [personalDialog, setPersonalDialog] =
    useState<PersonalDialogState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedPersonalActivity, setDraggedPersonalActivity] =
    useState<PersonalActivityWithId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build a flat id → { date, period, activity } lookup for drag end resolution
  const personalActivityMap = useMemo(() => {
    const map = new Map<
      string,
      { date: string; period: TimePeriod; activity: PersonalActivityWithId }
    >();
    for (const a of activities) {
      map.set(a.id, {
        date: a.date,
        period: getTimePeriod(a.startTime),
        activity: a,
      });
    }
    return map;
  }, [activities]);

  // Group personal activities by date
  const byDate = useCallback(
    (date: string, period: TimePeriod): PersonalActivityWithId[] =>
      activities
        .filter((a) => a.date === date && getTimePeriod(a.startTime) === period)
        .sort((a, b) => {
          const orderCmp = (a.order ?? 9999) - (b.order ?? 9999);
          return orderCmp !== 0
            ? orderCmp
            : (a.startTime ?? "").localeCompare(b.startTime ?? "");
        }),
    [activities]
  );

  const allShared = Object.values(sharedActivitiesByDate).flat();

  const getConflicts = (pa: PersonalActivityWithId): ActivityWithId[] =>
    findConflicts({ date: pa.date, startTime: pa.startTime }, allShared);

  const handlePersonalDragStart = (event: DragStartEvent) => {
    const entry = personalActivityMap.get(String(event.active.id));
    if (entry) setDraggedPersonalActivity(entry.activity);
  };

  const handlePersonalDragEnd = (event: DragEndEvent) => {
    setDraggedPersonalActivity(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeEntry = personalActivityMap.get(String(active.id));
    if (!activeEntry) return;

    // Check if dropped on an empty period zone
    const overData = (over.data?.current ?? {}) as {
      type?: string;
      date?: string;
      period?: string;
    };

    if (
      overData.type === "personal-period-empty" &&
      overData.date &&
      overData.period
    ) {
      const targetDate = overData.date;
      const targetPeriod = overData.period as TimePeriod;
      if (
        targetDate === activeEntry.date &&
        targetPeriod === activeEntry.period
      )
        return;
      const newStartTime = TIME_PERIOD_CONFIG[targetPeriod].defaultTime;
      // Conflict check (same startTime in target date)
      const hasConflict = activities.some(
        (a) =>
          a.id !== String(active.id) &&
          a.date === targetDate &&
          a.startTime === newStartTime
      );
      if (hasConflict) {
        toast.error("Trùng giờ với ghi chú khác. Vui lòng chỉnh sửa thủ công.");
        return;
      }
      const srcActs = activities.filter(
        (a) =>
          a.date === activeEntry.date &&
          getTimePeriod(a.startTime) === activeEntry.period &&
          a.id !== String(active.id)
      );
      const dstActs = activities.filter(
        (a) =>
          a.date === targetDate && getTimePeriod(a.startTime) === targetPeriod
      );
      handleBatchUpdateOrders([
        ...srcActs.map((a, i) => ({ id: a.id, order: i })),
        ...dstActs.map((a, i) => ({ id: a.id, order: i })),
        {
          id: String(active.id),
          order: dstActs.length,
          date: targetDate !== activeEntry.date ? targetDate : undefined,
          startTime: newStartTime,
        },
      ]).catch(() => toast.error("Không thể cập nhật thứ tự"));
      return;
    }

    const overEntry = personalActivityMap.get(String(over.id));
    if (!overEntry) return;

    const isSamePeriod =
      activeEntry.date === overEntry.date &&
      activeEntry.period === overEntry.period;

    if (isSamePeriod) {
      // ── REORDER within same period: swap startTimes between the two items only ──
      handleBatchUpdateOrders([
        {
          id: String(active.id),
          order: overEntry.activity.order ?? 0,
          startTime: overEntry.activity.startTime,
        },
        {
          id: String(over.id),
          order: activeEntry.activity.order ?? 0,
          startTime: activeEntry.activity.startTime,
        },
      ]).catch(() => toast.error("Không thể cập nhật thứ tự"));
    } else {
      // ── MOVE to different period/day ──
      // Rule: dragged item gets time = item-before-it + 1 min (or period base time if inserted first).
      // Existing items in BOTH periods keep their original startTimes — only `order` is updated.
      const srcActs = activities
        .filter(
          (a) =>
            a.date === activeEntry.date &&
            getTimePeriod(a.startTime) === activeEntry.period &&
            a.id !== String(active.id)
        )
        .sort((a, b) =>
          (a.order ?? 9999) !== (b.order ?? 9999)
            ? (a.order ?? 9999) - (b.order ?? 9999)
            : (a.startTime ?? "").localeCompare(b.startTime ?? "")
        );
      const dstActsRaw = activities
        .filter(
          (a) =>
            a.date === overEntry.date &&
            getTimePeriod(a.startTime) === overEntry.period
        )
        .sort((a, b) =>
          (a.order ?? 9999) !== (b.order ?? 9999)
            ? (a.order ?? 9999) - (b.order ?? 9999)
            : (a.startTime ?? "").localeCompare(b.startTime ?? "")
        );
      const overIdx = dstActsRaw.findIndex((a) => a.id === String(over.id));

      // ── INSERT + CASCADE SHIFT in destination period ──
      const dstBase = getSessionBase(overEntry.period);
      const { max: dstMax } = getSessionRange(overEntry.period);
      const isCrossDay = activeEntry.date !== overEntry.date;

      const draggedTime =
        overIdx > 0
          ? addMinutesToTime(dstActsRaw[overIdx - 1].startTime ?? dstBase, 1)
          : dstBase;

      type DstItem = { id: string; startTime: string };
      const dstItems: DstItem[] = dstActsRaw.map((a) => ({
        id: a.id,
        startTime: a.startTime ?? dstBase,
      }));
      dstItems.splice(overIdx, 0, {
        id: String(active.id),
        startTime: draggedTime,
      });

      for (let i = overIdx + 1; i < dstItems.length; i++) {
        if (dstItems[i].startTime <= dstItems[i - 1].startTime) {
          dstItems[i] = {
            ...dstItems[i],
            startTime: addMinutesToTime(dstItems[i - 1].startTime, 1),
          };
        } else {
          break;
        }
      }

      if (dstItems[dstItems.length - 1].startTime > dstMax) {
        toast.error("Không thể di chuyển: buổi đích đã đầy (vượt khung giờ).");
        return;
      }

      handleBatchUpdateOrders([
        ...srcActs.map((a, i) => ({ id: a.id, order: i })),
        ...dstItems.map((item, i) => {
          const isMovedItem = item.id === String(active.id);
          const original = dstActsRaw.find((a) => a.id === item.id);
          const timeChanged =
            isMovedItem ||
            (original && (original.startTime ?? dstBase) !== item.startTime);
          return {
            id: item.id,
            order: i,
            ...(timeChanged ? { startTime: item.startTime } : {}),
            ...(isCrossDay && isMovedItem ? { date: overEntry.date } : {}),
          };
        }),
      ]).catch(() => toast.error("Không thể cập nhật thứ tự"));
    }
  };

  return (
    <>
      {/* Block header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center justify-between rounded-2xl bg-surface-card px-4 py-3 ring-1 ring-black/5 transition hover:bg-surface-dim"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-secondary-400" />
          <span className="font-semibold text-on-surface text-sm">
            Lịch trình của tôi
          </span>
          <span className="text-on-surface-variant/60 text-xs">
            (Chỉ bạn thấy)
          </span>
          {activities.length > 0 && (
            <span className="rounded-full bg-secondary-700 px-2 py-0.5 text-white text-xs">
              {activities.length}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-on-surface-variant" />
        ) : (
          <ChevronDown className="h-4 w-4 text-on-surface-variant" />
        )}
      </button>

      {/* Block body */}
      {!isCollapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handlePersonalDragStart}
          onDragEnd={handlePersonalDragEnd}
        >
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              </div>
            ) : (
              days.map((day) => {
                const dayHasAny = TIME_PERIODS.some(
                  (p) => byDate(day.date, p).length > 0
                );
                void dayHasAny; // used only for future "empty day" UI gate

                return (
                  <div
                    key={day.date}
                    className="overflow-hidden rounded-2xl bg-surface-card shadow-sm ring-1 ring-black/5"
                  >
                    {/* Day header */}
                    <div className="flex items-center gap-3 border-black/5 border-b px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 font-bold text-sm text-white">
                        {day.dayNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-on-surface text-sm">
                          Ngày {day.dayNumber}
                        </p>
                      </div>
                    </div>

                    {/* Period sections */}
                    <div className="grid grid-cols-1 divide-y divide-transparent md:grid-cols-3 md:divide-x md:divide-y-0">
                      {TIME_PERIODS.map((period) => {
                        const periodActivities = byDate(day.date, period);
                        const ui = PERIOD_UI[period];

                        return (
                          <PersonalPeriodSection
                            key={period}
                            period={period}
                            ui={ui}
                            date={day.date}
                            activities={periodActivities}
                            getConflicts={getConflicts}
                            onOpenEdit={(pa) =>
                              setPersonalDialog({ mode: "edit", activity: pa })
                            }
                            onDelete={setConfirmDeleteId}
                            onOpenAdd={() =>
                              setPersonalDialog({
                                mode: "add",
                                date: day.date,
                                period,
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Drag overlay */}
          <DragOverlay>
            {draggedPersonalActivity && (
              <div className="w-full max-w-md rounded-xl bg-secondary-800 opacity-95 shadow-xl ring-2 ring-secondary-400">
                <PersonalActivityRow
                  activity={draggedPersonalActivity}
                  conflicts={[]}
                  // biome-ignore lint/suspicious/noEmptyBlockStatements: drag overlay no-op
                  onEdit={() => {}}
                  // biome-ignore lint/suspicious/noEmptyBlockStatements: drag overlay no-op
                  onDelete={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa ghi chú cá nhân?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác.
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
                  await handleDelete(id);
                  toast.success("Đã xóa ghi chú");
                } catch {
                  toast.error("Không thể xóa");
                }
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Central Personal Activity Dialog (Bugs 5+6) ──────── */}
      {personalDialog &&
        (() => {
          const isAdd = personalDialog.mode === "add";
          const editActivity = isAdd ? undefined : personalDialog.activity;
          const dialogDate = isAdd ? personalDialog.date : editActivity!.date;
          const dialogPeriod = isAdd
            ? personalDialog.period
            : getTimePeriod(editActivity!.startTime);
          const allSharedForDate = sharedActivitiesByDate[dialogDate] ?? [];
          const existingCountInPeriod = isAdd
            ? activities.filter(
                (a) =>
                  a.date === dialogDate &&
                  getTimePeriod(a.startTime) === dialogPeriod
              ).length
            : 0;
          return (
            <PersonalActivityForm
              open
              mode={isAdd ? "add" : "edit"}
              date={dialogDate}
              initialPeriod={dialogPeriod}
              existingCountInPeriod={existingCountInPeriod}
              initialValues={
                editActivity
                  ? {
                      title: editActivity.title,
                      startTime: editActivity.startTime ?? "",
                      endTime: editActivity.endTime ?? "",
                      category: editActivity.category,
                      note: editActivity.note ?? "",
                    }
                  : undefined
              }
              sharedActivities={allSharedForDate}
              existingPersonalActivities={activities}
              editingId={editActivity?.id}
              onSubmit={async (input) => {
                if (isAdd) {
                  await handleAdd(input);
                } else {
                  await handleUpdate(editActivity!.id, input);
                }
              }}
              onCancel={() => setPersonalDialog(null)}
            />
          );
        })()}
    </>
  );
};
