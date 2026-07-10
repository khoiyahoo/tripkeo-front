import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  DollarSign,
  Loader2,
  MapPin,
  Pencil,
  Scale,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

import { BalanceTab } from "@/components/organisms/BalanceTab";
import { EditTripDialog } from "@/components/organisms/EditTripDialog";
import { ExpensesTab } from "@/components/organisms/ExpensesTab";
import type { TripMeta } from "@/components/organisms/ItineraryPdfExport";
import { ItineraryPdfExport } from "@/components/organisms/ItineraryPdfExport";
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
import { usePersonalItinerary } from "@/hooks/usePersonalItinerary";
import { useTrip } from "@/hooks/useTrip";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import {
  countPostsByTripId,
  deletePostsByTripId,
} from "@/services/communityService";
import { addCostMember, removeCostMember } from "@/services/tripService";
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
  { value: "members", label: "Thành viên", icon: Users },
  { value: "expenses", label: "Chi tiêu", icon: DollarSign },
  { value: "balance", label: "Số dư", icon: Scale },
];

const TripDetailPage = () => {
  const { tripId } = useParams({ from: "/trips/$tripId" });
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { trip, isLoading, error } = useTrip(tripId);
  const { handleDeleteTrip } = useTrips();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkedPostCount, setLinkedPostCount] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("itinerary");
  const {
    activities,
    isLoading: isActivitiesLoading,
    handleAddActivity,
    handleUpdateActivity,
    handleDeleteActivity,
    handleBatchUpdateOrders,
  } = useItinerary(tripId);
  const { activities: personalActivities } = usePersonalItinerary(tripId);
  const {
    expenses,
    summary,
    balances,
    debts,
    isLoading: isExpensesLoading,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
  } = useExpenses(tripId, trip?.costMembers ?? []);
  const {
    handleInviteMember,
    handleRemoveMember,
    handleLeaveTrip,
    handleUpdateRole,
    handleCheckDuplicate,
    handleCancelInvitation,
    handleCreateShareLink,
  } = useTripMembers(tripId, trip?.name ?? "", trip?.destination ?? "");

  const handleAddCostMember = async (name: string) => {
    await addCostMember(tripId, name);
  };
  const handleRemoveCostMember = async (name: string) => {
    await removeCostMember(tripId, name);
  };

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
  // memberNames required by ItineraryPdfDocument; memberCount required by ExpensesPdfDocument
  const activeMembers = memberEntries.filter(
    ([, m]) => (m.status ?? "active") === "active"
  );
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
    memberNames: activeMembers.map(([, m]) => m.displayName),
    memberCount: (trip.costMembers ?? []).length,
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

  // Group personal activities by date for PDF export
  const personalActivitiesByDate = personalActivities.reduce(
    (acc, a) => {
      if (!acc[a.date]) acc[a.date] = [];
      acc[a.date].push(a);
      return acc;
    },
    {} as Record<string, typeof personalActivities>
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
              onClick={async () => {
                const count = await countPostsByTripId(tripId);
                setLinkedPostCount(count);
                setIsDeleteDialogOpen(true);
              }}
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
              <DialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Bạn có chắc muốn xóa &quot;{trip.name}&quot;? Tất cả lịch
                    trình, chi phí và thành viên sẽ bị xóa vĩnh viễn. Hành động
                    này không thể hoàn tác.
                  </p>
                  {linkedPostCount > 0 && (
                    <p className="rounded-md bg-error-500/10 px-3 py-2 text-error-400">
                      ⚠️ Chuyến đi này có{" "}
                      <strong>{linkedPostCount} bài viết</strong> đã đăng trong
                      Community. Các bài viết đó cũng sẽ bị xóa vĩnh viễn.
                    </p>
                  )}
                </div>
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
                    // Delete linked community posts first, then the trip
                    if (linkedPostCount > 0) {
                      await deletePostsByTripId(tripId);
                    }
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Sticky zone: tab bar + itinerary export button */}
          <div className="sticky top-0 z-20 -mx-4 bg-surface px-4 pt-1 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <TabsList className="flex h-auto flex-1 justify-start gap-1 overflow-x-auto bg-transparent p-0">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-on-surface-variant text-sm data-[state=active]:bg-primary-100 data-[state=active]:text-primary-800"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* PDF export — always visible when on itinerary tab */}
              {activeTab === "itinerary" && tripMeta && (
                <ItineraryPdfExport
                  tripMeta={tripMeta as TripMeta}
                  days={days}
                  activitiesByDate={activitiesByDate}
                  personalActivitiesByDate={personalActivitiesByDate}
                />
              )}
            </div>
          </div>

          <div className="mt-6">
            <TabsContent value="itinerary">
              <ItineraryTab
                tripId={tripId}
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
                meta={tripMeta}
                expenses={expenses}
                summary={summary}
                members={trip.members}
                costMembers={trip.costMembers ?? []}
                isLoading={isExpensesLoading}
                currentUserRole={currentUserRole}
                balances={balances}
                debts={debts}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            </TabsContent>
            <TabsContent value="balance">
              <BalanceTab
                summary={summary}
                balances={balances}
                debts={debts}
                tripId={tripId}
              />
            </TabsContent>
            <TabsContent value="members">
              <MembersTab
                members={trip.members}
                costMembers={trip.costMembers ?? []}
                currentUserRole={currentUserRole}
                currentUserId={user?.uid}
                currentUserEmail={user?.email ?? ""}
                currentUserDisplayName={user?.displayName ?? undefined}
                tripName={trip.name}
                tripEndDate={trip.endDate.toDate().toISOString().split("T")[0]}
                expenses={expenses}
                balances={balances}
                onAddCostMember={handleAddCostMember}
                onRemoveCostMember={handleRemoveCostMember}
                onInviteMember={handleInviteMember}
                onRemoveMember={handleRemoveMember}
                onLeaveTrip={async (userId, participationEnd) => {
                  await handleLeaveTrip(userId, participationEnd);
                  navigate({ to: "/" });
                }}
                onUpdateRole={handleUpdateRole}
                onCheckDuplicate={handleCheckDuplicate}
                onCancelInvitation={handleCancelInvitation}
                onCreateShareLink={handleCreateShareLink}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TripDetailPage;
