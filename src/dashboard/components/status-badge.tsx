import { Badge } from "@dcb/ui/badge";

type StatusTone =
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "secondary"
  | "default";

interface StatusPresentation {
  label: string;
  tone: StatusTone;
}

// One vocabulary for every status word in the app. Add a status here rather
// than reaching for a bare <Badge> in a column or dialog. An issued invoice
// reads "Created": the one verb the invoice pages use.
export const STATUS: Record<string, StatusPresentation> = {
  // admins
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "warning" },
  mfa_on: { label: "On", tone: "success" },
  mfa_off: { label: "Off", tone: "outline" },
  // invoices
  issued: { label: "Created", tone: "success" },
  voided: { label: "Voided", tone: "destructive" },
  // onboarding
  draft: { label: "Draft", tone: "outline" },
  in_progress: { label: "In progress", tone: "warning" },
  awaiting: { label: "Awaiting finalize", tone: "warning" },
  finished: { label: "Finished", tone: "success" },
  // dashboard / payroll run
  finalized: { label: "Finalized", tone: "outline" },
  locked: { label: "Locked, awaiting finalize", tone: "warning" },
  // access
  needs_attention: { label: "Needs attention", tone: "destructive" },
  not_provisioned: { label: "No access", tone: "secondary" },
  revoked: { label: "Revoked", tone: "outline" },
  // roles
  built_in: { label: "Built in", tone: "secondary" },
  // onboarding verify steps
  step_action_needed: { label: "Action needed", tone: "warning" },
  step_waiting: { label: "Waiting on other steps", tone: "outline" },
  step_done: { label: "Done", tone: "success" },
};

/** Every status word `STATUS` is expected to cover, for the completeness test. */
export const KNOWN_STATUSES = Object.keys(STATUS);

export function StatusBadge({
  status,
  tone,
  children,
  className,
}: {
  /** A key into `STATUS`. Omit and pass `tone`/`children` for a vendor string that cannot be enumerated here. */
  status?: string;
  /** Escape hatch: an explicit tone for a status word `STATUS` does not (and cannot) know about. */
  tone?: StatusTone;
  children?: React.ReactNode;
  className?: string;
}) {
  const known = status ? STATUS[status] : undefined;
  const resolvedTone = tone ?? known?.tone ?? "outline";
  const label = children ?? known?.label ?? status ?? "";

  return (
    <Badge variant={resolvedTone} className={className}>
      {label}
    </Badge>
  );
}
