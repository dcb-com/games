import type { ReactNode } from "react";
import { useRef } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
} from "@dcb/ui/alert";
import { Button } from "@dcb/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dcb/ui/dialog";
import { FieldError } from "@dcb/ui/field";

import { FactList } from "~/dashboard/components/fact-list";

interface ConfirmFact {
  label: string;
  value: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  facts,
  consequence,
  alternative,
  confirmLabel,
  cancelLabel = "Cancel",
  busyLabel,
  variant = "default",
  onConfirm,
  pending = false,
  confirmDisabled = false,
  spinner = false,
  error,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  /** What the reader is about to change, spelled out: amount, count, date. */
  facts?: ConfirmFact[];
  /** What this costs if it goes wrong. Shown as a warning banner. */
  consequence?: ReactNode;
  /** The reversible way out, offered next to the irreversible one. */
  alternative?: { label: string; onSelect: () => void };
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  pending?: boolean;
  confirmDisabled?: boolean;
  spinner?: boolean;
  error?: string | null;
  children?: ReactNode;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        // A safe dialog opens on its confirm button; a destructive one opens on
        // Cancel, so a stray Enter or Space does nothing. The autoFocus props
        // below say the same thing; this handler is what makes it stick, since
        // the dialog would otherwise focus whichever button comes first.
        // Focus goes back to the trigger on close, which is Radix's own
        // behaviour: nothing here overrides onCloseAutoFocus.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const target =
            variant === "destructive" ? cancelRef.current : confirmRef.current;
          target?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {facts && facts.length > 0 && (
          <FactList
            layout="rows"
            facts={facts}
            className="border-border rounded-xl border px-4"
          />
        )}

        {consequence && (
          <Alert tone={variant === "destructive" ? "destructive" : "warning"}>
            <AlertIcon>
              <TriangleAlert />
            </AlertIcon>
            <AlertContent>
              <AlertDescription>{consequence}</AlertDescription>
            </AlertContent>
          </Alert>
        )}

        {children}
        {error && <FieldError>{error}</FieldError>}

        <DialogFooter>
          {alternative && (
            <Button
              type="button"
              variant="ghost"
              onClick={alternative.onSelect}
              disabled={pending}
              className="sm:mr-auto"
            >
              {alternative.label}
            </Button>
          )}
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            autoFocus={variant === "destructive"}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={variant}
            autoFocus={variant === "default"}
            onClick={onConfirm}
            disabled={pending || confirmDisabled}
          >
            {pending && spinner && <Loader2 className="size-4 animate-spin" />}
            {pending && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
