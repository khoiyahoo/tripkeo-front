import { Calendar, Copy, Filter, MapPin, Search, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MOCK_DISCOVER_TRIPS } from "@/constants/mockData";
import { MainLayout } from "@/layouts/MainLayout";

import type { DiscoverTrip } from "@/types/trip";

const FILTER_TAGS = [
  "Tất cả",
  "Biển",
  "Núi",
  "Phố cổ",
  "Ẩm thực",
  "Phượt",
  "Resort",
];

const DiscoverCard = ({ trip }: { trip: DiscoverTrip }) => (
  <Card className="group cursor-pointer overflow-hidden border-none shadow-sm transition-shadow hover:shadow-md">
    <div className="relative h-44 overflow-hidden">
      <img
        src={trip.coverImage}
        alt={trip.name}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-black/40 px-2 py-1 text-white backdrop-blur-sm">
        <Star className="h-3.5 w-3.5 fill-tertiary-400 text-tertiary-400" />
        <span className="font-semibold text-sm">{trip.rating}</span>
        <span className="text-white/70 text-xs">({trip.reviewCount})</span>
      </div>
    </div>
    <CardContent className="p-4">
      <h3 className="truncate font-semibold text-on-surface">{trip.name}</h3>
      <div className="mt-2 flex flex-col gap-1 text-on-surface-variant text-sm">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {trip.destination}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {trip.days} ngày
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {trip.tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="bg-primary-50 text-primary-700 text-xs"
          >
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={trip.authorAvatar} alt={trip.authorName} />
            <AvatarFallback className="text-xs">
              {trip.authorName[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-on-surface-variant text-xs">
            {trip.authorName}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-primary-600 text-xs"
        >
          <Copy className="mr-1 h-3 w-3" />
          Sao chép
        </Button>
      </div>
    </CardContent>
  </Card>
);

const DiscoverPage = () => {
  return (
    <MainLayout currentPath="/discover">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-on-surface">Khám phá</h1>
          <p className="mt-1 text-on-surface-variant">
            Tham khảo lịch trình từ cộng đồng du lịch
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <Input
              placeholder="Tìm kiếm điểm đến, lịch trình..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="shrink-0">
            <Filter className="mr-2 h-4 w-4" />
            Bộ lọc
          </Button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TAGS.map((tag, idx) => (
            <Button
              key={tag}
              variant={idx === 0 ? "default" : "outline"}
              size="sm"
              className="rounded-full"
            >
              {tag}
            </Button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_DISCOVER_TRIPS.map((trip) => (
            <DiscoverCard key={trip.id} trip={trip} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default DiscoverPage;
