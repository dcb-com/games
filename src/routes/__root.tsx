import { createRootRoute, Navigate, Outlet } from "@tanstack/react-router";

import { DevPanel } from "~/mock/dev-panel";
import { MockClock } from "~/mock/mock-clock";

export const Route = createRootRoute({
  component: () => (
    <>
      <MockClock />
      <Outlet />
      <DevPanel />
    </>
  ),
  // An address this app does not have: go home.
  notFoundComponent: () => <Navigate to="/" replace />,
});
