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
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Loader2,
  Map as MapIcon,
  MapPin,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Sun,
  Sunrise,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MapTab } from "@/components/organisms/MapTab";
import { PersonalItineraryBlock } from "@/components/organisms/PersonalItineraryBlock";
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
import { useFormDraft } from "@/hooks/useFormDraft";
import { cn } from "@/lib/utils";
import {
  addMinutesToTime,
  formatCurrency,
  formatDate,
  getDefaultStartTime,
  getSessionBase,
  getSessionRange,
} from "@/utils/format";

import type {
  ActivityWithId,
  CreateActivityInput,
  TripRole,
} from "@/types/firestore";
import type { ActivityType, TimePeriod } from "@/types/trip";

// ─── Period UI Config (Lucide icons) ─────────────────────────

const PERIOD_UI: Record<
  TimePeriod,
  { Icon: LucideIcon; iconColor: string; iconBg: string }
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
        "rounded-xl bg-secondary-800/60 p-3 transition-shadow",
        isDragging && "rotate-[0.5deg] shadow-xl ring-2 ring-primary-300"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Time column */}
        <div className="flex w-12 shrink-0 flex-col items-end pt-0.5">
          {activity.startTime ? (
            <>
              <span className="font-mono font-semibold text-tertiary-500 text-xs leading-tight">
                {activity.startTime}
              </span>
              {activity.endTime && (
                <span className="font-mono text-[10px] text-on-surface-variant/50 leading-tight">
                  {activity.endTime}
                </span>
              )}
            </>
          ) : (
            <span className="font-mono text-on-surface-variant/30 text-xs">
              –:–
            </span>
          )}
        </div>

        {/* Vertical connector */}
        <div className="flex shrink-0 flex-col items-center self-stretch pt-1">
          <div className="h-2 w-2 shrink-0 rounded-full bg-tertiary-500" />
          <div className="my-1 w-px flex-1 bg-secondary-600" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-sm leading-none">
                {config?.icon ?? "📌"}
              </span>
              <span className="font-semibold text-on-surface text-sm leading-snug">
                {activity.title}
              </span>
            </div>
            {canEdit && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-secondary-700 hover:text-on-surface"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity.id);
                  }}
                  className="rounded-md p-1 text-error-400 transition-colors hover:bg-error-900/20 hover:text-error-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {(activity.location || activity.mapsUrl) && (
            <div className="mt-1.5 flex items-center gap-1 text-on-surface-variant text-xs">
              <MapPin className="h-3 w-3 shrink-0 text-tertiary-500/70" />
              {activity.location && (
                <span className="truncate">{activity.location}</span>
              )}
              {activity.mapsUrl && (
                <a
                  href={activity.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 shrink-0 text-secondary-400 hover:text-secondary-300"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {activity.note && (
            <p className="mt-1 text-on-surface-variant/60 text-xs">
              *NOTE: {activity.note}
            </p>
          )}

          {activity.cost !== undefined && activity.cost > 0 && (
            <span className="mt-1.5 inline-block rounded-md bg-tertiary-900/30 px-1.5 py-0.5 font-semibold text-tertiary-500 text-xs">
              {formatCurrency(activity.cost)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sortable Activity Row (entire card draggable) ───────────

const SortableActivityRow = ({
  activity,
  onEdit,
  onDelete,
  canEdit,
}: {
  activity: ActivityWithId;
  onEdit: () => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id, disabled: !canEdit });

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
  note: string;
  period: TimePeriod;
}

const INITIAL_FORM: ActivityFormValues = {
  title: "",
  startTime: "",
  endTime: "",
  category: "sights",
  location: "",
  note: "",
  period: "morning",
};

const ActivityForm = ({
  open,
  mode,
  tripId,
  date,
  order,
  initialPeriod,
  initialValues,
  existingActivities,
  editingId,
  onSubmit,
  onCancel,
  onSuccess,
}: {
  open: boolean;
  mode: "add" | "edit";
  tripId: string;
  date: string;
  order: number;
  initialPeriod: TimePeriod;
  initialValues?: ActivityFormValues;
  /** Activities in the same date used for time-conflict detection */
  existingActivities?: ActivityWithId[];
  /** Id of the activity being edited — excluded from conflict check */
  editingId?: string;
  onSubmit: (input: CreateActivityInput) => Promise<unknown>;
  onCancel: () => void;
  onSuccess: () => void;
}) => {
  const draftKey = `draft_activity_${tripId}_${date}`;
  const { savedDraft, saveDraft, clearDraft, hasDraft } =
    useFormDraft<ActivityFormValues>(draftKey, INITIAL_FORM);

  const defaults = initialValues ?? INITIAL_FORM;
  const [title, setTitle] = useState(defaults.title);
  const activitiesInPeriod = (existingActivities ?? []).filter(
    (a) => a.startTime && getTimePeriod(a.startTime) === initialPeriod
  );
  const computedDefault =
    getDefaultStartTime(activitiesInPeriod, initialPeriod) ??
    TIME_PERIOD_CONFIG[initialPeriod].defaultTime;
  const [startTime, setStartTime] = useState(
    defaults.startTime || computedDefault
  );
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [category, setCategory] = useState<ActivityType>(defaults.category);
  const [location, setLocation] = useState(defaults.location);
  const [note, setNote] = useState(defaults.note);
  const [period, setPeriod] = useState<TimePeriod>(defaults.period);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(
    mode === "add" && hasDraft
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [endTimeError, setEndTimeError] = useState<string | null>(null);
  const [startTimeRangeError, setStartTimeRangeError] = useState<string | null>(
    null
  );

  // Auto-save draft (add mode only)
  useEffect(() => {
    if (mode !== "add") return;
    saveDraft({
      title,
      startTime,
      endTime,
      category,
      location,
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
    note,
    period,
    saveDraft,
  ]);

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    if (!startTime) {
      const periodActs = (existingActivities ?? []).filter(
        (a) => a.startTime && getTimePeriod(a.startTime) === newPeriod
      );
      setStartTime(
        getDefaultStartTime(periodActs, newPeriod) ??
          TIME_PERIOD_CONFIG[newPeriod].defaultTime
      );
    }
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    if (newTime) {
      const newPeriod = getTimePeriod(newTime);
      setPeriod(newPeriod);
      const range = getSessionRange(newPeriod);
      if (newTime < range.min || newTime > range.max) {
        setStartTimeRangeError(
          `Giờ phải từ ${range.min} đến ${range.max} cho buổi ${TIME_PERIOD_CONFIG[newPeriod].label}.`
        );
      } else {
        setStartTimeRangeError(null);
      }
    } else {
      setStartTimeRangeError(null);
    }
    if (endTime && newTime && endTime <= newTime) {
      setEndTimeError("Phải sau giờ bắt đầu");
    } else {
      setEndTimeError(null);
    }
  };

  // Bug 5: detect time conflict within the same day — block submission
  const timeConflict = useMemo(() => {
    if (!startTime || !existingActivities?.length) return null;
    const p = getTimePeriod(startTime);
    return (
      existingActivities.find(
        (a) =>
          a.startTime === startTime &&
          getTimePeriod(a.startTime) === p &&
          a.id !== editingId
      ) ?? null
    );
  }, [startTime, existingActivities, editingId]);

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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Thêm hoạt động" : "Chỉnh sửa hoạt động"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Draft banner (add mode only) */}
          {mode === "add" && showDraftBanner && (
            <div className="flex items-center justify-between rounded-lg bg-warning-50 px-3 py-2">
              <span className="flex items-center gap-2 text-warning-800 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Có bản nháp chưa lưu
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-warning-700 text-xs"
                  onClick={() => {
                    if (savedDraft) {
                      setTitle(savedDraft.title);
                      setStartTime(savedDraft.startTime);
                      setEndTime(savedDraft.endTime);
                      setCategory(savedDraft.category);
                      setLocation(savedDraft.location);
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
              className={cn(
                "mt-1 h-8 text-sm",
                titleError && "border-error-500"
              )}
            />
            {titleError && (
              <p className="mt-0.5 text-error-500 text-xs">{titleError}</p>
            )}
          </div>

          {/* Period + Category (required) */}
          <div className="flex flex-col gap-1">
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
                          <ui.Icon
                            className={cn("h-3.5 w-3.5", ui.iconColor)}
                          />
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
                Bắt đầu
                <span className="text-on-surface-variant/50">(tùy chọn)</span>
              </Label>
              <Input
                id="act-start"
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
            <p className="text-on-surface-variant/50 text-xs italic">
              *Tip: Nhập địa điểm để thấy được trên bản đồ
            </p>
            <Input
              id="act-location"
              placeholder="VD: Bà Nà Hills, Đà Nẵng"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>

          {/* Note (optional) */}
          <div>
            <Label
              htmlFor="act-note"
              className="flex items-center gap-1 text-xs"
            >
              Ghi chú
              <span className="text-on-surface-variant/50">(tùy chọn)</span>
            </Label>
            <Textarea
              id="act-note"
              placeholder="Thêm ghi chú..."
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 resize-none bg-surface-dim text-sm"
            />
          </div>
        </div>

        {/* Time conflict error — Bug 5 */}
        {timeConflict && startTime && (
          <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error-500" />
            <p className="text-error-700 text-xs">
              Đã có hoạt động &quot;{timeConflict.title}&quot; vào lúc{" "}
              {timeConflict.startTime}. Vui lòng chọn thời gian khác.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !!timeConflict ||
              !!startTimeRangeError ||
              !!endTimeError
            }
            className="bg-primary-500 text-white"
          >
            {isSubmitting && (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            )}
            {mode === "add" ? "Thêm hoạt động" : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Period Section ──────────────────────────────────────────

const PeriodSection = ({
  period,
  activities,
  date,
  totalActivitiesForDay,
  onDeleteActivity,
  onOpenAdd,
  onOpenEdit,
  canEditActivity,
  canAdd,
  currentUserRole,
}: {
  period: TimePeriod;
  activities: ActivityWithId[];
  date: string;
  totalActivitiesForDay: number;
  onDeleteActivity: (id: string) => void;
  onOpenAdd: (date: string, period: TimePeriod, order: number) => void;
  onOpenEdit: (activity: ActivityWithId) => void;
  canEditActivity: (a: ActivityWithId) => boolean;
  canAdd: boolean;
  currentUserRole?: TripRole;
}) => {
  const { label } = TIME_PERIOD_CONFIG[period];
  const ui = PERIOD_UI[period];

  // Make empty periods a valid drop target so cross-period DnD works even when
  // the destination period has no activities (SortableContext has no items to collide with).
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: `period-empty::${date}::${period}`,
    data: { type: "period-empty", date, period },
    disabled: activities.length > 0, // only needed when the period is truly empty
  });

  return (
    <div
      ref={activities.length === 0 ? setDropRef : undefined}
      className="flex flex-col gap-3"
    >
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
        <span className="font-semibold text-on-surface text-sm">{label}</span>
        <span className="ml-auto text-on-surface-variant/60 text-xs">
          {PERIOD_TIME_LABEL[period]}
        </span>
      </div>

      {/* Activity list */}
      {activities.length > 0 ? (
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {activities.map((activity) => (
              <SortableActivityRow
                key={activity.id}
                activity={activity}
                onEdit={() => onOpenEdit(activity)}
                onDelete={onDeleteActivity}
                canEdit={canEditActivity(activity)}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        /* Visual drop-zone shown when period is empty */
        <div
          className={cn(
            "flex min-h-10 items-center justify-center rounded-xl border-2 border-dashed p-3 text-sm text-white italic opacity-50 transition-colors",
            isDropOver
              ? "border-warning-400 bg-warning-900/20"
              : "border-secondary-700/30",
            currentUserRole === "member" || currentUserRole === "treasurer"
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
          )}
        >
          {currentUserRole === "member" || currentUserRole === "treasurer"
            ? "Thêm hoạt động"
            : "Kéo hoạt động vào đây"}
        </div>
      )}

      {/* Add button */}
      {canAdd && (
        <button
          type="button"
          onClick={() => onOpenAdd(date, period, totalActivitiesForDay)}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-warning-600 border-dashed py-3 font-medium text-sm text-warning-400 transition-colors hover:border-warning-500 hover:bg-warning-900/20"
        >
          <Plus className="h-4 w-4" />
          Thêm hoạt động
        </button>
      )}
    </div>
  );
};

// ─── Activity Dialog State ───────────────────────────────────

type ActivityDialogState =
  | { mode: "add"; date: string; period: TimePeriod; order: number }
  | { mode: "edit"; activity: ActivityWithId };

// ─── Main Component ──────────────────────────────────────────

interface ItineraryTabProps {
  tripId: string;
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
  currentUserRole?: TripRole;
  currentUserId?: string;
  ownerName?: string;
}

export const ItineraryTab = ({
  tripId,
  days,
  activitiesByDate,
  isLoading,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onBatchUpdateOrders,
  currentUserRole,
  currentUserId,
  ownerName,
}: ItineraryTabProps) => {
  const [activityDialog, setActivityDialog] =
    useState<ActivityDialogState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedActivity, setDraggedActivity] = useState<ActivityWithId | null>(
    null
  );

  // ── Collapse state (localStorage-backed) ────────────────────
  const sharedCollapseKey = `itinerary_shared_collapsed_${tripId}`;
  const personalCollapseKey = `itinerary_personal_collapsed_${tripId}`;

  const [isSharedCollapsed, setIsSharedCollapsed] = useState(
    () => localStorage.getItem(sharedCollapseKey) === "true"
  );
  const [isPersonalCollapsed, setIsPersonalCollapsed] = useState(
    () => localStorage.getItem(personalCollapseKey) === "true"
  );

  const toggleShared = () => {
    setIsSharedCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(sharedCollapseKey, String(next));
      return next;
    });
  };

  const togglePersonal = () => {
    setIsPersonalCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(personalCollapseKey, String(next));
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const canEditActivity = useCallback(
    (activity: ActivityWithId): boolean => {
      if (currentUserRole === "owner") return true;
      if (currentUserRole === "editor")
        return activity.createdBy === currentUserId;
      return false;
    },
    [currentUserRole, currentUserId]
  );

  const canAdd = currentUserRole === "owner" || currentUserRole === "editor";

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
    if (!activeEntry) return;

    // Handle drop onto an empty period (useDroppable zone, no activity items to target)
    const overData = (over.data?.current ?? {}) as {
      type?: string;
      date?: string;
      period?: string;
    };
    if (overData.type === "period-empty" && overData.date && overData.period) {
      const targetDate = overData.date;
      const targetPeriod = overData.period as TimePeriod;
      // No-op if already in this period
      if (
        targetDate === activeEntry.date &&
        targetPeriod === activeEntry.period
      )
        return;
      const newStartTime = TIME_PERIOD_CONFIG[targetPeriod].defaultTime;
      if (targetDate !== activeEntry.date) {
        // Cross-day: remove from source day, insert as first item in target day
        const sourceActs = (activitiesByDate[activeEntry.date] ?? []).filter(
          (a) => a.id !== String(active.id)
        );
        onBatchUpdateOrders([
          ...sourceActs.map((a, i) => ({ id: a.id, order: i })),
          {
            id: String(active.id),
            order: 0,
            startTime: newStartTime,
            date: targetDate,
          },
        ]);
      } else {
        // Same day, different period: update start time so period classification changes
        const dayActs = activitiesByDate[activeEntry.date] ?? [];
        const others = dayActs.filter((a) => a.id !== String(active.id));
        onBatchUpdateOrders([
          ...others.map((a, i) => ({ id: a.id, order: i })),
          {
            id: String(active.id),
            order: others.length,
            startTime: newStartTime,
          },
        ]);
      }
      return;
    }

    const overEntry = activityMap.get(String(over.id));
    if (!overEntry) return;

    const isSamePeriod =
      activeEntry.date === overEntry.date &&
      activeEntry.period === overEntry.period;

    if (isSamePeriod) {
      // ── REORDER within same period: swap startTimes between the two items only ──
      // Other items in the period are not touched.
      onBatchUpdateOrders([
        {
          id: String(active.id),
          order: overEntry.activity.order,
          startTime: overEntry.activity.startTime,
        },
        {
          id: String(over.id),
          order: activeEntry.activity.order,
          startTime: activeEntry.activity.startTime,
        },
      ]);
    } else {
      // ── MOVE to different period/day ──
      // Rule: dragged item gets time = item-before-it + 1 min (or period base time if inserted first).
      // Existing items in BOTH periods keep their original startTimes — only `order` is updated.
      const srcActs = (activitiesByDate[activeEntry.date] ?? [])
        .filter(
          (a) =>
            getTimePeriod(a.startTime) === activeEntry.period &&
            a.id !== String(active.id)
        )
        .sort((a, b) =>
          a.order !== b.order
            ? a.order - b.order
            : (a.startTime ?? "").localeCompare(b.startTime ?? "")
        );
      const dstActsRaw = (activitiesByDate[overEntry.date] ?? [])
        .filter((a) => getTimePeriod(a.startTime) === overEntry.period)
        .sort((a, b) =>
          a.order !== b.order
            ? a.order - b.order
            : (a.startTime ?? "").localeCompare(b.startTime ?? "")
        );
      const overIdx = dstActsRaw.findIndex((a) => a.id === String(over.id));

      // ── INSERT + CASCADE SHIFT in destination period ──────────
      const dstBase = getSessionBase(overEntry.period);
      const { max: dstMax } = getSessionRange(overEntry.period);
      const isCrossDay = activeEntry.date !== overEntry.date;

      // Initial time for dragged item
      const draggedTime =
        overIdx > 0
          ? addMinutesToTime(dstActsRaw[overIdx - 1].startTime ?? dstBase, 1)
          : dstBase;

      // Build destination list with dragged item spliced in
      type DstItem = { id: string; startTime: string };
      const dstItems: DstItem[] = dstActsRaw.map((a) => ({
        id: a.id,
        startTime: a.startTime ?? dstBase,
      }));
      dstItems.splice(overIdx, 0, {
        id: String(active.id),
        startTime: draggedTime,
      });

      // Cascade: push items whose time ≤ previous item's time
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

      // Reject if last cascaded time overflows the session
      if (dstItems[dstItems.length - 1].startTime > dstMax) {
        toast.error("Không thể di chuyển: buổi đích đã đầy (vượt khung giờ).");
        return;
      }

      onBatchUpdateOrders([
        // Source: reorder to fill gap, keep startTime
        ...srcActs.map((a, i) => ({ id: a.id, order: i })),
        // Destination: order for all items, startTime only where changed
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
      ]);
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
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {/* ── Left: shared + personal itinerary ───────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* ── Shared itinerary block ──────────────────────────────── */}
        {/* Block header (always visible) */}
        <button
          type="button"
          onClick={toggleShared}
          className="flex w-full items-center justify-between rounded-2xl bg-surface-card px-4 py-3 ring-1 ring-black/5 transition hover:bg-surface-dim"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-tertiary-500" />
            <span className="font-semibold text-on-surface text-sm">
              Lịch trình chung
            </span>
            <span className="rounded-full bg-tertiary-600 px-2 py-0.5 text-white text-xs">
              {Object.values(activitiesByDate).flat().length} hoạt động
            </span>
          </div>
          {isSharedCollapsed ? (
            <ChevronRight className="h-4 w-4 text-on-surface-variant" />
          ) : (
            <ChevronDown className="h-4 w-4 text-on-surface-variant" />
          )}
        </button>
        {/* Shared block body */}
        {!isSharedCollapsed && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              {/* Read-only banner for member/treasurer */}
              {(currentUserRole === "member" ||
                currentUserRole === "treasurer") && (
                <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                  <Eye className="h-4 w-4 shrink-0" />
                  <span>
                    Bạn chỉ có quyền xem lịch trình.
                    {ownerName ? (
                      <>
                        {" "}
                        Liên hệ <strong>{ownerName}</strong> nếu cần thay đổi.
                      </>
                    ) : (
                      " Liên hệ chủ chuyến đi nếu cần thay đổi."
                    )}
                  </span>
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
                    className="overflow-hidden rounded-2xl bg-surface-card shadow-sm ring-1 ring-black/5"
                  >
                    {/* Day header */}
                    <div className="flex items-center gap-3 border-black/5 border-b px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary-500 font-bold text-sm text-white">
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
                        <span className="shrink-0 rounded-full bg-tertiary-600 px-2.5 py-0.5 text-white text-xs">
                          {dayActivities.length} hoạt động
                        </span>
                      )}
                    </div>

                    {/* Period sections – 3 columns on desktop, stacked on mobile */}
                    <div className="grid grid-cols-1 divide-y divide-transparent md:grid-cols-3 md:divide-x md:divide-y-0">
                      {TIME_PERIODS.map((p) => (
                        <div key={p} className="p-2">
                          <PeriodSection
                            period={p}
                            activities={byPeriod[p]}
                            date={day.date}
                            totalActivitiesForDay={dayActivities.length}
                            onDeleteActivity={setConfirmDeleteId}
                            onOpenAdd={(d, period, order) =>
                              setActivityDialog({
                                mode: "add",
                                date: d,
                                period,
                                order,
                              })
                            }
                            onOpenEdit={(activity) =>
                              setActivityDialog({ mode: "edit", activity })
                            }
                            canEditActivity={canEditActivity}
                            canAdd={canAdd}
                            currentUserRole={currentUserRole}
                          />
                        </div>
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
                    Hành động này không thể hoàn tác. Hoạt động sẽ bị xóa vĩnh
                    viễn.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDeleteId(null)}
                  >
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
                <div className="w-full max-w-md rounded-xl bg-secondary-800 shadow-xl ring-2 ring-primary-400">
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
        )}{" "}
        {/* end !isSharedCollapsed */}
        {/* ── Personal itinerary block ─────────────────────────────── */}
        <PersonalItineraryBlock
          tripId={tripId}
          days={days}
          sharedActivitiesByDate={activitiesByDate}
          isCollapsed={isPersonalCollapsed}
          onToggleCollapse={togglePersonal}
        />
      </div>
      {/* end left column */}

      {/* ── Right: Map ───────────────────────────────────────────── */}
      <div className="w-full shrink-0 xl:sticky xl:top-4 xl:w-100 xl:self-start">
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface-card px-4 py-3 ring-1 ring-black/5">
          <MapIcon className="h-4 w-4 text-primary-400" />
          <span className="font-semibold text-on-surface text-sm">
            Bản đồ lịch trình
          </span>
        </div>
        <MapTab
          tripId={tripId}
          days={days}
          activitiesByDate={activitiesByDate}
          canEdit={currentUserRole === "owner" || currentUserRole === "editor"}
          onUpdateActivity={onUpdateActivity}
        />
      </div>
      {/* end right column */}

      {/* ─── Central Activity Dialog (Bugs 5+6) ──────────────────────── */}
      {activityDialog &&
        (() => {
          const isAdd = activityDialog.mode === "add";
          const editActivity = isAdd ? undefined : activityDialog.activity;
          const dialogDate = isAdd ? activityDialog.date : editActivity!.date;
          const dialogPeriod = isAdd
            ? activityDialog.period
            : getTimePeriod(editActivity!.startTime);
          const dialogOrder = isAdd
            ? activityDialog.order
            : editActivity!.order;
          const allForDate: ActivityWithId[] =
            activitiesByDate[dialogDate] ?? [];
          return (
            <ActivityForm
              open
              mode={isAdd ? "add" : "edit"}
              tripId={tripId}
              date={dialogDate}
              order={dialogOrder}
              initialPeriod={dialogPeriod}
              initialValues={
                editActivity
                  ? {
                      title: editActivity.title,
                      startTime: editActivity.startTime ?? "",
                      endTime: editActivity.endTime ?? "",
                      category: editActivity.category,
                      location: editActivity.location ?? "",
                      note: editActivity.note ?? "",
                      period: dialogPeriod,
                    }
                  : undefined
              }
              existingActivities={allForDate}
              editingId={editActivity?.id}
              onSubmit={
                isAdd
                  ? onAddActivity
                  : async (input) => {
                      await onUpdateActivity(editActivity!.id, input);
                    }
              }
              onCancel={() => setActivityDialog(null)}
              onSuccess={() => setActivityDialog(null)}
            />
          );
        })()}
    </div>
  );
};
