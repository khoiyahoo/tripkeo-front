import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
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
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Eye,
  GripVertical,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { useFormDraft } from "@/hooks/useFormDraft";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/utils/format";
import type { TimelinePeriod } from "@/utils/itineraryTimeline";
import {
  buildTimelineMoveUpdates,
  findActivitiesAtTime,
  getRelativeActivityTime,
  getSuggestedNewActivityTime,
  getTimelinePeriod,
  sortTimelineActivities,
} from "@/utils/itineraryTimeline";

import type {
  ActivityWithId,
  CreateActivityInput,
  TripRole,
} from "@/types/firestore";
import type { ActivityType } from "@/types/trip";

const CATEGORY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "transport", label: "Di chuyển" },
  { value: "stay", label: "Chỗ ở" },
  { value: "sights", label: "Tham quan" },
  { value: "food", label: "Ăn uống" },
  { value: "shopping", label: "Mua sắm" },
  { value: "entertainment", label: "Giải trí" },
  { value: "other", label: "Khác" },
];

const PERIOD_LABELS: Record<TimelinePeriod | "unscheduled", string> = {
  lateNight: "Khuya · 00:00–02:59",
  morning: "Sáng · 03:00–11:59",
  afternoon: "Chiều · 12:00–17:59",
  evening: "Tối · 18:00–23:59",
  unscheduled: "Chưa xếp giờ",
};

const getActivityPeriod = (
  activity: ActivityWithId
): TimelinePeriod | "unscheduled" =>
  activity.startTime ? getTimelinePeriod(activity.startTime) : "unscheduled";

const formatWeekday = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(
    new Date(`${date}T00:00:00`)
  );

interface EditorValues {
  title: string;
  startTime: string;
  endTime: string;
  category: ActivityType;
  location: string;
  note: string;
}

type AddPlacement =
  | { kind: "end" }
  | {
      kind: "relative";
      activityId: string;
      position: "before" | "after";
      startTime: string;
      order: number;
    };

const EMPTY_EDITOR_VALUES: EditorValues = {
  title: "",
  startTime: "09:00",
  endTime: "",
  category: "sights",
  location: "",
  note: "",
};

const timelineCollisionDetection: CollisionDetection = (args) => {
  const directHits = pointerWithin(args);
  return directHits.length > 0 ? directHits : closestCenter(args);
};

