import { Loader2 } from "lucide-react";

import { Button } from "@dcb/ui/button";

import type { SelectedNewRow } from "~/console/support/inbox/selected-new-row";
import { formatDateTime } from "~/console/lib/format";
import {
  callTimeWords,
  formatAge,
  newRowLine,
  newRowWho,
} from "~/console/support/case-words";
import { KeyHint } from "~/console/support/commands/key-hint";
import { DetailEmpty } from "~/console/support/inbox/detail-empty";
import {
  pickUpSelectedNewRow,
  useSelectedNewRow,
} from "~/console/support/inbox/selected-new-row";
import { useLive, useNow } from "~/console/support/live-provider";
import { MarkBadge, RowIconWithTip } from "~/console/support/row-parts";

// The detail pane beside New: the selected row's card, or the guide when
// no row is selected.
export function NewDetail() {
  const selected = useSelectedNewRow();
  const { serverNow } = useLive();
  const now = useNow(serverNow);
  if (!selected) return <DetailEmpty view="new" />;
  return (
    <NewRowCard selected={selected} now={now} onPickUp={pickUpSelectedNewRow} />
  );
}

// A New row, larger: who, its mark and flags, what it is about, when it
// came, and Pick up. It shows only what the row shows, so selecting a row
// opens nothing the access rule keeps closed.
export function NewRowCard({
  selected,
  now,
  onPickUp,
}: {
  selected: SelectedNewRow;
  now: number;
  onPickUp: () => void;
}) {
  const { row, pending, busy } = selected;
  const when =
    row.channel === "call"
      ? callTimeWords(row.since)
      : formatDateTime(row.since);
  const age = formatAge(row.since, now);
  return (
    <div className="flex h-full items-center justify-center p-6">
      <section
        aria-label="Selected row"
        className="border-border bg-card flex w-full max-w-md flex-col gap-4 rounded-lg border p-5 shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-2">
          <RowIconWithTip icon={row.icon} />
          <h2 className="type-page-title min-w-0 truncate">{newRowWho(row)}</h2>
        </div>
        {row.mark !== null && (
          <div className="flex flex-wrap items-center gap-1.5">
            <MarkBadge mark={row.mark} />
          </div>
        )}
        <p className="type-body">{newRowLine(row)}</p>
        <p className="type-secondary tabular-nums">
          {when} · {age === "now" ? "just now" : `${age} ago`}
        </p>
        <div className="flex items-center justify-end">
          <Button disabled={busy} onClick={onPickUp}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Pick up
            <KeyHint keys="p" className="opacity-80" />
          </Button>
        </div>
      </section>
    </div>
  );
}
