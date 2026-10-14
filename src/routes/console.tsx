import { createFileRoute } from "@tanstack/react-router";

import { ConsoleShell } from "~/console/support/console-shell";
import { InboxPanes } from "~/console/support/inbox/list-pane";
import { NewDetail } from "~/console/support/inbox/new-row-card";
import { useLive } from "~/console/support/live-provider";
import { NotLivePage } from "~/console/support/not-live-page";

// The support console, on New. Not live, it is the Not live page, as in
// the real console.
export const Route = createFileRoute("/console")({
  component: ConsolePage,
});

function ConsolePage() {
  const { live } = useLive();
  return (
    <ConsoleShell>
      {live ? (
        <InboxPanes>
          <NewDetail />
        </InboxPanes>
      ) : (
        <NotLivePage />
      )}
    </ConsoleShell>
  );
}
