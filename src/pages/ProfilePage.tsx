import { Edit3, Globe, MapPin, Plane, Users, Wallet } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_QUICK_STATS } from "@/constants/mockData";
import { MainLayout } from "@/layouts/MainLayout";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/utils/format";

const VISITED_PLACES = [
  "Đà Nẵng",
  "Hội An",
  "Phú Quốc",
  "Đà Lạt",
  "Nha Trang",
  "Sapa",
];

const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <MainLayout currentPath="/profile">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile header */}
        <Card className="overflow-hidden border-none shadow-sm">
          <div className="h-32 bg-linear-to-r from-primary-400 to-secondary-500" />
          <CardContent className="relative px-6 pb-6">
            <Avatar className="-mt-12 h-24 w-24 border-4 border-white">
              <AvatarImage
                src={user?.photoURL ?? undefined}
                alt={user?.displayName ?? "User"}
              />
              <AvatarFallback className="bg-primary-100 text-2xl text-primary-800">
                {user?.displayName?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="mt-3 flex items-start justify-between">
              <div>
                <h1 className="font-bold text-2xl text-on-surface">
                  {user?.displayName ?? "Người dùng"}
                </h1>
                <p className="text-on-surface-variant">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm">
                <Edit3 className="mr-1 h-3.5 w-3.5" />
                Chỉnh sửa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              icon: Plane,
              label: "Chuyến đi",
              value: `${MOCK_QUICK_STATS.totalTrips}`,
              color: "bg-primary-50 text-primary-600",
            },
            {
              icon: MapPin,
              label: "Điểm đến",
              value: `${VISITED_PLACES.length}`,
              color: "bg-secondary-50 text-secondary-600",
            },
            {
              icon: Wallet,
              label: "Tổng chi",
              value: formatCurrency(MOCK_QUICK_STATS.totalCostThisYear),
              color: "bg-tertiary-50 text-tertiary-600",
            },
            {
              icon: Users,
              label: "Bạn bè",
              value: "12",
              color: "bg-success-50 text-success-600",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs">
                    {stat.label}
                  </p>
                  <p className="font-bold text-on-surface">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Visited places */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-base">Nơi đã đến</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VISITED_PLACES.map((place) => (
                <Badge
                  key={place}
                  variant="secondary"
                  className="bg-primary-50 px-3 py-1 text-primary-700"
                >
                  <MapPin className="mr-1 h-3 w-3" />
                  {place}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
