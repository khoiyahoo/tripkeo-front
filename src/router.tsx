import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { LoginDialog } from "@/components/organisms/LoginDialog";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import CreateTripPage from "@/pages/CreateTripPage";
import FriendsPage from "@/pages/FriendsPage";
import HomePage from "@/pages/HomePage";
import InvitePage from "@/pages/InvitePage";
import LoginPage from "@/pages/LoginPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import TripDetailPage from "@/pages/TripDetailPage";
import TripsPage from "@/pages/TripsPage";
import { useAuthStore } from "@/stores/authStore";

const RootComponent = () => {
  useFirebaseAuth();
  const isInitialized = useAuthStore((s) => s.isInitialized);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <span className="font-medium text-on-surface-variant text-sm">
            Đang tải...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Outlet />
      <LoginDialog />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
};

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const tripsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trips",
  component: TripsPage,
});

const createTripRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trips/create",
  component: CreateTripPage,
});

const tripDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trips/$tripId",
  component: TripDetailPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/friends",
  component: FriendsPage,
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invite/$inviteCode",
  component: InvitePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  tripsRoute,
  createTripRoute,
  tripDetailRoute,
  profileRoute,
  settingsRoute,
  friendsRoute,
  inviteRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
