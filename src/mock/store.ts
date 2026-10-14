import { useSyncExternalStore } from "react";

import type { NewRow, RunStatus } from "~/mock/types";

// The pretend world both screens draw from. Nothing here talks to a server.
// The dev panel (dev-panel.tsx) changes it, and the clock (tick) moves it on
// by itself the way the real thing would: an unanswered call stops ringing,
// wrap-up runs out, a payroll run finishes.
//
// Every name, number and amount below is made up.

export type AgentPhase =
  | "not_live"
  | "available"
  | "ringer_off"
  | "offered"
  | "on_call"
  | "wrap_up";

export type RunStage =
  | "timesheet"
  | "calculating"
  | "review"
  | "finalizing"
  | "done";

export interface MockState {
  agent: {
    phase: AgentPhase;
    // When the current phase began, in ms.
    since: number;
    offerEndsAt: number | null;
    answeredAt: number | null;
    wrapUpEndsAt: number | null;
    muted: boolean;
    onHold: boolean;
    heldAt: number | null;
    // Why the person last left live, for the Not live page.
    leftReason: "end" | "ignored_call" | null;
    newRows: NewRow[];
    waitingCalls: number;
    waitingSince: number | null;
    soundBlocked: boolean;
  };
  run: {
    stage: RunStage;
    startedAt: number | null;
    // How long a wait lasts in the mock. Real ones run one to five minutes.
    durationMs: number;
  };
}

// How long a call rings before it goes to someone else (the real console
// uses 20 seconds), and how long wrap-up lasts.
export const OFFER_MS = 20_000;
export const WRAP_UP_MS = 120_000;

let rowNumber = 0;
const SENDERS = [
  [
    "sam.sample@example.com",
    "Card declined at a store",
    "I tried to pay and it said declined twice",
  ],
  [
    "riley.test@example.com",
    "Direct deposit question",
    "When does my pay show up this week?",
  ],
  [
    "casey.demo@example.com",
    "Change my address",
    "I moved last month and need to update it",
  ],
  [
    "morgan.fake@example.com",
    "Locked out of the app",
    "It keeps asking for a code I never get",
  ],
] as const;

export function sampleRow(now: number, minutesAgo = 0): NewRow {
  const [who, subject, preview] =
    SENDERS[rowNumber % SENDERS.length] ?? SENDERS[0];
  rowNumber += 1;
  return {
    id: `row-${rowNumber}`,
    kind: "email",
    channel: "email",
    icon: "new_email",
    who,
    subject,
    preview,
    summary: null,
    since: new Date(now - minutesAgo * 60_000),
    mark: null,
    continuesCaseNumber: null,
  };
}

function initialState(now: number): MockState {
  return {
    agent: {
      phase: "available",
      since: now - 4 * 60_000,
      offerEndsAt: null,
      answeredAt: null,
      wrapUpEndsAt: null,
      muted: false,
      onHold: false,
      heldAt: null,
      leftReason: null,
      newRows: [],
      waitingCalls: 0,
      waitingSince: null,
      soundBlocked: false,
    },
    run: { stage: "timesheet", startedAt: null, durationMs: 60_000 },
  };
}

let state = initialState(Date.now());
const listeners = new Set<() => void>();

function set(next: MockState) {
  state = next;
  for (const listener of listeners) listener();
}

function setAgent(patch: Partial<MockState["agent"]>) {
  set({ ...state, agent: { ...state.agent, ...patch } });
}

function setRun(patch: Partial<MockState["run"]>) {
  set({ ...state, run: { ...state.run, ...patch } });
}

export function getMockState(): MockState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMock(): MockState {
  return useSyncExternalStore(subscribe, getMockState, getMockState);
}

// ---- Console actions ----

const FREE = {
  offerEndsAt: null,
  answeredAt: null,
  wrapUpEndsAt: null,
  muted: false,
  onHold: false,
  heldAt: null,
};

