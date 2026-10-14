import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConfirmDialog } from "~/dashboard/components/confirm-dialog";

/** Asks the browser to warn before a reload or a closed tab drops the edits. */
function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      // The browser shows its own wording; preventDefault is what asks for it.
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}

type ConfirmProps = Pick<
  ComponentProps<typeof ConfirmDialog>,
  | "open"
  | "onOpenChange"
  | "title"
  | "description"
  | "confirmLabel"
  | "variant"
  | "onConfirm"
>;

/**
 * Guards a dialog or a drawer that holds unsaved edits:
 *
 *   const { requestClose, confirmProps } = useConfirmClose(form.state.isDirty);
 *
 *   <Dialog open={open} onOpenChange={(next) => {
 *     if (next) setOpen(true);
 *     else requestClose(() => setOpen(false));
 *   }}>
 *     …
 *   </Dialog>
 *   <ConfirmDialog {...confirmProps} />
 *
 * With nothing edited, requestClose closes straight away.
 */
export function useConfirmClose(isDirty: boolean) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  useUnsavedChanges(isDirty);

  const requestClose = useCallback(
    (onClose: () => void) => {
      if (!isDirty) {
        onClose();
        return;
      }
      pending.current = onClose;
      setConfirmOpen(true);
    },
    [isDirty],
  );

  const confirmProps: ConfirmProps = useMemo(
    () => ({
      open: confirmOpen,
      onOpenChange: setConfirmOpen,
      title: "Discard changes?",
      description: "Nothing is saved yet.",
      confirmLabel: "Discard",
      variant: "destructive",
      onConfirm: () => {
        setConfirmOpen(false);
        const close = pending.current;
        pending.current = null;
        close?.();
      },
    }),
    [confirmOpen],
  );

  return { requestClose, confirmOpen, confirmProps };
}
