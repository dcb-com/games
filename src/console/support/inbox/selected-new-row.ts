import { useSyncExternalStore } from "react";

import type { NewRow } from "~/console/support/case-words";

// The row selected in New, for the row card in the detail pane. New's list owns the selection and its Pick up;
// it puts both here so the pane beside it can show them. The card shows
// only what the row shows, so nothing new is read.

export interface SelectedNewRow {
  row: NewRow;
  // A pick-up is running for this row.
  pending: boolean;
  // Something is being picked up, so Pick up waits.
  busy: boolean;
}

let selected: SelectedNewRow | null = null;
let pickUp: ((row: NewRow) => void) | null = null;
const listeners = new Set<() => void>();

function same(a: SelectedNewRow | null, b: SelectedNewRow | null): boolean {
  if (a === null || b === null) return a === b;
  return a.row === b.row && a.pending === b.pending && a.busy === b.busy;
}

export function setSelectedNewRow(
  next: SelectedNewRow | null,
  run: ((row: NewRow) => void) | null,
): void {
  pickUp = run;
  if (same(selected, next)) return;
  selected = next;
  for (const listener of listeners) listener();
}

export function pickUpSelectedNewRow(): void {
  if (selected && pickUp && !selected.busy) pickUp(selected.row);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSelectedNewRow(): SelectedNewRow | null {
  return useSyncExternalStore(subscribe, () => selected);
}
