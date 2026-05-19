import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Plus,
  Route,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvitations } from "@/hooks/useMembers";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  formatDateRange,
  getCountdown,
  getStatusColor,
  getStatusLabel,
  tripToCardData,
} from "@/utils/format";

import type { TripWithId } from "@/types/firestore";

interface StatCardItem {
  icon: typeof Route;
  label: string;
  value: string;
  sublabel: string;
  accentClassName: string;
}

interface DashboardTripRowProps {
  trip: ReturnType<typeof tripToCardData>;
  onClick: () => void;
}

interface InviteRowProps {
  invitation: {
    id: string;
    tripId: string;
    tripName: string;
    destination: string;
    invitedByName: string;
    role: "treasurer" | "editor" | "member";
  };
  onAccept: () => void;
  onDecline: () => void;
}

const StatCardsSection = ({ trips }: { trips: TripWithId[] }) => {
  const totalTrips = trips.length;
  const nextTrip = trips
    .filter((trip) => trip.startDate.toDate() > new Date())
    .sort(
      (firstTrip, secondTrip) =>
        firstTrip.startDate.toDate().getTime() -
        secondTrip.startDate.toDate().getTime()
    )[0];
  const activeTrips = trips.filter((trip) => {
    const now = Date.now();
    return (
      trip.startDate.toDate().getTime() <= now &&
      trip.endDate.toDate().getTime() >= now
    );
  }).length;
  const totalMembers = new Set(
    trips.flatMap((trip) => Object.keys(trip.members))
  ).size;

  const items: StatCardItem[] = [
    {
      icon: Route,
      label: "Tổng chuyến đi",
      value: `${totalTrips}`,
      sublabel: "Tất cả kế hoạch đã tạo",
      accentClassName: "bg-primary-500/16 text-primary-400",
    },
    {
      icon: Clock3,
      label: "Chuyến sắp tới",
      value: nextTrip
        ? (getCountdown(nextTrip.startDate) ?? "Sắp diễn ra")
        : "Chưa có",
      sublabel: nextTrip?.destination ?? "Sẵn sàng tạo lịch trình mới",
      accentClassName: "bg-warning-500/16 text-warning-400",
    },
    {
      icon: TrendingUp,
      label: "Đang diễn ra",
      value: `${activeTrips}`,
      sublabel:
        activeTrips > 0
          ? "Đang theo dõi tiến độ"
          : "Không có chuyến đang hoạt động",
      accentClassName: "bg-success-500/16 text-success-400",
    },
    {
      icon: Users,
      label: "Thành viên",
      value: `${totalMembers}`,
      sublabel: "Bạn đồng hành trong hệ thống",
      accentClassName: "bg-secondary-500/16 text-secondary-300",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="text-on-surface-variant text-sm">{item.label}</p>
              <p className="mt-3 font-semibold text-3xl text-white">
                {item.value}
              </p>
              <p className="mt-2 text-secondary-300 text-xs">{item.sublabel}</p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                item.accentClassName
              )}
            >
              <item.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const DashboardTripRow = ({ trip, onClick }: DashboardTripRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-transparent bg-surface-card/40 px-4 py-4 text-left transition-all hover:border-outline-variant hover:bg-surface-dim/80"
  >
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={trip.coverImage}
        alt={trip.name}
        className="h-14 w-14 rounded-2xl object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{trip.name}</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-on-surface-variant text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {trip.destination}
        </p>
      </div>
    </div>
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-secondary-300 text-sm">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        {formatDateRange(trip.startDate, trip.endDate)}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {trip.memberAvatars.slice(0, 3).map((avatar) => (
            <Avatar
              key={`${trip.id}-${avatar}`}
              className="h-7 w-7 border-2 border-surface"
            >
              <AvatarImage src={avatar} />
              <AvatarFallback className="bg-surface-dim text-[10px] text-white">
                U
              </AvatarFallback>
            </Avatar>
          ))}
          {trip.memberCount > 3 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-dim font-medium text-[10px] text-secondary-300">
              +{trip.memberCount - 3}
            </div>
          )}
        </div>
        <span className="text-on-surface-variant text-xs">
          {trip.memberCount} thành viên
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3 justify-self-end">
      <Badge className={getStatusColor(trip.status)}>
        {getStatusLabel(trip.status)}
      </Badge>
      <ArrowRight className="h-4 w-4 text-secondary-400" />
    </div>
  </button>
);

