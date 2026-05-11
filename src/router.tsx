import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold text-amber-300 text-lg">Tripkeo Front</h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            to="/"
            className="rounded px-3 py-1.5 text-slate-600 hover:bg-slate-100"
            activeProps={{
              className: "rounded bg-slate-900 px-3 py-1.5 text-white",
            }}
          >
            Home
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <Outlet />
      </main>

      <TanStackRouterDevtools position="bottom-right" />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="font-bold text-2xl">
        TanStack Router + Tailwind đã sẵn sàng
      </h2>
      <p className="mt-2 text-red-500">
        Bạn có thể tạo thêm route bằng cách khai báo `createRoute()` trong file
        này hoặc tách thành module riêng.
      </p>
    </section>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute]);

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
