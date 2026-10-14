import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  ArrowRightLeft,
  FolderOpen,
  Mail,
  Phone,
  PhoneIncoming,
  Reply,
} from "lucide-react";
import { match } from "ts-pattern";

import { cn } from "@dcb/ui";
import { Badge } from "@dcb/ui/badge";
import { Button } from "@dcb/ui/button";
import { TableCell, TableRow } from "@dcb/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

import type { Mark, MarkTone, NewRow } from "~/console/support/case-words";
import { formatDateTime } from "~/console/lib/format";
import { formatAge, iconLabel, markOf } from "~/console/support/case-words";

// The parts every support list shares.

type RowIcon = NewRow["icon"] | "transfer";

const ICONS: Record<RowIcon, LucideIcon> = {
  new_email: Mail,
  reply: Reply,
  call: Phone,
  made_after_call: PhoneIncoming,
  follow_up: AlarmClock,
  no_owner_case: FolderOpen,
  transfer: ArrowRightLeft,
};

export function RowIconWithTip({ icon }: { icon: RowIcon }) {
  const Icon = ICONS[icon];
  const label = icon === "transfer" ? "Transfer" : iconLabel(icon);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground inline-flex">
          <Icon className="size-4" aria-label={label} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// A channel alone, for rows that carry no kind.
export function channelIcon(channel: "email" | "call" | null): RowIcon | null {
  if (channel === "email") return "new_email";
  if (channel === "call") return "call";
  return null;
}

function toneClass(tone: MarkTone): {
  variant: "default" | "outline" | "warning" | "secondary";
  className?: string;
} {
  return match(tone)
    .with("yours", () => ({ variant: "default" as const }))
    .with("owner", () => ({ variant: "outline" as const }))
    .with("owner_not_live", () => ({
      variant: "warning" as const,
      className: "border-warning-border",
    }))
    .with("none", () => ({ variant: "secondary" as const }))
    .exhaustive();
}

// The words on the badge. An owner's mark uses the first name ("Maya's
// case") so the sender beside it keeps room; the full words sit in the
// tooltip.
function shortMarkLabel(mark: Mark, full: string): string {
  if (mark.kind !== "owner") return full;
  const first = mark.name.trim().split(/\s+/)[0] ?? mark.name;
  return mark.live ? `${first}'s case` : `${first}'s case, not live`;
}

export function MarkBadge({
  mark,
  className: extra,
}: {
  mark: Mark;
  className?: string;
}) {
  const { label, tone } = markOf(mark);
  const { variant, className } = toneClass(tone);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={variant}
          className={cn(className, extra, "max-w-40 justify-start")}
        >
          <span className="truncate">{shortMarkLabel(mark, label)}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// "4m", with the exact time in a tooltip.
export function Age({ since, now }: { since: Date; now: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="type-secondary tabular-nums">
          {formatAge(since, now)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(since)}</TooltipContent>
    </Tooltip>
  );
}

// A line across the whole table: an empty list or an error.
export function RowNote({
  columns,
  children,
}: {
  columns: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="type-secondary py-6">
        {children}
      </TableCell>
    </TableRow>
  );
}

// "2 updates · Show", while the pointer holds the rows still. It floats
// over the top of a list, so showing it moves nothing.
export function UpdatesPill({
  count,
  onShow,
}: {
  count: number;
  onShow: () => void;
}) {
  if (count <= 0) return null;
  return (
    <Button
      variant="secondary"
      size="xs"
      className="rounded-full tabular-nums shadow-sm"
      onClick={onShow}
    >
      {count === 1 ? "1 update" : `${count} updates`} · Show
    </Button>
  );
}
