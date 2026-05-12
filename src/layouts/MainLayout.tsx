import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/organisms/Sidebar";

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
    <div className="flex min-h-screen bg-surface">
      <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
};
