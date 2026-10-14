import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

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

// Asks before something that cannot be quietly undone: a block, a role
// change, a revoked session. A destructive one opens with Cancel focused, so
// a stray Enter does nothing.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  pending = false,
  error,
  onConfirm,
  cannotConfirm = null,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  variant?: "default" | "destructive";
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  // Why the confirm button cannot be pressed yet, such as an empty field.
  // The button stays off and the reason shows above it.
  cannotConfirm?: string | null;
  children?: ReactNode;
}) {
  const destructive = variant === "destructive";
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {error && <FieldError>{error}</FieldError>}
        {cannotConfirm && <p className="type-caption">{cannotConfirm}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            autoFocus={destructive}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant={variant}
            autoFocus={!destructive}
            disabled={pending || cannotConfirm !== null}
            onClick={onConfirm}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
