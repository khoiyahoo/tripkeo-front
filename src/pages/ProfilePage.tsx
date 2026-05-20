import {
  Edit3,
  Globe,
  Loader2,
  MapPin,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useProfileStats } from "@/hooks/useProfileStats";
import { MainLayout } from "@/layouts/MainLayout";
import { auth } from "@/lib/firebase";
import { updateDisplayName } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency } from "@/utils/format";

const ProfilePage = () => {
  const { isAuthenticated } = useAuthGuard();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const stats = useProfileStats(user?.uid, user?.displayName);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openEdit = () => {
    setEditName(user?.displayName ?? "");
    setIsEditOpen(true);
  };

  if (!isAuthenticated) return null;

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || !user) return;
    setIsSaving(true);
    try {
      await updateDisplayName(user.uid, trimmed);
      // Refresh auth store with updated currentUser
      if (auth.currentUser) setUser(auth.currentUser);
      toast.success("Đã cập nhật tên");
      setIsEditOpen(false);
    } catch {
      toast.error("Không thể cập nhật tên. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const statCards = [
    {
      icon: Plane,
      label: "Chuyến đi",
      value: stats.isLoading ? "—" : `${stats.tripCount}`,
      color: "bg-primary-50 text-primary-600",
    },
    {
      icon: MapPin,
      label: "Điểm đến",
      value: stats.isLoading ? "—" : `${stats.destinationCount}`,
      color: "bg-secondary-50 text-secondary-600",
    },
    {
      icon: Wallet,
      label: "Tổng chi",
      value: stats.isLoading ? "—" : formatCurrency(stats.totalSpent),
      color: "bg-tertiary-50 text-tertiary-600",
    },
    {
      icon: Users,
      label: "Bạn bè",
      value: stats.isLoading ? "—" : `${stats.friendCount}`,
      color: "bg-success-50 text-success-600",
    },
  ];

  return (
    <MainLayout currentPath="/profile">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile header */}
        <Card className="overflow-hidden border-none shadow-sm">
          <div className="h-32 bg-linear-to-br from-primary-400 via-primary-500 to-secondary-600" />
          <CardContent className="relative px-6 pb-6">
            <div className="relative -mt-12 inline-block">
              <Avatar className="h-24 w-24 border-4 border-surface-card ring-2 ring-primary-400">
                <AvatarImage
                  src={user?.photoURL ?? undefined}
                  alt={user?.displayName ?? "User"}
                />
                <AvatarFallback className="bg-primary-100 text-2xl text-primary-800">
                  {user?.displayName?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="mt-3 flex items-start justify-between">
              <div>
                <h1 className="font-bold text-2xl text-on-surface">
                  {user?.displayName ?? "Người dùng"}
                </h1>
                <p className="text-on-surface-variant">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Edit3 className="mr-1 h-3.5 w-3.5" />
                Chỉnh sửa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-on-surface-variant text-xs">
                    {stat.label}
                  </p>
                  <p className="truncate font-bold text-on-surface">
                    {stat.value}
                  </p>
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
            {stats.isLoading ? (
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải...
              </div>
            ) : stats.places.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Chưa có nơi nào.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.places.map((place) => (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit display name modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tên</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="edit-display-name">Tên hiển thị</Label>
              <Input
                id="edit-display-name"
                className="mt-1.5"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                }}
                placeholder="Nhập tên của bạn..."
                maxLength={60}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1.5 cursor-not-allowed opacity-60"
                value={user?.email ?? ""}
                disabled
                readOnly
              />
              <p className="mt-1 text-on-surface-variant text-xs">
                Email không thể thay đổi.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSaving}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveName}
              disabled={isSaving || !editName.trim()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ProfilePage;
