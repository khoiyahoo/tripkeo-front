import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Check,
  Loader2,
  MapPin,
  Plus,
  Users,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInvitations } from "@/hooks/useMembers";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuthStore } from "@/stores/authStore";
import {
  formatDateRange,
  getCountdown,
  getStatusColor,
  getStatusLabel,
  tripToCardData,
} from "@/utils/format";

import type { TripWithId } from "@/types/firestore";

const QuickStatsSection = ({ trips }: { trips: TripWithId[] }) => {
  const totalTrips = trips.length;
  const nextTrip = trips
    .filter((t) => t.startDate.toDate() > new Date())
    .sort(
      (a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime()
    )[0];

  const nextCountdown = nextTrip ? getCountdown(nextTrip.startDate) : null;

  const items = [
    {
      label: "Tổng chuyến đi",
      value: `${totalTrips} chuyến`,
      color: "text-primary-600 bg-primary-50",
    },
    {
      label: "Chuyến sắp tới",
      value: nextTrip?.destination ?? "Chưa có",
      sub: nextCountdown ?? undefined,
      color: "text-tertiary-600 bg-tertiary-50",
    },
    {
      label: "Thành viên tích cực",
      value: `${new Set(trips.flatMap((t) => Object.keys(t.members))).size} người`,
      color: "text-secondary-600 bg-secondary-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-on-surface-variant text-sm">{item.label}</p>
            <p className="mt-1 truncate font-semibold text-lg text-on-surface">
              {item.value}
            </p>
            {item.sub && (
              <p className="text-on-surface-variant text-xs">{item.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const InviteCard = ({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: {
    tripName: string;
    destination: string;
    invitedByName: string;
    role: "treasurer" | "editor" | "member";
  };
  onAccept: () => void;
  onDecline: () => void;
}) => (
  <Card className="border-none shadow-sm">
    <CardContent className="flex items-center gap-4 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
        <MapPin className="h-5 w-5 text-primary-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-on-surface">
          {invitation.tripName}
        </p>
        <p className="flex items-center gap-1 text-on-surface-variant text-sm">
          <MapPin className="h-3.5 w-3.5" />
          {invitation.destination}
        </p>
        <p className="text-on-surface-variant text-xs">
          Mời bởi {invitation.invitedByName} · Vai trò:{" "}
          {invitation.role === "editor" ? "Biên tập" : "Xem"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={onDecline}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" className="h-8 w-8" onClick={onAccept}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const TripCardItem = ({
  trip,
  onClick,
}: {
  trip: ReturnType<typeof tripToCardData>;
  onClick: () => void;
}) => (
  <Card
    className="group cursor-pointer overflow-hidden border-none shadow-sm transition-shadow hover:shadow-md"
    onClick={onClick}
  >
    <div className="relative h-40 overflow-hidden">
      <img
        src={trip.coverImage}
        alt={trip.name}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      <Badge
        className={`absolute top-3 right-3 ${getStatusColor(trip.status)}`}
      >
        {getStatusLabel(trip.status)}
      </Badge>
    </div>
    <CardContent className="p-4">
      <h3 className="truncate font-semibold text-on-surface">{trip.name}</h3>
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
      <div className="mt-3 flex items-center justify-between">
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
      Chưa có chuyến đi nào
    </h3>
    <p className="mt-1 text-on-surface-variant text-sm">
      Tạo chuyến đi đầu tiên để bắt đầu lên kế hoạch!
    </p>
    <Button className="mt-6" onClick={onCreateTrip}>
      <Plus className="mr-2 h-4 w-4" />
      Tạo chuyến đi mới
    </Button>
  </div>
);

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { requireAuth } = useRequireAuth();
  const { trips, isLoading } = useTrips();
  const {
    pendingInvitations,
    handleAcceptInvitation,
    handleDeclineInvitation,
  } = useInvitations();

  const tripCards = trips.map(tripToCardData);

  const handleCreateTrip = requireAuth(() => {
    navigate({ to: "/trips/create" });
  });

  const handleTripClick = (tripId: string) => {
    navigate({ to: "/trips/$tripId", params: { tripId } });
  };

  const greeting = user ? `Xin chào, ${user.displayName}!` : "Xin chào!";

  return (
    <MainLayout currentPath="/">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl text-on-surface">{greeting}</h1>
            <p className="mt-1 text-on-surface-variant">
              Lên kế hoạch cho chuyến đi tiếp theo của bạn
            </p>
          </div>
          <Button onClick={handleCreateTrip} className="hidden sm:flex">
            <Plus className="mr-2 h-4 w-4" />
            Tạo chuyến đi mới
          </Button>
        </div>

        {trips.length > 0 && <QuickStatsSection trips={trips} />}

        {pendingInvitations.length > 0 && (
          <section>
            <h2 className="mb-4 font-semibold text-lg text-on-surface">
              Lời mời chuyến đi
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pendingInvitations.map((inv) => (
                <InviteCard
                  key={inv.id}
                  invitation={inv}
                  onAccept={() =>
                    handleAcceptInvitation(inv.tripId, inv.id, inv.role)
                  }
                  onDecline={() => handleDeclineInvitation(inv.tripId, inv.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-lg text-on-surface">
              Chuyến đi của bạn
            </h2>
            {tripCards.length > 0 && (
              <Button variant="ghost" size="sm" className="text-primary-600">
                Xem tất cả
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary-500" />
              <p className="text-on-surface-variant text-sm">
                Đang tải chuyến đi...
              </p>
            </div>
          ) : tripCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tripCards.map((trip) => (
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
        </section>

        <Button
          onClick={handleCreateTrip}
          size="icon"
          className="fixed right-6 bottom-6 z-50 h-14 w-14 rounded-full shadow-lg sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </MainLayout>
  );
}
