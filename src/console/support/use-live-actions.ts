import { agent } from "~/mock/store";

// The real hooks call the server and ask for a passkey. These change the
// mock store at once.

export function useGoLive() {
  return {
    goLive: () => {
      agent.goLive();
      return Promise.resolve();
    },
    waiting: false,
    error: null as string | null,
  };
}

export function useEndLive() {
  return {
    end: () => {
      agent.endLive();
      return Promise.resolve();
    },
    pending: false,
  };
}

export function useRinger() {
  return {
    setRinger: (on: boolean) => {
      agent.setRinger(on);
      return Promise.resolve();
    },
    pending: false,
  };
}
