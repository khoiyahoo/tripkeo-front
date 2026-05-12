import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  DollarSign,
  Map as MapIcon,
  MapPin,
  Settings,
  Users,
  Vote,
} from "lucide-react";

import { ExpensesTab } from "@/components/organisms/ExpensesTab";
import { ItineraryTab } from "@/components/organisms/ItineraryTab";
import { MembersTab } from "@/components/organisms/MembersTab";
import { NotesTab } from "@/components/organisms/NotesTab";
import { VotesTab } from "@/components/organisms/VotesTab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MOCK_CHECKLIST,
  MOCK_DEBTS,
  MOCK_EXPENSES,
  MOCK_MEMBERS,
  MOCK_NOTES,
  MOCK_POLLS,
  MOCK_SCHEDULE,
} from "@/constants/mockData";
import { MainLayout } from "@/layouts/MainLayout";
import {
  formatDateRange,
  getStatusColor,
  getStatusLabel,
} from "@/utils/format";

const TRIP_DATA = {
  id: "t1",
  name: "Đà Nẵng - Hội An 4N3Đ",
  destination: "Đà Nẵng, Hội An",
  coverImage:
    "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80",
  startDate: "2026-06-15",
  endDate: "2026-06-18",
  status: "upcoming" as const,
  budget: 16_000_000,
  totalSpent: 17_350_000,
  description:
    "Chuyến đi nhóm 5 người khám phá Đà Nẵng và phố cổ Hội An. 4 ngày 3 đêm đầy ắp trải nghiệm!",
};

const TABS = [
  { value: "itinerary", label: "Lịch trình", icon: ClipboardList },
  { value: "expenses", label: "Chi phí", icon: DollarSign },
  { value: "members", label: "Thành viên", icon: Users },
  { value: "votes", label: "Bình chọn", icon: Vote },
  { value: "notes", label: "Ghi chú", icon: ClipboardList },
  { value: "map", label: "Bản đồ", icon: MapIcon },
];

const TripDetailPage = () => {
  return (
    <MainLayout currentPath="/trips">
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl">
          <img
            src={TRIP_DATA.coverImage}
            alt={TRIP_DATA.name}
            className="h-48 w-full object-cover sm:h-56 lg:h-64"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute right-4 bottom-4 left-4 sm:right-6 sm:bottom-6 sm:left-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Badge className={`mb-2 ${getStatusColor(TRIP_DATA.status)}`}>
                  {getStatusLabel(TRIP_DATA.status)}
                </Badge>
                <h1 className="font-bold text-2xl text-white sm:text-3xl">
                  {TRIP_DATA.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {TRIP_DATA.destination}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateRange(TRIP_DATA.startDate, TRIP_DATA.endDate)}
                  </span>
                </div>
              </div>
              <div className="hidden shrink-0 sm:block">
                <div className="flex -space-x-2">
                  {MOCK_MEMBERS.slice(0, 4).map((m) => (
                    <Avatar
                      key={m.id}
                      className="h-9 w-9 border-2 border-white"
                    >
                      <AvatarImage src={m.avatar} alt={m.name} />
                      <AvatarFallback>{m.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {MOCK_MEMBERS.length > 4 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white/20 font-medium text-sm text-white backdrop-blur-sm">
                      +{MOCK_MEMBERS.length - 4}
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
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-black/20 text-white backdrop-blur-sm hover:bg-black/40"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

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
              <ItineraryTab schedule={MOCK_SCHEDULE} />
            </TabsContent>
            <TabsContent value="expenses">
              <ExpensesTab
                expenses={MOCK_EXPENSES}
                debts={MOCK_DEBTS}
                members={MOCK_MEMBERS}
                budget={TRIP_DATA.budget}
                totalSpent={TRIP_DATA.totalSpent}
              />
            </TabsContent>
            <TabsContent value="members">
              <MembersTab members={MOCK_MEMBERS} />
            </TabsContent>
            <TabsContent value="votes">
              <VotesTab polls={MOCK_POLLS} />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab notes={MOCK_NOTES} checklist={MOCK_CHECKLIST} />
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
