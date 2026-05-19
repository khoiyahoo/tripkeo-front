import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Sidebar } from "../components/organisms/Sidebar";

interface MainLayoutProps {
  children: ReactNode;
  currentPath: string;
}

export const MainLayout = ({ children, currentPath }: MainLayoutProps) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate({ to: path });
  };

  return (
    <div className="relative flex min-h-screen bg-surface text-on-surface">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute -bottom-32 left-[20%] h-80 w-80 rounded-full bg-secondary-500/10 blur-3xl" />
      </div>
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      <main className="relative z-10 flex-1 overflow-x-hidden">
        <div className="p-4 pt-16 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};
