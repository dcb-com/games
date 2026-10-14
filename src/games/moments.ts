import type { MockState } from "~/mock/store";

// What the host screen says about playing right now. The placeholder
// (game-slot.tsx) shows it, so you can see the moment a game would have to
// stop. There is no game code in this repo; this is only the host's side.
//
//   free   nothing needs the person; a game may run
//   pause  work just arrived; a game must stop at once and give way
//   closed the slot is not on screen at all in the real app
export type Moment =
  | { kind: "free"; words: string }
  | { kind: "pause"; words: string }
  | { kind: "closed"; words: string };

export function consoleMoment(agent: MockState["agent"]): Moment {
  switch (agent.phase) {
    case "not_live":
      return { kind: "closed", words: "Not live. The inbox is not on screen." };
    case "offered":
      return { kind: "pause", words: "A call is ringing. The call bar wins." };
    case "on_call":
      return { kind: "closed", words: "On a call. The call's page is open." };
    case "wrap_up":
      return { kind: "pause", words: "Wrap-up. The agent is finishing notes." };
    case "available":
    case "ringer_off": {
      const n = agent.newRows.length;
      if (n > 0) {
        return {
          kind: "pause",
          words:
            n === 1
              ? "1 item is waiting in New."
              : `${n} items are waiting in New.`,
        };
      }
      return { kind: "free", words: "Nothing is waiting. A game may run." };
    }
  }
}

export function payrollMoment(run: MockState["run"]): Moment {
  switch (run.stage) {
    case "calculating":
      return { kind: "free", words: "Payroll is calculating. A game may run." };
    case "finalizing":
      return { kind: "free", words: "Payroll is submitting. A game may run." };
    case "review":
      return { kind: "pause", words: "The run is ready to review." };
    case "done":
      return { kind: "pause", words: "Payroll is finalized." };
    case "timesheet":
      return { kind: "closed", words: "No wait yet. The timesheet is open." };
  }
}
