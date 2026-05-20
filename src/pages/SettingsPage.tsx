import { Globe, Link, Link2Off, Loader2, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteAccountDialog } from "@/components/organisms/DeleteAccountDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { MainLayout } from "@/layouts/MainLayout";
import { auth } from "@/lib/firebase";
import { linkWithGoogle, unlinkFromGoogle } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

const SettingsPage = () => {
  const { isAuthenticated } = useAuthGuard();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  // Derive Google provider state from user.providerData
  const googleProviderData = user?.providerData.find(
    (p) => p.providerId === "google.com"
  );
  const isGoogleLinked = !!googleProviderData;
  const googleEmail = googleProviderData?.email ?? null;
  const hasMultipleProviders = (user?.providerData.length ?? 0) > 1;

  const refreshUser = () => {
    if (auth.currentUser) setUser(auth.currentUser);
  };

  const handleLinkGoogle = () => {
    setIsLinkingGoogle(true);
    linkWithGoogle()
      .then(() => {
        refreshUser();
        toast.success("Đã kết nối tài khoản Google");
      })
      .catch(() => {
        toast.error("Không thể kết nối Google. Vui lòng thử lại.");
      })
      .finally(() => setIsLinkingGoogle(false));
  };

  const handleUnlinkGoogle = () => {
    if (!hasMultipleProviders) {
      toast.warning(
        "Không thể ngắt kết nối vì đây là phương thức đăng nhập duy nhất của bạn."
      );
      return;
    }
    setIsLinkingGoogle(true);
    unlinkFromGoogle()
      .then(() => {
        refreshUser();
        toast.success("Đã ngắt kết nối tài khoản Google");
      })
      .catch(() => {
        toast.error("Không thể ngắt kết nối. Vui lòng thử lại.");
      })
      .finally(() => setIsLinkingGoogle(false));
  };

  if (!isAuthenticated) return null;

  return (
    <MainLayout currentPath="/settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-on-surface">Cài đặt</h1>
          <p className="mt-1 text-on-surface-variant">
            Quản lý tài khoản và tùy chọn cá nhân
          </p>
        </div>

        {/* Language & Region */}
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
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-on-surface text-sm">
                  Đơn vị tiền tệ
                </p>
                <p className="text-on-surface-variant text-xs">VNĐ (₫)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked accounts */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary-600" />
              <CardTitle className="text-base">Tài khoản liên kết</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Google "G" coloured icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                  </svg>
                  <p className="font-medium text-on-surface text-sm">Google</p>
                  {isGoogleLinked ? (
                    <Badge className="bg-success-50 text-success-700 text-xs">
                      Đã kết nối
                    </Badge>
                  ) : (
                    <Badge className="bg-surface-dim text-on-surface-variant text-xs">
                      Chưa kết nối
                    </Badge>
                  )}
                </div>
                {isGoogleLinked && googleEmail && (
                  <p className="pl-7 text-on-surface-variant text-xs">
                    {googleEmail}
                  </p>
                )}
                {isGoogleLinked && !hasMultipleProviders && (
                  <p className="pl-7 text-on-surface-variant text-xs italic">
                    Đây là phương thức đăng nhập duy nhất của bạn.
                  </p>
                )}
              </div>

              {isGoogleLinked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlinkGoogle}
                  disabled={isLinkingGoogle || !hasMultipleProviders}
                  className="shrink-0"
                >
                  {isLinkingGoogle ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Link2Off className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Ngắt kết nối
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle}
                  className="shrink-0"
                >
                  {isLinkingGoogle ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unlink className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Kết nối Google
                </Button>
              )}
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
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
              >
                Xóa tài khoản
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
      />
    </MainLayout>
  );
};

export default SettingsPage;
