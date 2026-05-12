import { Bell, DollarSign, Globe, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MainLayout } from "@/layouts/MainLayout";

const SETTINGS_SECTIONS = [
  {
    icon: Bell,
    title: "Thông báo",
    description: "Quản lý cài đặt thông báo",
    settings: [
      { label: "Thông báo chuyến đi mới", checked: true },
      { label: "Thông báo chi phí", checked: true },
      { label: "Nhắc nhở lịch trình", checked: false },
      { label: "Thông báo bình chọn", checked: true },
    ],
  },
  {
    icon: Globe,
    title: "Ngôn ngữ",
    description: "Thay đổi ngôn ngữ giao diện",
    current: "Tiếng Việt",
  },
  {
    icon: DollarSign,
    title: "Đơn vị tiền tệ",
    description: "Chọn đơn vị tiền mặc định",
    current: "VNĐ",
  },
];

const SettingsPage = () => {
  return (
    <MainLayout currentPath="/settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-on-surface">Cài đặt</h1>
          <p className="mt-1 text-on-surface-variant">
            Quản lý tài khoản và tùy chọn cá nhân
          </p>
        </div>

        {/* Notification settings */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-base">Thông báo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {SETTINGS_SECTIONS[0].settings?.map((setting) => (
              <div
                key={setting.label}
                className="flex items-center justify-between rounded-lg p-2"
              >
                <span className="text-on-surface text-sm">{setting.label}</span>
                <button
                  type="button"
                  className={`h-6 w-11 rounded-full transition-colors ${
                    setting.checked ? "bg-primary-500" : "bg-outline-variant"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      setting.checked ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-base">Ngôn ngữ & Khu vực</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface text-sm">Ngôn ngữ</p>
                <p className="text-on-surface-variant text-xs">Tiếng Việt</p>
              </div>
              <Button variant="outline" size="sm">
                Thay đổi
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface text-sm">
                  Đơn vị tiền tệ
                </p>
                <p className="text-on-surface-variant text-xs">VNĐ (₫)</p>
              </div>
              <Button variant="outline" size="sm">
                Thay đổi
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-base">Bảo mật</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface text-sm">
                  Đăng nhập bằng Google
                </p>
                <p className="text-on-surface-variant text-xs">
                  Tài khoản được liên kết với Google
                </p>
              </div>
              <Badge className="bg-success-50 text-success-700">
                Đã kết nối
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-error-500/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-error-600">
              Vùng nguy hiểm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface text-sm">
                  Xóa tài khoản
                </p>
                <p className="text-on-surface-variant text-xs">
                  Xóa vĩnh viễn tất cả dữ liệu của bạn
                </p>
              </div>
              <Button variant="destructive" size="sm">
                Xóa tài khoản
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