const NumericTimeInput = ({
  id,
  label,
  value,
  onChange,
  hasWarning = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hasWarning?: boolean;
}) => {
  const [initialHour = "", initialMinute = ""] = value.split(":");
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const lastEmittedValue = useRef(value);

  useEffect(() => {
    if (value === lastEmittedValue.current) return;
    const [nextHour = "", nextMinute = ""] = value.split(":");
    setHour(nextHour);
    setMinute(nextMinute);
    lastEmittedValue.current = value;
  }, [value]);

  const normalizePart = (raw: string, max: number) => {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    if (!digits) return "";
    return String(Math.min(Number(digits), max));
  };

  const emitTime = (nextHour: string, nextMinute: string) => {
    if (!nextHour && !nextMinute) {
      lastEmittedValue.current = "";
      onChange("");
      return;
    }
    const safeHour = nextHour || "0";
    const safeMinute = nextMinute || "0";
    const nextValue = `${safeHour.padStart(2, "0")}:${safeMinute.padStart(2, "0")}`;
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  };

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1 flex items-center gap-1">
        <Input
          id={`${id}-hour`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={hour}
          placeholder="00"
          onChange={(event) => {
            const nextHour = normalizePart(event.target.value, 23);
            setHour(nextHour);
            if (nextHour && !minute) setMinute("00");
            emitTime(nextHour, minute || (nextHour ? "00" : ""));
          }}
          onBlur={() => setHour((current) => current.padStart(2, "0"))}
          className={cn(
            "h-11 w-14 px-1 text-center font-mono",
            hasWarning &&
              "border-warning-500 bg-warning-50 ring-1 ring-warning-400"
          )}
          aria-invalid={hasWarning || undefined}
          aria-label={`${label} - giờ`}
        />
        <span className="font-semibold text-on-surface-variant">:</span>
        <Input
          id={`${id}-minute`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={minute}
          placeholder="00"
          onChange={(event) => {
            const nextMinute = normalizePart(event.target.value, 59);
            setMinute(nextMinute);
            if (nextMinute && !hour) setHour("00");
            emitTime(hour || (nextMinute ? "00" : ""), nextMinute);
          }}
          onBlur={() => setMinute((current) => current.padStart(2, "0"))}
          className={cn(
            "h-11 w-14 px-1 text-center font-mono",
            hasWarning &&
              "border-warning-500 bg-warning-50 ring-1 ring-warning-400"
          )}
          aria-invalid={hasWarning || undefined}
          aria-label={`${label} - phút`}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => {
              setHour("");
              setMinute("");
              lastEmittedValue.current = "";
              onChange("");
            }}
            aria-label={`Xóa ${label.toLowerCase()}`}
            title={`Xóa ${label.toLowerCase()}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

const InlineActivityEditor = ({
  mode,
  tripId,
  date,
  order,
  initialValues,
  existingActivities,
  draftId,
  onSubmit,
  onCancel,
}: {
  mode: "add" | "edit";
  tripId: string;
  date: string;
  order: number;
  initialValues: EditorValues;
  existingActivities: ActivityWithId[];
  /** Identifies the exact add slot so drafts from neighbouring slots never collide. */
  draftId?: string;
  onSubmit: (input: CreateActivityInput) => Promise<unknown>;
  onCancel: () => void;
}) => {
  const draftKey = `draft_activity_${tripId}_${date}_${draftId ?? "new"}`;
  const { savedDraft, saveDraft, clearDraft, hasDraft } =
    useFormDraft<EditorValues>(draftKey, initialValues);
  const [values, setValues] = useState(initialValues);
  const [showDetails, setShowDetails] = useState(
    mode === "edit" ||
      Boolean(
        initialValues.endTime || initialValues.location || initialValues.note
      )
  );
  const [showDraft, setShowDraft] = useState(mode === "add" && hasDraft);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const skipInitialDraftSave = useRef(mode === "add" && hasDraft);

  useEffect(() => {
    if (mode !== "add") return;
    // Keep a previous draft intact until the user explicitly restores or discards it.
    if (skipInitialDraftSave.current) {
      skipInitialDraftSave.current = false;
      return;
    }
    saveDraft(values);
  }, [mode, saveDraft, values]);

  const updateValue = <K extends keyof EditorValues>(
    key: K,
    value: EditorValues[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const timeConflicts = findActivitiesAtTime(
    existingActivities,
    values.startTime
  );

  const handleCancel = () => {
    // A close action must not lose edits made within the debounce window.
    if (mode === "add") saveDraft(values, true);
    onCancel();
  };

  const handleSubmit = async () => {
    const title = values.title.trim();
    if (!title) {
      setTitleError("Nhập tên hoạt động");
      return;
    }
    if (title.length > 100) {
      setTitleError("Tên hoạt động tối đa 100 ký tự");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        date,
        order,
        title,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        category: values.category,
        location: values.location.trim() || undefined,
        note: values.note.trim() || undefined,
      });
      if (mode === "add") clearDraft();
      toast.success(
        mode === "add" ? "Đã thêm hoạt động" : "Đã cập nhật hoạt động"
      );
      onCancel();
    } catch {
      toast.error(
        mode === "add" ? "Không thể thêm hoạt động" : "Không thể lưu thay đổi"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") handleCancel();
      }}
      className="rounded-2xl border border-primary-200 bg-surface-card p-3 shadow-sm sm:p-4"
    >
      {showDraft && savedDraft && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning-50 px-3 py-2 text-warning-800 text-xs">
          <span className="flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Có bản nháp chưa lưu
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-warning-800 text-xs"
              onClick={() => {
                setValues(savedDraft);
                setShowDraft(false);
              }}
            >
              Khôi phục
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => {
                clearDraft();
                setShowDraft(false);
              }}
            >
              Bỏ qua
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_176px_auto] sm:items-end">
        <div>
          <Label htmlFor={`${mode}-activity-title`} className="sr-only">
            Tên hoạt động
          </Label>
          <Input
            id={`${mode}-activity-title`}
            autoFocus
            value={values.title}
            placeholder="Tên hoạt động"
            onChange={(event) => {
              updateValue("title", event.target.value);
              setTitleError(null);
            }}
            className={cn("h-11", titleError && "border-error-500")}
          />
          {titleError && (
            <p className="mt-1 text-error-500 text-xs">{titleError}</p>
          )}
        </div>
        <NumericTimeInput
          id={`${mode}-activity-time`}
          label="Bắt đầu"
          value={values.startTime}
          onChange={(value) => updateValue("startTime", value)}
          hasWarning={timeConflicts.length > 0}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 flex-1 bg-primary-500 text-white sm:flex-none"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {mode === "add" ? "Thêm" : "Lưu"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={handleCancel}
            aria-label="Hủy"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {timeConflicts.length > 0 && (
        <p
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-warning-50 px-2.5 py-2 text-warning-800 text-xs"
          role="status"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Trùng giờ {values.startTime} với{" "}
          {timeConflicts.map((activity) => activity.title).join(", ")}.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowDetails((value) => !value)}
        className="mt-2 flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium text-on-surface-variant text-sm transition-colors hover:bg-surface-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
      >
        {showDetails ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {showDetails ? "Ẩn chi tiết" : "Thêm chi tiết"}
      </button>

      {showDetails && (
        <div className="mt-2 grid gap-3 border-black/5 border-t pt-3 sm:grid-cols-2">
          <NumericTimeInput
            id={`${mode}-activity-end`}
            label="Kết thúc"
            value={values.endTime}
            onChange={(value) => updateValue("endTime", value)}
          />
          <div>
            <Label className="text-xs">Loại hoạt động</Label>
            <Select
              value={values.category}
              onValueChange={(value) =>
                updateValue("category", value as ActivityType)
              }
            >
              <SelectTrigger className="mt-1 h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`${mode}-activity-location`} className="text-xs">
              Địa điểm
            </Label>
            <Input
              id={`${mode}-activity-location`}
              value={values.location}
              placeholder="Địa điểm (không bắt buộc)"
              onChange={(event) => updateValue("location", event.target.value)}
              className="mt-1 h-10"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`${mode}-activity-note`} className="text-xs">
              Ghi chú
            </Label>
            <Textarea
              id={`${mode}-activity-note`}
              rows={2}
              value={values.note}
              placeholder="Thông tin cần nhớ"
              onChange={(event) => updateValue("note", event.target.value)}
              className="mt-1 resize-none"
            />
          </div>
        </div>
      )}
    </form>
  );
};

const ActivityCard = ({
  activity,
  canEdit,
  canAdd,
  isDragging,
  dragHandle,
  onEdit,
  onDelete,
  onAddBefore,
  onAddAfter,
}: {
  activity: ActivityWithId;
  canEdit: boolean;
  canAdd?: boolean;
  isDragging?: boolean;
  dragHandle?: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onAddBefore?: () => void;
  onAddAfter?: () => void;
}) => {
  const category = ACTIVITY_TYPE_CONFIG[activity.category];
  return (
    <article
      onClick={canEdit ? onEdit : undefined}
      className={cn(
        "group relative rounded-2xl border border-black/5 bg-surface-card p-3 shadow-sm transition-[box-shadow,border-color] sm:p-4",
        canEdit && "cursor-pointer hover:border-primary-200 hover:shadow-md",
        isDragging && "shadow-xl ring-2 ring-primary-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex w-14 shrink-0 flex-col pt-0.5 font-mono">
          <span className="font-semibold text-on-surface text-sm">
            {activity.startTime ?? "—:—"}
          </span>
          {activity.endTime && (
            <span className="mt-0.5 text-on-surface-variant text-xs">
              {activity.endTime}
            </span>
          )}
        </div>
        <div className="relative flex self-stretch">
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-primary-100" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-start gap-1.5">
                {dragHandle}
                <h4 className="font-semibold text-on-surface leading-snug">
                  {activity.title}
                </h4>
              </div>
              <span
                className={cn(
                  "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs",
                  category.bgColor,
                  category.color
                )}
              >
                {category.label}
              </span>
            </div>
            {(canAdd || canEdit) && (
              <div className="flex shrink-0 gap-1">
                {canAdd && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-500 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                        aria-label={`Thêm hoạt động gần ${activity.title}`}
                        title="Thêm hoạt động gần đây"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-56"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuItem
                        className="min-h-11 cursor-pointer focus:text-on-surface"
                        onSelect={onAddBefore}
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="flex flex-col">
                          <span>Thêm phía trên</span>
                          <span className="text-on-surface-variant text-xs">
                            Gợi ý -15 phút
                          </span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11 cursor-pointer focus:text-on-surface"
                        onSelect={onAddAfter}
                      >
                        <ArrowDown className="h-4 w-4" />
                        <span className="flex flex-col">
                          <span>Thêm phía dưới</span>
                          <span className="text-on-surface-variant text-xs">
                            Gợi ý +15 phút
                          </span>
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit();
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-surface-dim hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                      aria-label={`Chỉnh sửa ${activity.title}`}
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-error-500 transition-colors hover:bg-error-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-400"
                      aria-label={`Xóa ${activity.title}`}
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {(activity.location || activity.mapsUrl) && (
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-on-surface-variant text-sm">
              <MapPin className="h-4 w-4 shrink-0" />
              {activity.location && (
                <span className="truncate">{activity.location}</span>
              )}
              {activity.mapsUrl && (
                <a
                  href={activity.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-surface-dim"
                  aria-label="Mở địa điểm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
          {activity.note && (
            <p className="mt-2 text-on-surface-variant text-sm">
              {activity.note}
            </p>
          )}
          {activity.cost !== undefined && activity.cost > 0 && (
            <p className="mt-2 font-medium text-primary-700 text-sm">
              {formatCurrency(activity.cost)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

const SortableActivityCard = ({
  activity,
  index,
  canEdit,
  canAdd,
  onEdit,
  onDelete,
  onAddBefore,
  onAddAfter,
}: {
  activity: ActivityWithId;
  index: number;
  canEdit: boolean;
  canAdd: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddBefore: () => void;
  onAddAfter: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity.id,
    data: { type: "activity", date: activity.date, index },
    disabled: !canEdit,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.25 : 1,
      }}
    >
      <ActivityCard
        activity={activity}
        canEdit={canEdit}
        canAdd={canAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddBefore={onAddBefore}
        onAddAfter={onAddAfter}
        dragHandle={
          canEdit ? (
            <button
              ref={setActivatorNodeRef}
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="-ml-2 flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 active:cursor-grabbing"
              aria-label={`Kéo để di chuyển ${activity.title}`}
              title="Kéo để di chuyển"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
};

const DayChip = ({
  day,
  count,
  selected,
  dragging,
  onSelect,
}: {
  day: { dayNumber: number; date: string };
  count: number;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${day.date}`,
    data: { type: "day-chip", date: day.date },
    disabled: !dragging,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex min-h-16 min-w-24 shrink-0 flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
        selected
          ? "border-primary-500 bg-primary-500 text-white"
          : "border-black/5 bg-surface-card text-on-surface hover:bg-surface-dim",
        isOver &&
          "border-primary-400 bg-primary-100 text-primary-900 ring-2 ring-primary-300"
      )}
    >
      <span className="font-semibold text-sm">
        Ngày {day.dayNumber} · {formatWeekday(day.date)}
      </span>
      <span
        className={cn(
          "mt-0.5 text-xs",
          selected ? "text-white/80" : "text-on-surface-variant"
        )}
      >
        {count} hoạt động
      </span>
    </button>
  );
};