export const agent = {
  goLive: () => {
    setAgent({
      ...FREE,
      phase: "available",
      since: Date.now(),
      leftReason: null,
    });
  },
  endLive: () => {
    setAgent({
      ...FREE,
      phase: "not_live",
      since: Date.now(),
      leftReason: "end",
    });
  },
  setRinger: (on: boolean) => {
    setAgent({ phase: on ? "available" : "ringer_off", since: Date.now() });
  },
  // A call rings for this person. It takes the whole call bar.
  offerCall: () => {
    const now = Date.now();
    setAgent({
      ...FREE,
      phase: "offered",
      since: now,
      offerEndsAt: now + OFFER_MS,
    });
  },
  answer: () => {
    const now = Date.now();
    setAgent({ ...FREE, phase: "on_call", since: now, answeredAt: now });
  },
  // Sending a call back turns the ringer off, as in the real console.
  sendBack: () => {
    setAgent({ ...FREE, phase: "ringer_off", since: Date.now() });
  },
  hangUp: () => {
    const now = Date.now();
    setAgent({
      ...FREE,
      phase: "wrap_up",
      since: now,
      wrapUpEndsAt: now + WRAP_UP_MS,
    });
  },
  wrapUpDone: () => {
    setAgent({ ...FREE, phase: "available", since: Date.now() });
  },
  toggleMute: () => {
    setAgent({ muted: !state.agent.muted });
  },
  toggleHold: () => {
    const onHold = !state.agent.onHold;
    setAgent({ onHold, heldAt: onHold ? Date.now() : null });
  },
  addEmail: () => {
    setAgent({ newRows: [...state.agent.newRows, sampleRow(Date.now())] });
  },
  pickUp: (id: string) => {
    setAgent({ newRows: state.agent.newRows.filter((r) => r.id !== id) });
  },
  clearNew: () => {
    setAgent({ newRows: [] });
  },
  setWaitingCalls: (count: number) => {
    setAgent({
      waitingCalls: count,
      waitingSince: count > 0 ? (state.agent.waitingSince ?? Date.now()) : null,
    });
  },
  setSoundBlocked: (blocked: boolean) => {
    setAgent({ soundBlocked: blocked });
  },
};

// ---- Payroll actions ----

export const run = {
  // Timesheet to Review: the run's paychecks are worked out.
  calculate: () => {
    setRun({ stage: "calculating", startedAt: Date.now() });
  },
  // Finalize to Done: the run is submitted and its payments go out.
  finalize: () => {
    setRun({ stage: "finalizing", startedAt: Date.now() });
  },
  finishNow: () => {
    const { stage } = state.run;
    if (stage === "calculating") setRun({ stage: "review", startedAt: null });
    if (stage === "finalizing") setRun({ stage: "done", startedAt: null });
  },
  setStage: (stage: RunStage) => {
    const waits = stage === "calculating" || stage === "finalizing";
    setRun({ stage, startedAt: waits ? Date.now() : null });
  },
  setDuration: (durationMs: number) => {
    setRun({ durationMs });
  },
};

// How far a wait has come, from 0 to 1.
export function runFraction(s: MockState["run"], now: number): number {
  if (s.startedAt === null) return 0;
  return Math.min(1, Math.max(0, (now - s.startedAt) / s.durationMs));
}

// The status the real run reports at each point of a wait. The step text is
// the vendor's own kind of wording; run-processing.tsx turns it into plain
// words and a stage list.
export function runStatus(s: MockState["run"], now: number): RunStatus {
  const f = runFraction(s, now);
  // oxlint-disable-next-line dcb-money/no-raw-money-math -- a percent
  const percent = Math.round(f * 100);
  if (s.stage === "finalizing") {
    return { procStepDesc: "Finalizing…", procStepProgress: percent };
  }
  const desc =
    f < 0.1
      ? "Activating the payroll engine…"
      : f < 0.4
        ? "Crunching time entries…"
        : f < 0.75
          ? "Counting beans for Uncle Sam…"
          : f < 0.9
            ? "Building reports…"
            : "Almost there…";
  return { procStepDesc: desc, procStepProgress: percent };
}

// Moves the world on. Called once a second by MockClock.
export function tick(now: number) {
  const a = state.agent;
  if (a.phase === "offered" && a.offerEndsAt !== null && now >= a.offerEndsAt) {
    // A call that rang out with no answer takes the person out of live.
    setAgent({
      ...FREE,
      phase: "not_live",
      since: now,
      leftReason: "ignored_call",
    });
  }
  if (
    a.phase === "wrap_up" &&
    a.wrapUpEndsAt !== null &&
    now >= a.wrapUpEndsAt
  ) {
    setAgent({ ...FREE, phase: "available", since: now });
  }
  const r = state.run;
  if (r.startedAt !== null && runFraction(r, now) >= 1) run.finishNow();
}

// For tests: start again from the first state.
export function resetMock(now = Date.now()) {
  set(initialState(now));
}

// Named starting points, so a link can open a screen in a given moment:
// /console?state=ringing, /payroll?state=calculating.
export const PRESETS = {
  idle: () => agent.goLive(),
  waiting: () => {
    agent.goLive();
    agent.addEmail();
    agent.addEmail();
  },
  ringing: () => {
    agent.goLive();
    agent.offerCall();
  },
  "on-call": () => {
    agent.goLive();
    agent.answer();
  },
  "wrap-up": () => {
    agent.goLive();
    agent.hangUp();
  },
  "not-live": () => agent.endLive(),
  timesheet: () => run.setStage("timesheet"),
  calculating: () => run.setStage("calculating"),
  review: () => run.setStage("review"),
  finalizing: () => run.setStage("finalizing"),
  done: () => run.setStage("done"),
} satisfies Record<string, () => void>;

export type PresetName = keyof typeof PRESETS;

export function applyPreset(name: string | null): boolean {
  const preset = Object.entries(PRESETS).find(([key]) => key === name);
  if (!preset) return false;
  preset[1]();
  return true;
}
