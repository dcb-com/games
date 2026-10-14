import { agent } from "~/mock/store";

// The call bar's buttons. The real hook calls the server; these change the
// mock store at once.
export function useCallActions() {
  const done = () => Promise.resolve(true);
  return {
    pending: null as "answer" | "hangUp" | "transfer" | "done" | null,
    answer: (_conversationId: string) => {
      agent.answer();
      return done();
    },
    sendBack: (_conversationId: string) => {
      agent.sendBack();
      return done();
    },
    mute: (_on: boolean) => {
      agent.toggleMute();
      return done();
    },
    hold: (_on: boolean) => {
      agent.toggleHold();
      return done();
    },
    hangUp: () => {
      agent.hangUp();
      return done();
    },
    transfer: (_to: { staffId: string; name: string }, _note: string) => {
      agent.hangUp();
      return done();
    },
    done: () => {
      agent.wrapUpDone();
      return done();
    },
  };
}
