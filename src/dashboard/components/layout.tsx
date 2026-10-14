import type { ReactNode } from "react";

import { FrameResetProvider } from "~/dashboard/components/frame-reset";
import { PageActionsProvider } from "~/dashboard/components/nav/page-actions";
import type { PageBack } from "~/dashboard/components/nav/page-title";
import { TopBar } from "~/dashboard/components/nav/top-bar";
import { PORTAL_NAV } from "~/dashboard/components/portal-pages";
import { Sidebar } from "~/dashboard/components/sidebar";

// The frame around every dashboard page (copied from the real layout.tsx):
// the sidebar on the left, and on the right the top bar over the page. The
// real one also hosts the embedded payroll provider pages; the mock has none.
export function Layout({
  title,
  back,
  children,
}: {
  title: string;
  back: PageBack | null;
  children: ReactNode;
}) {
  return (
    <FrameResetProvider>
      {/* The bar is the only title bar, so the page in view hands it the
          controls that belong to the page. */}
      <PageActionsProvider>
        <div className="bg-background text-foreground flex h-screen">
          <Sidebar nav={PORTAL_NAV} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar nav={PORTAL_NAV} title={title} back={back} />
            <main className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Pages scroll inside this box: it is what their own
                `absolute inset-0` resolves against. */}
              <div className="relative min-h-0 flex-1">{children}</div>
            </main>
          </div>
        </div>
      </PageActionsProvider>
    </FrameResetProvider>
  );
}
