import { agent, useMock } from "~/mock/store";

// Browsers block sound until the page is clicked. The dev panel can pretend
// that has happened, to show the "Sound is off" button.
export function useSound() {
  const { agent: a } = useMock();
  return {
    blocked: a.soundBlocked,
    turnOn: () => agent.setSoundBlocked(false),
  };
}
