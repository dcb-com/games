import type { ReactNode } from "react";

import { NewList } from "~/console/support/inbox/new-list";

// The two panes of the inbox (copied from the real list-pane.tsx): the list,
// 320px wide (360px from 1280px) with its own scroll, and the open item
// beside it. The mock shows New only.
export function InboxPanes({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0">
      <section
        aria-label="List"
        className="border-border bg-card flex w-80 shrink-0 flex-col border-r xl:w-[360px]"
      >
        <NewList />
      </section>
      <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
