import { Clock, ExternalLink, GripVertical, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACTIVITY_TYPE_CONFIG } from "@/constants/trip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

import type { Activity, DaySchedule } from "@/types/trip";

const ActivityCard = ({ activity }: { activity: Activity }) => {
  const config = ACTIVITY_TYPE_CONFIG[activity.type];

  return (
    <Card className="group border-none shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex gap-3 p-3">
        <div className="flex flex-col items-center pt-1">
          <div className="cursor-grab text-outline-variant opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="h-4 w-4" />
          </div>
          <div
            className={cn(
              "mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-lg",
              config.bgColor
            )}
          >
            {config.icon}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate font-semibold text-on-surface text-sm">
                {activity.title}
              </h4>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant text-xs">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activity.time}
                  {activity.endTime && ` - ${activity.endTime}`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activity.location}</span>
                </span>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={cn("shrink-0 text-xs", config.bgColor, config.color)}
            >
              {config.label}
            </Badge>
          </div>
          {activity.note && (
            <p className="mt-2 text-on-surface-variant text-xs">
              {activity.note}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            {activity.cost !== undefined && activity.cost > 0 && (
              <span className="font-semibold text-primary-700 text-xs">
                {formatCurrency(activity.cost)}
              </span>
            )}
            {activity.mapsUrl && (
              <a
                href={activity.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-secondary-600 text-xs hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Xem bản đồ
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ItineraryTabProps {
  schedule: DaySchedule[];
}

export const ItineraryTab = ({ schedule }: ItineraryTabProps) => {
  return (
    <div className="space-y-6">
      {schedule.map((day) => (
        <section key={day.day}>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 font-bold text-sm text-white">
              {day.day}
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">Ngày {day.day}</h3>
              <p className="text-on-surface-variant text-xs">{day.date}</p>
            </div>
          </div>

          <div className="relative ml-4 space-y-3 border-primary-200 border-l-2 pl-6">
            {day.activities.map((activity) => (
              <div key={activity.id} className="relative">
                <div className="absolute top-3 -left-7.5 h-3 w-3 rounded-full border-2 border-primary-400 bg-white" />
                <ActivityCard activity={activity} />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="ml-0 border-dashed text-on-surface-variant"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Thêm hoạt động
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
};
