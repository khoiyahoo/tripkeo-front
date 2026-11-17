import { Home, Plane, UserRound, Users } from "lucide-react";

import { cn } from "@/lib/utils";

interface BottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const TABS = [
  { icon: Home, label: "Trang chủ", path: "/" },
  { icon: Plane, label: "Chuyến đi", path: "/trips" },
  { icon: Users, label: "Cộng đồng", path: "/community" },
  { icon: UserRound, label: "Cá nhân", path: "/profile" },
];

/** Thanh tab dưới cùng trên điện thoại — cùng bố cục với app (Trang chủ, Chuyến đi, Cộng đồng, Cá nhân). */
export const BottomNav = ({ currentPath, onNavigate }: BottomNavProps) => (
  <nav
    aria-label="Điều hướng chính"
    className="fixed inset-x-0 bottom-0 z-40 border-outline-variant border-t bg-surface-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
  >
    <ul className="mx-auto flex max-w-xl">
      {TABS.map((tab) => {
        const isActive =
          currentPath === tab.path ||
          (tab.path !== "/" && currentPath.startsWith(tab.path));
        return (
          <li className="flex-1" key={tab.path}>
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                isActive ? "text-primary-500" : "text-secondary-400"
              )}
              onClick={() => onNavigate(tab.path)}
              type="button"
            >
              <tab.icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
