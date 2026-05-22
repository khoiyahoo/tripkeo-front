import { useNavigate } from "@tanstack/react-router";
import { Calendar, Loader2, MapPin, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { DatePicker } from "@/components/molecules/DatePicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import {
  formatDateRange,
  getStatusColor,
  getStatusLabel,
  getTripStatus,
  timestampToDateStr,
  tripToCardData,
} from "@/utils/format";

import type { TripWithId } from "@/types/firestore";

// ─── Helpers ──────────────────────────────────────────────────

const toInputDate = (date: Date): string => date.toISOString().split("T")[0];

const defaultFrom = toInputDate(new Date());
const defaultTo = toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

type StatusFilter = "all" | "upcoming" | "ongoing" | "completed";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "upcoming", label: "Sắp đi" },
  { value: "ongoing", label: "Đang đi" },
  { value: "completed", label: "Đã đi" },
];

// ─── Sub-components ───────────────────────────────────────────

const TripCardItem = ({
  trip,
  onClick,
}: {
  trip: ReturnType<typeof tripToCardData>;
  onClick: () => void;
}) => (
  <Card
    className="group relative cursor-pointer overflow-hidden rounded-md border-none"
    onClick={onClick}
  >
    <div className="relative h-42 overflow-hidden">
      <img
        src={trip.coverImage}
        alt={trip.name}
        className="h-full w-full rounded-md object-cover transition-transform"
      />
      <Badge
        className={`absolute top-3 right-3 ${getStatusColor(trip.status)}`}
      >
        {getStatusLabel(trip.status)}
      </Badge>
    </div>
    <div className="absolute top-1/2 -left-4.5 z-2 h-5 w-8.5 rounded-[20px] bg-surface"></div>
    <div className="absolute top-1/2 -right-4.5 z-2 h-5 w-8.5 rounded-[20px] bg-surface"></div>
    <CardContent className="p-2">
      <h3 className="truncate pt-2 font-semibold text-on-surface">
        {trip.name}
      </h3>
      <div className="mt-2 flex flex-col gap-1 text-on-surface-variant text-sm">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {trip.destination}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDateRange(trip.startDate, trip.endDate)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-neutral-600 border-t pt-3">
        <div className="flex -space-x-2">
          {trip.memberAvatars.slice(0, 3).map((avatar) => (
            <Avatar
              key={`${trip.id}-${avatar}`}
              className="h-7 w-7 border-2 border-white"
            >
              <AvatarImage src={avatar} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ))}
          {trip.memberCount > 3 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100 font-medium text-on-surface-variant text-xs">
              +{trip.memberCount - 3}
            </div>
          )}
        </div>
        <span className="flex items-center gap-1 text-on-surface-variant text-sm">
          <Users className="h-3.5 w-3.5" />
          {trip.memberCount}
        </span>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ onCreateTrip }: { onCreateTrip: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-300 border-dashed py-16">
    <MapPin className="mb-4 h-12 w-12 text-neutral-300" />
    <h3 className="font-semibold text-lg text-on-surface">
      Không có chuyến đi nào
    </h3>
    <p className="mt-1 text-on-surface-variant text-sm">
      Tạo chuyến đi đầu tiên để bắt đầu lên kế hoạch!
    </p>
    <Button className="mt-6" onClick={onCreateTrip}>
      <Plus className="mr-2 h-4 w-4" />
      Tạo chuyến đi đầu tiên
    </Button>
  </div>
);

// ─── Filter logic ─────────────────────────────────────────────

function filterTrips(
  trips: TripWithId[],
  fromStr: string,
  toStr: string,
  status: StatusFilter
): TripWithId[] {
  return trips.filter((trip) => {
    const tripStartStr = timestampToDateStr(trip.startDate);
    const tripEndStr = timestampToDateStr(trip.endDate);

    // Date range filter: trip overlaps the selected range
    const dateInRange =
      !fromStr || !toStr || (tripStartStr <= toStr && tripEndStr >= fromStr);

    if (!dateInRange) return false;

    // Status filter
    if (status === "all") return true;
    const tripStatus = getTripStatus(trip.startDate, trip.endDate);
    return tripStatus === status;
  });
}

// ─── Page ─────────────────────────────────────────────────────

export default function TripsPage() {
  const navigate = useNavigate();
  const { requireAuth } = useRequireAuth();
  const { trips, isLoading } = useTrips();

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const handleCreateTrip = requireAuth(() => {
    navigate({ to: "/trips/create" });
  });

  const handleTripClick = (tripId: string) => {
    navigate({ to: "/trips/$tripId", params: { tripId } });
  };

  const filteredTrips = useMemo(
    () => filterTrips(trips, fromDate, toDate, statusFilter),
    [trips, fromDate, toDate, statusFilter]
  );

  const filteredCards = filteredTrips.map(tripToCardData);

  return (
    <MainLayout currentPath="/trips">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl text-on-surface">Chuyến đi</h1>
          <Button onClick={handleCreateTrip} className="hidden sm:flex">
            <Plus className="mr-2 h-4 w-4" />
            Tạo chuyến đi
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              maxDate={toDate || undefined}
              className="h-9 w-36 text-sm"
              placeholder="Từ ngày"
            />
            <span className="text-on-surface-variant text-sm">—</span>
            <DatePicker
              value={toDate}
              onChange={setToDate}
              minDate={fromDate || undefined}
              className="h-9 w-36 text-sm"
              placeholder="Đến ngày"
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 rounded-lg bg-surface-dim p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`cursor-pointer rounded-md px-3 py-1.5 font-medium text-sm transition-colors ${
                  statusFilter === tab.value
                    ? "bg-primary-500 text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trip count */}
        {!isLoading && (
          <p className="text-on-surface-variant text-sm">
            {filteredCards.length > 0
              ? `${filteredCards.length} chuyến đi`
              : null}
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary-500" />
            <p className="text-on-surface-variant text-sm">
              Đang tải chuyến đi...
            </p>
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((trip) => (
              <TripCardItem
                key={trip.id}
                trip={trip}
                onClick={() => handleTripClick(trip.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState onCreateTrip={handleCreateTrip} />
        )}
      </div>

      {/* Mobile FAB */}
      <Button
        onClick={handleCreateTrip}
        size="icon"
        className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </MainLayout>
  );
}
