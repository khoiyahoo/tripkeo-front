import { Users } from "lucide-react";

import { MainLayout } from "@/layouts/MainLayout";

const FriendsPage = () => {
  return (
    <MainLayout currentPath="/friends">
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl text-on-surface">Bạn bè</h1>
          <p className="mt-1 text-on-surface-variant">
            Quản lý danh sách bạn bè để dễ dàng mời vào chuyến đi
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant border-dashed py-20">
          <Users className="mb-4 h-14 w-14 text-on-surface-variant/40" />
          <h3 className="font-semibold text-lg text-on-surface">
            Tính năng đang phát triển
          </h3>
          <p className="mt-1 max-w-sm text-center text-on-surface-variant text-sm">
            Sắp tới bạn có thể kết bạn, xem profile bạn bè và mời họ vào chuyến
            đi dễ dàng hơn.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default FriendsPage;
