import {
  ArrowRight,
  Calendar,
  Check,
  MapPin,
  Plus,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MOCK_INVITES,
  MOCK_QUICK_STATS,
  MOCK_TRIP_CARDS,
} from "@/constants/mockData";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuthStore } from "@/stores/authStore";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  getStatusColor,
  getStatusLabel,
} from "@/utils/format";

import type { TripCard, TripInvite } from "@/types/trip";

const TRIP_DETAIL_BASE = "/trips/";

const STATS_ITEMS = [
  {
    icon: TrendingUp,
    label: "Tổng chuyến đi",
    value: `${MOCK_QUICK_STATS.totalTrips} chuyến`,
    color: "text-primary-600 bg-primary-50",
  },
  {
    icon: Wallet,
    label: "Chi phí năm nay",
    value: formatCurrency(MOCK_QUICK_STATS.totalCostThisYear),
    color: "text-success-600 bg-success-50",
  },
  {
    icon: MapPin,
    label: "Điểm đến tiếp theo",
    value: MOCK_QUICK_STATS.nextDestination ?? "Chưa có",
    sub: MOCK_QUICK_STATS.nextTripDate
      ? formatDate(MOCK_QUICK_STATS.nextTripDate)
      : undefined,
    color: "text-warning-600 bg-warning-50",
  },
];

const QuickStatsSection = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {STATS_ITEMS.map((item) => (
        <Card key={item.label} className="border-none shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex items-center justify-center rounded-xl p-3 ${item.color}`}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-on-surface-variant text-sm">{item.label}</p>
              <p className="truncate font-semibold text-base text-on-surface">
                {item.value}
              </p>
              {item.sub && (
                <p className="text-on-surface-variant text-xs">{item.sub}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const InviteCard = ({ invite }: { invite: TripInvite }) => (
  <Card className="border-none shadow-sm">
    <CardContent className="flex items-center gap-4 p-4">
      <Avatar className="h-10 w-10">
        <AvatarImage src={invite.inviterAvatar} alt={invite.invitedBy} />
        <AvatarFallback>{invite.invitedBy[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-on-surface">
          {invite.tripName}
        </p>
        <p className="flex items-center gap-1 text-on-surface-variant text-sm">
          <MapPin className="h-3.5 w-3.5" />
          {invite.destination}
        </p>
        <p className="text-on-surface-variant text-xs">
          {formatDateRange(invite.startDate, invite.endDate)} · Mời bởi{" "}
          {invite.invitedBy}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="icon" variant="outline" className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" className="h-8 w-8">
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const TripCardItem = ({ trip }: { trip: TripCard }) => (
  <Card
    className="group cursor-pointer overflow-hidden border-none shadow-sm transition-shadow hover:shadow-md"
    onClick={() => {
      window.location.href = `${TRIP_DETAIL_BASE}${trip.id}`;
    }}
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
            <Avatar key={avatar} className="h-7 w-7 border-2 border-white">
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
  const { requireAuth } = useRequireAuth();

  const trips = MOCK_TRIP_CARDS;
  const invites = MOCK_INVITES;

  const handleCreateTrip = requireAuth(() => {
    window.location.href = "/trips/new";
  });

  const greeting = user ? `Xin chào, ${user.displayName}!` : "Xin chào!";

  return (
    <MainLayout currentPath="/">
      <div className="space-y-8">
        {/* Greeting */}
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

        {/* Quick Stats */}
        <QuickStatsSection />

        {/* Invites */}
        {invites.length > 0 && (
          <section>
            <h2 className="mb-4 font-semibold text-lg text-on-surface">
              Chuyến đi được mời
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {invites.map((invite) => (
                <InviteCard key={invite.id} invite={invite} />
              ))}
            </div>
          </section>
        )}

        {/* Trip Cards */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-lg text-on-surface">
              Chuyến đi của bạn
            </h2>
            {trips.length > 0 && (
              <Button variant="ghost" size="sm" className="text-primary-600">
                Xem tất cả
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
          {trips.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <TripCardItem key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <EmptyState onCreateTrip={handleCreateTrip} />
          )}
        </section>

        {/* Mobile FAB */}
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
