import { CheckCircle2 } from "lucide-react";
import { match } from "ts-pattern";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dcb/ui/table";

import { DetailBand, FactList } from "~/dashboard/components/fact-list";
import { TopBarTitleExtra } from "~/dashboard/components/nav/page-actions";
import { PAGE_GUTTER } from "~/dashboard/components/page";
import { KpiCard } from "~/dashboard/components/payroll/kpi-card";
import { RunProcessing } from "~/dashboard/components/payroll/run-processing";
import { RunStepHeader } from "~/dashboard/components/payroll/run-step-header";
import { StepFooter } from "~/dashboard/components/payroll/step-footer";
import { fmtDate, plural } from "~/dashboard/lib/format";
import { moneyCents } from "~/dashboard/lib/money";
import { GameSlot } from "~/games/game-slot";
import { payrollMoment } from "~/games/moments";
import type { RunStage } from "~/mock/store";
import { run, runStatus, useMock } from "~/mock/store";
import { useNow } from "~/mock/use-now";

// One payroll run, from the timesheet to Done, shaped like the real
// pages/payroll-run-flow.tsx. The two waits (Calculating and Finalizing)
// are the moments a game could fill. Every person and amount is made up.

const PERIOD = { start: "2026-10-01", end: "2026-10-14", payDay: "2026-10-17" };

const PEOPLE = [
  {
    id: 1,
    name: "Avery Sample",
    hours: 80,
    grossCents: 240_000,
    netCents: 182_450,
  },
  {
    id: 2,
    name: "Jamie Example",
    hours: 76.5,
    grossCents: 191_250,
    netCents: 148_930,
  },
  {
    id: 3,
    name: "Quinn Test",
    hours: 80,
    grossCents: 320_000,
    netCents: 236_800,
  },
  {
    id: 4,
    name: "Rowan Demo",
    hours: 64,
    grossCents: 128_000,
    netCents: 104_960,
  },
  {
    id: 5,
    name: "Sky Placeholder",
    hours: 80,
    grossCents: 210_000,
    netCents: 161_700,
  },
] as const;

const GROSS = PEOPLE.reduce((sum, p) => sum + p.grossCents, 0);
const NET = PEOPLE.reduce((sum, p) => sum + p.netCents, 0);
const TAXES = GROSS - NET;

// A table in a rounded box keeps 16px from the box's edge; the table
// primitive drops the outer padding of its first and last cells.
const TABLE_BOX =
  "border-border overflow-hidden rounded-xl border [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4";

// Which of the five steps the header marks for each stage.
const HEADER_STEP: Record<RunStage, number> = {
  timesheet: 1,
  calculating: 1,
  review: 2,
  finalizing: 4,
  done: 5,
};

export function PayrollRunPage() {
  const { run: r } = useMock();
  const now = useNow();
  const moment = payrollMoment(r);
  const slot = (
    <GameSlot
      moment={moment}
      where="Payroll dashboard · under the wait while a run is worked out"
      className="mt-4 max-w-xl"
    />
  );

  const body = match(r.stage)
    .with("calculating", () => (
      <RunProcessing
        status={runStatus(r, now)}
        fallback="Loading payroll…"
        calculating
        title={`Calculating ${plural(PEOPLE.length, "paycheck")}…`}
        below={slot}
      />
    ))
    .with("finalizing", () => (
      <RunProcessing
        status={runStatus(r, now)}
        fallback="Finalizing…"
        below={slot}
      />
    ))
    .with("timesheet", () => <Timesheet />)
    .with("review", () => <Review />)
    .with("done", () => <Done />)
    .exhaustive();

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* The bar above names the run and holds the way back to the list, so
          the run adds only what the bar cannot know: which days it pays. */}
      <TopBarTitleExtra>
        <span className="type-secondary hidden truncate sm:inline">
          {fmtDate(PERIOD.start)} – {fmtDate(PERIOD.end)} · pay date{" "}
          {fmtDate(PERIOD.payDay)}
        </span>
      </TopBarTitleExtra>
      <div
        className={cn(
          "border-border flex shrink-0 flex-wrap items-center gap-3 border-b py-3",
          PAGE_GUTTER,
        )}
      >
        <RunStepHeader current={HEADER_STEP[r.stage]} />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost">
            Close
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-3">
        {body}
      </div>

      {r.stage === "timesheet" && (
        <StepFooter>
          <Button onClick={run.calculate}>Continue to review</Button>
        </StepFooter>
      )}
      {r.stage === "review" && (
        <StepFooter align="between">
          <Button variant="outline" onClick={() => run.setStage("timesheet")}>
            Back to timesheet
          </Button>
          {/* The real run has a Payments step before Finalize. The mock goes
              straight to the second wait. */}
          <Button onClick={run.finalize}>Finalize payroll</Button>
        </StepFooter>
      )}
    </div>
  );
}

function Timesheet() {
  return (
    <div className={cn("flex flex-col gap-3 pb-6", PAGE_GUTTER)}>
      <p className="type-secondary">
        Check each person’s hours, then continue. Working out the paychecks
        takes a minute or two.
      </p>
      <div className={TABLE_BOX}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Regular hours</TableHead>
              <TableHead className="text-right">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PEOPLE.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="type-label">{p.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.hours.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneyCents(Math.round(p.grossCents / p.hours))}/hr
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Totals() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard label="Gross pay" value={moneyCents(GROSS)} />
      <KpiCard label="Employee taxes" value={moneyCents(TAXES)} />
      <KpiCard label="Net pay" value={moneyCents(NET)} emphasis />
      <KpiCard
        label="Paychecks"
        value={String(PEOPLE.length)}
        hint={`Pay date ${fmtDate(PERIOD.payDay)}`}
      />
    </div>
  );
}

function Review() {
  return (
    <div className={cn("flex flex-col gap-4 pb-6", PAGE_GUTTER)}>
      <Totals />
      <div className={TABLE_BOX}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PEOPLE.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="type-label">{p.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneyCents(p.grossCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneyCents(p.netCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// The real Done screen (run-done.tsx), with made-up numbers.
function Done() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 md:px-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="text-success-foreground flex items-center gap-2">
          <CheckCircle2 className="size-5" />
          <span className="font-medium">Payroll finalized</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            View in history
          </Button>
          <Button size="sm" onClick={() => run.setStage("timesheet")}>
            Back to Run payroll
          </Button>
        </div>
      </div>
      <DetailBand title="This run" className="shrink-0">
        <FactList
          facts={[
            {
              label: "Pay period",
              value: `${fmtDate(PERIOD.start)} – ${fmtDate(PERIOD.end)}`,
            },
            { label: "Pay date", value: fmtDate(PERIOD.payDay) },
          ]}
          layout="inline"
          aria-label="Pay period and pay date"
        />
      </DetailBand>
      <p className="type-caption shrink-0">
        Your account will be debited on {fmtDate("2026-10-15")}, and employees
        are paid on {fmtDate(PERIOD.payDay)}.
      </p>
      <Totals />
    </div>
  );
}
