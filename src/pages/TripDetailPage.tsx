import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  DollarSign,
  Loader2,
  Map as MapIcon,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

import { EditTripDialog } from "@/components/organisms/EditTripDialog";
import { ExpensesTab } from "@/components/organisms/ExpensesTab";
import { ItineraryTab } from "@/components/organisms/ItineraryTab";
import { MembersTab } from "@/components/organisms/MembersTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExpenses } from "@/hooks/useExpenses";
import { useItinerary } from "@/hooks/useItinerary";
import { useTripMembers } from "@/hooks/useMembers";
import { useTrip } from "@/hooks/useTrip";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuthStore } from "@/stores/authStore";
import {
  formatTimestampRange,
  generateDaysList,
  getStatusColor,
  getStatusLabel,
  getTripStatus,
} from "@/utils/format";

const TABS = [
  { value: "itinerary", label: "Lịch trình", icon: ClipboardList },
  { value: "expenses", label: "Chi phí", icon: DollarSign },
  { value: "members", label: "Thành viên", icon: Users },
  { value: "map", label: "Bản đồ", icon: MapIcon },
];

const TripDetailPage = () => {
  const { tripId } = useParams({ from: "/trips/$tripId" });
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { trip, isLoading, error } = useTrip(tripId);
  const { handleDeleteTrip } = useTrips();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const {
    activities,
    isLoading: isActivitiesLoading,
    handleAddActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleBatchUpdateOrders,
  } = useItinerary(tripId);
  const {
    expenses,
    settlement,
    budgetStatus,
    isLoading: isExpensesLoading,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
  } = useExpenses(tripId, trip?.members ?? {}, trip?.budget ?? 0);
  const {
    handleInviteMember,
    handleRemoveMember,
    handleLeaveTrip,
    handleUpdateRole,
    handleCheckDuplicate,
    handleCreateShareLink,
  } = useTripMembers(tripId, trip?.name ?? "", trip?.destination ?? "");

  if (isLoading) {
    return (
      <MainLayout currentPath="/trips">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary-500" />
          <p className="text-on-surface-variant text-sm">
            Đang tải chuyến đi...
          </p>
        </div>
      </MainLayout>
    );
  }

  if (error || !trip) {
    return (
      <MainLayout currentPath="/trips">
        <div className="flex flex-col items-center justify-center py-24">
          <MapPin className="mb-3 h-12 w-12 text-on-surface-variant/50" />
          <p className="font-medium text-on-surface">
            Không tìm thấy chuyến đi
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.history.back()}
          >
            Quay lại
          </Button>
        </div>
      </MainLayout>
    );
  }

  const status = getTripStatus(trip.startDate, trip.endDate);
  const memberEntries = Object.entries(trip.members);
  const days = generateDaysList(trip.startDate, trip.endDate);
  const currentUserRole = user ? trip.members[user.uid]?.role : undefined;
  const isOwner = currentUserRole === "owner";
  const ownerName =
    Object.values(trip.members).find((m) => m.role === "owner")?.displayName ??
    "";

  // Build tripMeta for PDF export
  const tripMeta = {
    title: trip.name,
    destination: trip.destination,
    startDate: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(trip.startDate.toDate()),
    endDate: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(trip.endDate.toDate()),
    memberNames: memberEntries.map(([, m]) => m.displayName),
  };

  // Group activities by date for itinerary
  const activitiesByDate = activities.reduce(
    (acc, activity) => {
      if (!acc[activity.date]) acc[activity.date] = [];
      acc[activity.date].push(activity);
      return acc;
    },
    {} as Record<string, typeof activities>
  );

  return (
    <MainLayout currentPath="/trips">
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl">
          <img
            src={trip.coverImage}
            alt={trip.name}
            className="h-48 w-full object-cover sm:h-56 lg:h-64"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute right-4 bottom-4 left-4 sm:right-6 sm:bottom-6 sm:left-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge className={`mb-2 ${getStatusColor(status)}`}>
                  {getStatusLabel(status)}
                </Badge>
                <h1 className="font-bold text-2xl text-white sm:text-3xl">
                  {trip.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {trip.destination}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatTimestampRange(trip.startDate, trip.endDate)}
                  </span>
                </div>
              </div>
              <div className="hidden shrink-0 sm:block">
                <div className="flex -space-x-2">
                  {memberEntries.slice(0, 4).map(([uid, m]) => (
                    <Avatar key={uid} className="h-9 w-9 border-2 border-white">
                      <AvatarImage src={m.photoURL} alt={m.displayName} />
                      <AvatarFallback>{m.displayName[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {memberEntries.length > 4 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white/20 font-medium text-sm text-white backdrop-blur-sm">
                      +{memberEntries.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 bg-black/20 text-white backdrop-blur-sm hover:bg-black/40"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-16 bg-black/20 text-white backdrop-blur-sm hover:bg-black/40"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-5 w-5" />
            </Button>
          )}
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/20 text-white backdrop-blur-sm hover:bg-error-500/80"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xóa chuyến đi</DialogTitle>
              <DialogDescription>
                Bạn có chắc muốn xóa &quot;{trip.name}&quot;? Tất cả lịch trình,
                chi phí và thành viên sẽ bị xóa vĩnh viễn. Hành động này không
                thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await handleDeleteTrip(tripId);
                    navigate({ to: "/" });
                  } catch {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Xóa chuyến đi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit trip dialog */}
        <EditTripDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          trip={trip}
          activities={activities}
        />

        {/* Tabs */}
        <Tabs defaultValue="itinerary" className="w-full">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-on-surface-variant text-sm data-[state=active]:bg-primary-100 data-[state=active]:text-primary-800"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="itinerary">
              <ItineraryTab
                tripId={tripId}
                tripMeta={tripMeta}
                days={days}
                activitiesByDate={activitiesByDate}
                isLoading={isActivitiesLoading}
                onAddActivity={handleAddActivity}
                onUpdateActivity={handleUpdateActivity}
                onDeleteActivity={handleDeleteActivity}
                onBatchUpdateOrders={handleBatchUpdateOrders}
                currentUserRole={currentUserRole}
                currentUserId={user?.uid}
                ownerName={ownerName}
              />
            </TabsContent>
            <TabsContent value="expenses">
              <ExpensesTab
                tripId={tripId}
                tripName={trip.name}
                expenses={expenses}
                settlement={settlement}
                members={trip.members}
                budget={trip.budget}
                budgetStatus={budgetStatus}
                isLoading={isExpensesLoading}
                currentUserRole={currentUserRole}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </TabsContent>
            <TabsContent value="members">
              <MembersTab
                members={trip.members}
                currentUserRole={currentUserRole}
                currentUserId={user?.uid}
                tripName={trip.name}
                onInviteMember={handleInviteMember}
                onRemoveMember={handleRemoveMember}
                onLeaveTrip={async (userId) => {
                  await handleLeaveTrip(userId);
                  navigate({ to: "/" });
                }}
                onUpdateRole={handleUpdateRole}
                onCheckDuplicate={handleCheckDuplicate}
                onCreateShareLink={handleCreateShareLink}
              />
            </TabsContent>
            <TabsContent value="map">
              <div className="flex h-96 flex-col items-center justify-center rounded-2xl bg-surface-dim/50">
                <MapIcon className="mb-3 h-12 w-12 text-on-surface-variant/50" />
                <p className="font-medium text-on-surface">Bản đồ chuyến đi</p>
                <p className="mt-1 text-on-surface-variant text-sm">
                  Tích hợp Google Maps sẽ hiển thị tất cả các điểm trong lịch
                  trình
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TripDetailPage;
