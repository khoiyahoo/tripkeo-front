import {
  Globe,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

import { LogoutConfirmDialog } from "@/components/organisms/LogoutConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

import logo from "@/assets/logo.webp";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: MapIcon, label: "Chuyến đi", path: "/trips" },
  { icon: Globe, label: "Cộng đồng", path: "/community" },
  { icon: UserRound, label: "Hồ sơ", path: "/profile" },
  { icon: Settings, label: "Cài đặt", path: "/settings" },
];

export const Sidebar = ({ currentPath, onNavigate }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();

  const handleSignOut = useCallback((): void => {
    signOut().catch(() => null);
    setIsLogoutOpen(false);
  }, []);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  const desktopRailButtonClass =
    "lg:h-14 lg:w-14 lg:justify-center lg:rounded-2xl lg:px-0";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-card text-on-surface shadow-[0_8px_24px_rgba(0,0,0,0.3)] lg:hidden"
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-outline-variant border-r bg-surface px-4 py-5 transition-transform duration-300 lg:sticky lg:w-20 lg:px-3",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between lg:justify-center">
          <button
            type="button"
            onClick={() => handleNavigate("/")}
            className="flex items-center gap-3 lg:gap-0"
            aria-label="Đi đến Dashboard"
          >
            <img src={logo} alt="TripKeo Logo" className="h-12 w-10" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-dim lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col items-stretch gap-3 lg:items-center">
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path !== "/" && currentPath.startsWith(item.path));

            return (
              <button
                key={item.path}
                type="button"
                title={item.label}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-sm transition-all",
                  desktopRailButtonClass,
                  isActive
                    ? "bg-primary-500/18 text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)]"
                    : "text-secondary-400 hover:bg-surface-card hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="lg:hidden">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <Separator className="mb-4 bg-outline-variant lg:mx-2" />

        {user ? (
          <div className="space-y-3 lg:flex lg:flex-col lg:items-center lg:space-y-4">
            <Avatar className="h-11 w-11 border border-outline-variant lg:h-12 lg:w-12">
              <AvatarImage
                src={user.photoURL ?? undefined}
                alt={user.displayName ?? "Avatar"}
              />
              <AvatarFallback className="bg-surface-dim text-on-surface text-xs">
                {user.displayName?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="lg:hidden">
              <p className="truncate font-semibold text-on-surface text-sm">
                {user.displayName ?? "User"}
              </p>
              <p className="truncate text-on-surface-variant text-xs">
                {user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              title="Đăng xuất"
              onClick={() => setIsLogoutOpen(true)}
              className="h-11 w-11 rounded-xl text-secondary-400 hover:bg-primary-500/12 hover:text-primary-400"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            title="Đăng nhập"
            onClick={requireAuth(() => undefined)}
            className="w-full lg:h-11 lg:w-11 lg:px-0"
          >
            <UserRound className="h-5 w-5" />
            <span className="lg:hidden">Đăng nhập</span>
          </Button>
        )}
      </aside>

      <LogoutConfirmDialog
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
};
