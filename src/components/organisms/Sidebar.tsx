import {
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

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
  { icon: Users, label: "Bạn bè", path: "/friends" },
  { icon: Settings, label: "Cài đặt", path: "/settings" },
];

export const Sidebar = ({ currentPath, onNavigate }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { requireAuth } = useRequireAuth();

  const handleSignOut = useCallback((): void => {
    signOut().catch(() => null);
  }, []);

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md lg:hidden"
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5 text-on-surface" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-65 flex-col border-outline-variant/30 border-r bg-white transition-transform duration-300 lg:sticky lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={() => handleNavigate("/")}
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 font-bold text-sm text-white">
              TK
            </div>
            <span className="font-bold font-heading text-lg text-on-surface">
              TripKeo
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-dim lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Separator className="bg-outline-variant/30" />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path !== "/" && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-sm transition-colors",
                  isActive
                    ? "bg-primary-100 text-primary-800"
                    : "text-on-surface-variant hover:bg-surface-dim"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <Separator className="bg-outline-variant/30" />

        {/* User section */}
        <div className="p-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user.photoURL ?? undefined}
                  alt={user.displayName ?? "Avatar"}
                />
                <AvatarFallback className="bg-primary-100 text-primary-800 text-xs">
                  {user.displayName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
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
                onClick={handleSignOut}
                className="h-8 w-8 text-on-surface-variant hover:text-error-600"
                aria-label="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={requireAuth(() => undefined)}
              className="w-full rounded-xl bg-primary-600 text-white hover:bg-primary-700"
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </aside>
    </>
  );
};
