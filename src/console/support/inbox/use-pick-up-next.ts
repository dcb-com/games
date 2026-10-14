import { agent, useMock } from "~/mock/store";

// Pick up the oldest row in New. The real hook asks the server, which makes
// the item the person's own; the mock takes it off the list.
export function usePickUpNext() {
  const { agent: a } = useMock();
  const oldest = a.newRows[0];
  return {
    count: a.newRows.length as number | null,
    canPickUp: oldest !== undefined,
    pending: false,
    pickUpNext: () => {
      if (oldest) agent.pickUp(oldest.id);
    },
  };
}
