import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@dcb/ui/badge";
import { Button } from "@dcb/ui/button";

import type { NewRow } from "~/console/support/case-words";
import { PaneHeader } from "~/console/components/pane";
import {
  caseNumber,
  newRowLine,
  newRowWho,
} from "~/console/support/case-words";
import { KeyHint } from "~/console/support/commands/key-hint";
import {
  ListBody,
  ListEmpty,
  ListRow,
  RowButton,
} from "~/console/support/inbox/list-row";
import { setSelectedNewRow } from "~/console/support/inbox/selected-new-row";
import { useListKeys } from "~/console/support/inbox/use-list-keys";
import { usePickUpNextCommand } from "~/console/support/inbox/use-pick-up-next-command";
import { useLive, useNow } from "~/console/support/live-provider";
import {
  Age,
  MarkBadge,
  RowIconWithTip,
  UpdatesPill,
} from "~/console/support/row-parts";
import { agent, useMock } from "~/mock/store";

// New: the work no one has picked up, oldest first (copied from the real
// console's pages/support/new.tsx). A row never opens a preview. Clicking it
// only moves the selection; Pick up is the only way in. The rows come from
// the mock store; add some from the dev panel.
export function NewList() {
  const rows = useMock().agent.newRows;
  const { serverNow } = useLive();
  const now = useNow(serverNow);
  const next = usePickUpNextCommand();

  const byId = new Map(rows.map((r) => [r.id, r]));
  const pickUpRow = (row: NewRow) => agent.pickUp(row.id);
  const keys = useListKeys({
    ids: [...byId.keys()],
    pickUp: {
      can: (id) => byId.has(id),
      run: (id) => {
        const row = byId.get(id);
        if (row) pickUpRow(row);
      },
    },
  });

  // The detail pane beside New shows the selected row's card.
  const selectedRow = keys.selected ? byId.get(keys.selected) : undefined;
  useEffect(() => {
    setSelectedNewRow(
      selectedRow ? { row: selectedRow, pending: false, busy: false } : null,
      pickUpRow,
    );
  });
  useEffect(() => () => setSelectedNewRow(null, null), []);

  return (
    <>
      <PaneHeader title="New" count={rows.length}>
        <Button size="xs" disabled={!next.canPickUp} onClick={next.pickUpNext}>
          {next.pending && <Loader2 className="size-3.5 animate-spin" />}
          Pick up next
          <KeyHint keys="shift+p" className="opacity-80" />
        </Button>
      </PaneHeader>
      <p className="type-caption border-border border-b px-4 py-2">
        Oldest first. Picking up makes it yours to answer.
      </p>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* "1 update · Show" sits in this strip while the pointer holds
            the rows still. The mock never holds them. */}
        <div className="border-border flex h-8 shrink-0 items-center justify-center border-b">
          <UpdatesPill count={0} onShow={() => undefined} />
        </div>
        <ListBody>
          {rows.length === 0 && (
            <ListEmpty>Nothing new. Everything has been picked up.</ListEmpty>
          )}
          {rows.map((row) => (
            <NewListRow
              key={row.id}
              row={row}
              now={now}
              selected={keys.selected === row.id}
              onSelect={() => keys.select(row.id)}
              onPickUp={() => pickUpRow(row)}
            />
          ))}
        </ListBody>
      </div>
    </>
  );
}

function NewListRow({
  row,
  now,
  selected,
  onSelect,
  onPickUp,
}: {
  row: NewRow;
  now: number;
  selected: boolean;
  onSelect: () => void;
  onPickUp: () => void;
}) {
  return (
    <ListRow
      rowId={row.id}
      selected={selected}
      onClick={onSelect}
      line1={
        <>
          <RowIconWithTip icon={row.icon} />
          <span className="type-label min-w-0 truncate">{newRowWho(row)}</span>
          <RowMark row={row} />
          <span className="ml-auto shrink-0">
            <Age since={row.since} now={now} />
          </span>
        </>
      }
      line2={
        <>
          <span className="type-secondary min-w-0 truncate">
            {newRowLine(row)}
          </span>
          <RowButton onClick={onPickUp}>Pick up</RowButton>
        </>
      }
    />
  );
}

// At most one mark on a row: who owns the case, or else the closed case
// this one continues.
function RowMark({ row }: { row: NewRow }) {
  if (row.mark) {
    return <MarkBadge mark={row.mark} className="shrink-0 px-1.5 py-0" />;
  }
  if (row.continuesCaseNumber !== null) {
    return (
      <Badge variant="outline" className="shrink-0 px-1.5 py-0 tabular-nums">
        Continues {caseNumber(row.continuesCaseNumber)}
      </Badge>
    );
  }
  return null;
}
