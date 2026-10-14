import { Loader2, PhoneOff } from "lucide-react";

import { Button } from "@dcb/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@dcb/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

// Hang up asks first. A call cannot be got back once it ends: DCB never
// calls customers, so a caller cut off by a slip of the mouse must call in
// and wait again. An undo window would not help, since the line is gone
// the moment the phone service ends it. Contact-center desktops guard the same
// button: Webex Contact Center ships with the agent's End Call button off
// (https://help.webex.com/en-us/article/nu0du4c), and NN/g advises a
// confirm before an action that cannot be undone
// (https://www.nngroup.com/articles/confirmation-dialog/). The confirm is
// one more click on a button that already has focus, so Enter ends the
// call and Escape keeps it.
export function HangUpPopover({
  open,
  onOpenChange,
  disabled,
  pending,
  onHangUp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  pending: boolean;
  onHangUp: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="destructive"
              size="icon-xs"
              disabled={disabled}
              aria-label="Hang up"
            >
              <PhoneOff className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Hang up</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="flex w-64 flex-col gap-3">
        <p className="type-label">End the call?</p>
        <p className="type-secondary">
          The caller is cut off. If they need more, they call again.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Keep the call
          </Button>
          <Button
            variant="destructive"
            size="sm"
            autoFocus
            disabled={pending}
            onClick={() => {
              onOpenChange(false);
              onHangUp();
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Hang up
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