const EmptyTimeline = ({
  date,
  canAdd,
  onAdd,
}: {
  date: string;
  canAdd: boolean;
  onAdd: () => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeline-${date}`,
    data: { type: "timeline-empty", date, index: 0 },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-44 flex-col items-center justify-center rounded-2xl border border-black/5 bg-surface-card px-4 text-center",
        isOver && "border-primary-300 bg-primary-50 ring-2 ring-primary-200"
      )}
    >
      <Clock3 className="h-8 w-8 text-on-surface-variant/50" />
      <p className="mt-3 font-medium text-on-surface">
        Ngày này chưa có hoạt động
      </p>
      <p className="mt-1 text-on-surface-variant text-sm">
        Bắt đầu bằng một hoạt động đơn giản, bạn có thể bổ sung chi tiết sau.
      </p>
      {canAdd && (
        <Button onClick={onAdd} variant="outline" className="mt-4 h-11 gap-2">
          <Plus className="h-4 w-4" />
          Thêm hoạt động
        </Button>
      )}
    </div>
  );
};

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
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? "");
  const [addPlacement, setAddPlacement] = useState<AddPlacement | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityWithId | null>(
    null
  );
  const [deleteActivity, setDeleteActivity] = useState<ActivityWithId | null>(
    null
  );
  const [draggedActivity, setDraggedActivity] = useState<ActivityWithId | null>(
    null
  );
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredDate = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (days.length > 0 && !days.some((day) => day.date === selectedDate))
      setSelectedDate(days[0].date);
  }, [days, selectedDate]);

  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    []
  );

  const selectedDay =
    days.find((day) => day.date === selectedDate) ?? days[0] ?? null;
  const selectedActivities = useMemo(
    () =>
      sortTimelineActivities(activitiesByDate[selectedDay?.date ?? ""] ?? []),
    [activitiesByDate, selectedDay?.date]
  );
  const canAdd = currentUserRole === "owner" || currentUserRole === "editor";
  const canEdit = (activity: ActivityWithId) =>
    currentUserRole === "owner" ||
    (currentUserRole === "editor" && activity.createdBy === currentUserId);

  const resetEditor = () => {
    setAddPlacement(null);
    setEditingActivity(null);
  };

  const openRelativeAdd = (
    activity: ActivityWithId,
    position: "before" | "after"
  ) => {
    setEditingActivity(null);
    setAddPlacement({
      kind: "relative",
      activityId: activity.id,
      position,
      startTime: getRelativeActivityTime(activity.startTime, position),
      order: activity.order + (position === "before" ? -0.5 : 0.5),
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activity = Object.values(activitiesByDate)
      .flat()
      .find((item) => item.id === String(event.active.id));
    setDraggedActivity(activity ?? null);
    resetEditor();
  };

  const handleDragOver = (event: DragOverEvent) => {
    const data = event.over?.data.current as
      | { type?: string; date?: string }
      | undefined;
    if (data?.type !== "day-chip" || !data.date || data.date === selectedDate) {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
      hoveredDate.current = null;
      return;
    }
    if (hoveredDate.current === data.date) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoveredDate.current = data.date;
    hoverTimer.current = setTimeout(() => {
      setSelectedDate(data.date!);
      hoveredDate.current = null;
      hoverTimer.current = null;
    }, 400);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    hoveredDate.current = null;
    const activeId = String(event.active.id);
    const over = event.over;
    setDraggedActivity(null);
    if (!over || activeId === String(over.id)) return;
    const data = over.data.current as
      | { type?: string; date?: string; index?: number }
      | undefined;
    const targetDate = data?.date ?? selectedDate;
    const destination = sortTimelineActivities(
      (activitiesByDate[targetDate] ?? []).filter(
        (item) => item.id !== activeId
      )
    );
    const targetIndex =
      data?.type === "activity"
        ? (data.index ?? destination.length)
        : destination.length;
    const result = buildTimelineMoveUpdates({
      activitiesByDate,
      activeId,
      targetDate,
      targetIndex,
      preserveTime: data?.type === "day-chip",
    });
    if (!result) return;
    try {
      await onBatchUpdateOrders(result.updates);
      setSelectedDate(result.placement.date);
      toast.success(`Đã chuyển hoạt động đến ${result.placement.startTime}`);
    } catch {
      toast.error("Không thể di chuyển hoạt động");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  const editorDefaults: EditorValues = editingActivity
    ? {
        title: editingActivity.title,
        startTime: editingActivity.startTime ?? "",
        endTime: editingActivity.endTime ?? "",
        category: editingActivity.category,
        location: editingActivity.location ?? "",
        note: editingActivity.note ?? "",
      }
    : {
        ...EMPTY_EDITOR_VALUES,
        startTime:
          addPlacement?.kind === "relative"
            ? addPlacement.startTime
            : getSuggestedNewActivityTime(selectedActivities),
      };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={timelineCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggedActivity(null)}
    >
      <div className="space-y-4 pb-6">
        <div className="sticky top-13 z-10 -mx-4 border-black/5 border-b bg-surface/95 px-4 py-3 backdrop-blur sm:top-14 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {days.map((day) => (
              <DayChip
                key={day.date}
                day={day}
                count={(activitiesByDate[day.date] ?? []).length}
                selected={selectedDay?.date === day.date}
                dragging={Boolean(draggedActivity)}
                onSelect={() => {
                  setSelectedDate(day.date);
                  resetEditor();
                }}
              />
            ))}
          </div>
        </div>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-on-surface-variant text-sm">
              {selectedDay ? formatDate(selectedDay.date) : "Lịch trình"}
            </p>
            <h2 className="font-bold text-on-surface text-xl">
              Ngày {selectedDay?.dayNumber ?? "—"}
            </h2>
          </div>
          {canAdd && !addPlacement && !editingActivity && selectedDay && (
            <Button
              onClick={() => setAddPlacement({ kind: "end" })}
              className="h-11 gap-2 bg-primary-500 text-white"
            >
              <Plus className="h-4 w-4" />
              Thêm hoạt động
            </Button>
          )}
        </header>

        {(currentUserRole === "member" || currentUserRole === "treasurer") && (
          <div className="flex items-start gap-2 rounded-xl bg-warning-50 px-3 py-2.5 text-sm text-warning-800">
            <Eye className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Bạn đang xem lịch trình chung.{" "}
              {ownerName
                ? `Liên hệ ${ownerName} nếu cần thay đổi.`
                : "Liên hệ chủ chuyến đi nếu cần thay đổi."}
            </span>
          </div>
        )}

        {addPlacement?.kind === "end" && selectedDay && (
          <InlineActivityEditor
            key={`add-${selectedDay.date}`}
            mode="add"
            tripId={tripId}
            date={selectedDay.date}
            order={selectedActivities.length}
            initialValues={editorDefaults}
            existingActivities={selectedActivities}
            draftId="end"
            onSubmit={onAddActivity}
            onCancel={() => setAddPlacement(null)}
          />
        )}

        {selectedDay && selectedActivities.length === 0 && !addPlacement ? (
          <EmptyTimeline
            date={selectedDay.date}
            canAdd={canAdd}
            onAdd={() => setAddPlacement({ kind: "end" })}
          />
        ) : (
          <SortableContext
            items={selectedActivities.map((activity) => activity.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {selectedActivities.map((activity, index) => {
                const previous = selectedActivities[index - 1];
                const period = getActivityPeriod(activity);
                const showPeriod =
                  !previous || getActivityPeriod(previous) !== period;
                const relativeAdd =
                  addPlacement?.kind === "relative" &&
                  addPlacement.activityId === activity.id
                    ? addPlacement
                    : null;
                return (
                  <div key={activity.id} className="space-y-2">
                    {showPeriod && (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="shrink-0 font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                          {PERIOD_LABELS[period]}
                        </span>
                        <span className="h-px flex-1 bg-black/5" />
                      </div>
                    )}
                    {relativeAdd?.position === "before" && (
                      <InlineActivityEditor
                        key={`add-before-${activity.id}`}
                        mode="add"
                        tripId={tripId}
                        date={activity.date}
                        order={relativeAdd.order}
                        initialValues={editorDefaults}
                        existingActivities={selectedActivities}
                        draftId={`before-${activity.id}`}
                        onSubmit={onAddActivity}
                        onCancel={() => setAddPlacement(null)}
                      />
                    )}
                    {editingActivity?.id === activity.id ? (
                      <InlineActivityEditor
                        key={`edit-${activity.id}`}
                        mode="edit"
                        tripId={tripId}
                        date={activity.date}
                        order={activity.order}
                        initialValues={editorDefaults}
                        existingActivities={selectedActivities.filter(
                          (item) => item.id !== activity.id
                        )}
                        onSubmit={(input) =>
                          onUpdateActivity(activity.id, input)
                        }
                        onCancel={() => setEditingActivity(null)}
                      />
                    ) : (
                      <SortableActivityCard
                        activity={activity}
                        index={index}
                        canEdit={canEdit(activity)}
                        canAdd={canAdd}
                        onAddBefore={() => openRelativeAdd(activity, "before")}
                        onAddAfter={() => openRelativeAdd(activity, "after")}
                        onEdit={() => {
                          setAddPlacement(null);
                          setEditingActivity(activity);
                        }}
                        onDelete={() => setDeleteActivity(activity)}
                      />
                    )}
                    {relativeAdd?.position === "after" && (
                      <InlineActivityEditor
                        key={`add-after-${activity.id}`}
                        mode="add"
                        tripId={tripId}
                        date={activity.date}
                        order={relativeAdd.order}
                        initialValues={editorDefaults}
                        existingActivities={selectedActivities}
                        draftId={`after-${activity.id}`}
                        onSubmit={onAddActivity}
                        onCancel={() => setAddPlacement(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        )}
      </div>

      <Dialog
        open={Boolean(deleteActivity)}
        onOpenChange={(open) => {
          if (!open) setDeleteActivity(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa hoạt động?</DialogTitle>
            <DialogDescription>
              “{deleteActivity?.title}” sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteActivity(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteActivity) return;
                const activity = deleteActivity;
                setDeleteActivity(null);
                try {
                  await onDeleteActivity(activity.id);
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

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {draggedActivity && (
          <div className="w-[min(34rem,calc(100vw-2rem))]">
            <ActivityCard
              activity={draggedActivity}
              canEdit={false}
              isDragging
              onEdit={() => undefined}
              onDelete={() => undefined}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