const InviteRow = ({ invitation, onAccept, onDecline }: InviteRowProps) => (
  <div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-card/40 p-4">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/12 text-primary-400">
      <MapPin className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-white">{invitation.tripName}</p>
      <p className="truncate text-on-surface-variant text-sm">
        {invitation.destination} · {invitation.invitedByName}
      </p>
    </div>
    <div className="flex gap-2">
      <Button
        size="icon"
        variant="outline"
        className="h-9 w-9"
        onClick={onDecline}
      >
        <X className="h-4 w-4" />
      </Button>
      <Button size="icon" className="h-9 w-9" onClick={onAccept}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

const EmptyState = ({ onCreateTrip }: { onCreateTrip: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-3xl border border-outline-variant border-dashed bg-surface-card/40 py-16 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-500/12 text-primary-400">
      <Route className="h-7 w-7" />
    </div>
    <h3 className="mt-5 font-semibold text-white text-xl">
      Chưa có chuyến đi nào
    </h3>
    <p className="mt-2 max-w-sm text-on-surface-variant text-sm">
      Tạo chuyến đi đầu tiên để bắt đầu theo dõi lịch trình, thành viên và chi
      phí trong một dashboard duy nhất.
    </p>
    <Button className="mt-6" onClick={onCreateTrip}>
      <Plus className="mr-2 h-4 w-4" />
      Tạo chuyến đi mới
    </Button>
  </div>
);

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { requireAuth } = useRequireAuth();
  const { trips, isLoading } = useTrips();
  const {
    pendingInvitations,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = useInvitations();

  const tripCards = trips.map(tripToCardData);
  const tripCountdownById = new Map(
    trips.map((trip) => [trip.id, getCountdown(trip.startDate)])
  );
  const upcomingTrips = tripCards
    .filter((trip) => trip.status === "upcoming")
    .slice(0, 3);
  const statusSummary = {
    upcoming: tripCards.filter((trip) => trip.status === "upcoming").length,
    ongoing: tripCards.filter((trip) => trip.status === "ongoing").length,
    completed: tripCards.filter((trip) => trip.status === "completed").length,
  };
  const totalTrips = Math.max(tripCards.length, 1);
  const chartStyle = {
    backgroundImage: `conic-gradient(
      rgba(235,87,87,0.95) 0deg ${(statusSummary.upcoming / totalTrips) * 360}deg,
      rgba(52,211,153,0.95) ${(statusSummary.upcoming / totalTrips) * 360}deg ${((statusSummary.upcoming + statusSummary.ongoing) / totalTrips) * 360}deg,
      rgba(171,187,194,0.7) ${((statusSummary.upcoming + statusSummary.ongoing) / totalTrips) * 360}deg 360deg
    )`,
  };

  const handleCreateTrip = requireAuth(() => {
    navigate({ to: "/trips/create" });
  });

  const handleTripClick = (tripId: string) => {
    navigate({ to: "/trips/$tripId", params: { tripId } });
  };

  const currentDateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <MainLayout currentPath="/">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-secondary-400 text-sm uppercase tracking-[0.28em]">
              <span className="font-bold text-primary-500">TRIPKEO</span>{" "}
            </p>
            <h1 className="mt-2 font-semibold text-3xl text-white">
              {user?.displayName ? `Xin chào, ${user.displayName}` : "Xin chào"}
            </h1>
            <p className="mt-1.5 text-on-surface-variant text-sm">
              {currentDateLabel}
            </p>
          </div>
          <Button
            onClick={handleCreateTrip}
            className="h-12 self-start px-5 sm:self-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo chuyến đi mới
          </Button>
        </div>

        <StatCardsSection trips={trips} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 border-outline-variant/70 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-white text-xl">
                    Báo cáo chuyến đi
                  </CardTitle>
                  <p className="mt-1 text-on-surface-variant text-sm">
                    Danh sách các chuyến gần đây với trạng thái và thành viên
                    tham gia.
                  </p>
                </div>
                {tripCards.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/trips" })}
                    className="self-start sm:self-auto"
                  >
                    Xem tất cả
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-5">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary-500" />
                    <p className="text-on-surface-variant text-sm">
                      Đang tải chuyến đi...
                    </p>
                  </div>
                ) : tripCards.length > 0 ? (
                  <div className="space-y-3">
                    {tripCards.map((trip) => (
                      <DashboardTripRow
                        key={trip.id}
                        trip={trip}
                        onClick={() => handleTripClick(trip.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState onCreateTrip={handleCreateTrip} />
                )}
              </CardContent>
            </Card>

            {pendingInvitations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-white text-xl">
                    Lời mời đang chờ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingInvitations.map((invitation) => (
                    <InviteRow
                      key={invitation.id}
                      invitation={invitation}
                      onAccept={() =>
                        handleAcceptInvitation(
                          invitation.tripId,
                          invitation.id,
                          invitation.role
                        )
                      }
                      onDecline={() =>
                        handleDeclineInvitation(
                          invitation.tripId,
                          invitation.id
                        )
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Trạng thái chuyến đi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div
                  className="mx-auto grid h-44 w-44 place-items-center rounded-full bg-surface-dim p-5"
                  style={chartStyle}
                >
                  <div className="grid h-full w-full place-items-center rounded-full bg-surface-card text-center">
                    <div>
                      <p className="font-semibold text-3xl text-white">
                        {tripCards.length}
                      </p>
                      <p className="text-secondary-400 text-xs uppercase tracking-[0.24em]">
                        Trips
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "Sắp diễn ra",
                      value: statusSummary.upcoming,
                      dotClassName: "bg-primary-500",
                    },
                    {
                      label: "Đang diễn ra",
                      value: statusSummary.ongoing,
                      dotClassName: "bg-success-500",
                    },
                    {
                      label: "Hoàn thành",
                      value: statusSummary.completed,
                      dotClassName: "bg-secondary-300",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl bg-surface-dim px-4 py-3"
                    >
                      <div className="flex items-center gap-3 text-on-surface-variant text-sm">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            item.dotClassName
                          )}
                        />
                        {item.label}
                      </div>
                      <span className="font-medium text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-white">
                  Sắp khởi hành
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: "/trips" })}
                >
                  Xem
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTrips.length > 0 ? (
                  upcomingTrips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => handleTripClick(trip.id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface-dim px-3 py-3 text-left transition-colors hover:bg-surface-card"
                    >
                      <img
                        src={trip.coverImage}
                        alt={trip.name}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">
                          {trip.name}
                        </p>
                        <p className="mt-1 truncate text-on-surface-variant text-sm">
                          {trip.destination}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary-500/12 px-3 py-1 font-medium text-primary-400 text-xs">
                        {tripCountdownById.get(trip.id) ?? "Sắp tới"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl bg-surface-dim px-4 py-5 text-on-surface-variant text-sm">
                    Chưa có chuyến nào sắp khởi hành.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Button
          onClick={handleCreateTrip}
          size="icon"
          className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-[0_14px_30px_rgba(0,0,0,0.35)] sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </MainLayout>
  );
}
