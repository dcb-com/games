import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@dcb/ui/toggle-group";

import type { AgentPhase, RunStage } from "~/mock/store";
import { agent, run, useMock } from "~/mock/store";

// The mock's own controls, floating over the bottom left. Not part of
// either app. It changes the pretend world so you can see each moment a
// game has to handle: idle, a call ringing, on a call, work arriving, a
// payroll run calculating and then finishing.

const AGENT_WORDS: Record<AgentPhase, string> = {
  not_live: "Not live",
  available: "Available",
  ringer_off: "Ringer off",
  offered: "Call ringing",
  on_call: "On a call",
  wrap_up: "Wrap-up",
};

const RUN_WORDS: Record<RunStage, string> = {
  timesheet: "Timesheet",
  calculating: "Calculating",
  review: "Review",
  finalizing: "Submitting",
  done: "Done",
};

const DURATIONS = [
  { ms: 20_000, label: "20s" },
  { ms: 60_000, label: "1m" },
  { ms: 300_000, label: "5m" },
];

export function DevPanel() {
  const [open, setOpen] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const state = useMock();
  const a = state.agent;
  const r = state.run;
  // The start page has nothing for the controls to change.
  if (pathname === "/") return null;

  return (
    <aside
      aria-label="Mock controls"
      className="border-border bg-popover text-popover-foreground fixed bottom-20 left-4 z-50 w-72 rounded-lg border shadow-lg"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <FlaskConical className="text-primary size-4" />
        <span className="type-label flex-1">Mock controls</span>
        {open ? (
          <ChevronDown className="text-muted-foreground size-4" />
        ) : (
          <ChevronUp className="text-muted-foreground size-4" />
        )}
      </button>
      {open && (
        <div className="border-border flex flex-col gap-3 border-t p-3">
          <p className="type-caption">
            Not part of the app. Changes the made-up data.
          </p>
          <nav className="flex gap-1.5">
            <ScreenLink to="/console" here={pathname === "/console"}>
              Console
            </ScreenLink>
            <ScreenLink to="/payroll" here={pathname === "/payroll"}>
              Payroll
            </ScreenLink>
          </nav>

          {pathname !== "/payroll" && (
            <Section title="Support agent" state={AGENT_WORDS[a.phase]}>
              <Row>
                {a.phase === "not_live" ? (
                  <Button size="xs" onClick={agent.goLive}>
                    Go live
                  </Button>
                ) : (
                  <Button size="xs" variant="outline" onClick={agent.endLive}>
                    End live
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  disabled={a.phase === "not_live" || a.phase === "offered"}
                  onClick={agent.offerCall}
                >
                  Ring a call
                </Button>
              </Row>
              <Row>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={a.phase !== "offered"}
                  onClick={agent.answer}
                >
                  Answer
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={a.phase !== "on_call"}
                  onClick={agent.hangUp}
                >
                  Hang up
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={a.phase !== "wrap_up"}
                  onClick={agent.wrapUpDone}
                >
                  End wrap-up
                </Button>
              </Row>
              <Row>
                <Button size="xs" variant="outline" onClick={agent.addEmail}>
                  Email arrives
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={a.newRows.length === 0}
                  onClick={agent.clearNew}
                >
                  Clear New
                </Button>
              </Row>
              <Row>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    agent.setWaitingCalls(a.waitingCalls > 0 ? 0 : 2)
                  }
                >
                  {a.waitingCalls > 0 ? "No calls waiting" : "2 calls waiting"}
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => agent.setSoundBlocked(!a.soundBlocked)}
                >
                  {a.soundBlocked ? "Sound on" : "Sound blocked"}
                </Button>
              </Row>
              <p className="type-caption">
                A ringing call stops after 20 seconds and takes the agent out of
                live, as in the real console.
              </p>
            </Section>
          )}

          {pathname !== "/console" && (
            <Section title="Payroll run" state={RUN_WORDS[r.stage]}>
              <Row>
                <Button
                  size="xs"
                  disabled={r.stage !== "timesheet"}
                  onClick={run.calculate}
                >
                  Calculate
                </Button>
                <Button
                  size="xs"
                  disabled={r.stage !== "review"}
                  onClick={run.finalize}
                >
                  Finalize
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={r.startedAt === null}
                  onClick={run.finishNow}
                >
                  Finish now
                </Button>
              </Row>
              <Row>
                <span className="type-caption">Wait</span>
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={String(r.durationMs)}
                  onValueChange={(v) => {
                    if (v) run.setDuration(Number(v));
                  }}
                >
                  {DURATIONS.map((d) => (
                    <ToggleGroupItem key={d.ms} value={String(d.ms)}>
                      {d.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => run.setStage("timesheet")}
                >
                  Start over
                </Button>
              </Row>
            </Section>
          )}
        </div>
      )}
    </aside>
  );
}

function ScreenLink({
  to,
  here,
  children,
}: {
  to: "/console" | "/payroll";
  here: boolean;
  children: string;
}) {
  return (
    <Button asChild size="xs" variant={here ? "secondary" : "ghost"}>
      <Link to={to} aria-current={here ? "page" : undefined}>
        {children}
      </Link>
    </Button>
  );
}

function Section({
  title,
  state,
  children,
}: {
  title: string;
  state: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className="type-label flex items-center gap-2">
        {title}
        <span className="type-caption font-normal">· {state}</span>
      </p>
      {children}
    </section>
  );
}

function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {children}
    </div>
  );
}
