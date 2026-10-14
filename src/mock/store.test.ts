import { beforeEach, describe, expect, it } from "vitest";

import { consoleMoment, payrollMoment } from "~/games/moments";
import {
  agent,
  getMockState,
  OFFER_MS,
  resetMock,
  run,
  tick,
  WRAP_UP_MS,
} from "~/mock/store";

beforeEach(() => resetMock());

describe("the support console's moments", () => {
  it("is free while live with nothing waiting", () => {
    expect(consoleMoment(getMockState().agent).kind).toBe("free");
  });

  it("asks a game to pause the moment a call rings", () => {
    agent.offerCall();
    expect(consoleMoment(getMockState().agent)).toEqual({
      kind: "pause",
      words: "A call is ringing. The call bar wins.",
    });
  });

  it("asks a game to pause when work arrives in New", () => {
    agent.addEmail();
    expect(consoleMoment(getMockState().agent).kind).toBe("pause");
  });

  it("takes the agent out of live when a call rings out", () => {
    agent.offerCall();
    tick(Date.now() + OFFER_MS + 1);
    const a = getMockState().agent;
    expect(a.phase).toBe("not_live");
    expect(a.leftReason).toBe("ignored_call");
  });

  it("ends wrap-up by itself", () => {
    agent.answer();
    agent.hangUp();
    tick(Date.now() + WRAP_UP_MS + 1);
    expect(getMockState().agent.phase).toBe("available");
  });
});

describe("the payroll run's moments", () => {
  it("is free while the run calculates and pauses when it is ready", () => {
    run.calculate();
    expect(payrollMoment(getMockState().run).kind).toBe("free");
    tick(Date.now() + getMockState().run.durationMs + 1);
    expect(getMockState().run.stage).toBe("review");
    expect(payrollMoment(getMockState().run).kind).toBe("pause");
  });

  it("finishes a submit as Done", () => {
    run.finalize();
    run.finishNow();
    expect(getMockState().run.stage).toBe("done");
  });
});
