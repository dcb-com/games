import { describe, expect, it } from "vitest";

import { KNOWN_STATUSES, STATUS } from "~/dashboard/components/status-badge";

// Every status word the coherence review (section P8 / "1(m)") found across
// the nine mappings this component replaces. If a future status word is
// dropped from STATUS, this test names which one.
const EXPECTED_STATUSES = [
  "active",
  "invited",
  "mfa_on",
  "mfa_off",
  "issued",
  "voided",
  "draft",
  "in_progress",
  "awaiting",
  "finished",
  "finalized",
  "locked",
  "needs_attention",
  "not_provisioned",
  "revoked",
  "built_in",
  "step_action_needed",
  "step_waiting",
  "step_done",
];

describe("STATUS", () => {
  it.each(EXPECTED_STATUSES)("maps %s to a label and a tone", (status) => {
    expect(STATUS[status]).toBeDefined();
    expect(STATUS[status]?.label.length).toBeGreaterThan(0);
    expect(STATUS[status]?.tone).toBeDefined();
  });

  it("covers exactly the statuses it advertises", () => {
    expect(new Set(KNOWN_STATUSES)).toEqual(new Set(EXPECTED_STATUSES));
  });

  it("uses 'Created' rather than 'Issued' for an invoice", () => {
    expect(STATUS.issued?.label).toBe("Created");
  });

  it("every tone is one the badge primitive actually renders", () => {
    const valid = new Set([
      "success",
      "warning",
      "destructive",
      "outline",
      "secondary",
      "default",
    ]);
    for (const status of KNOWN_STATUSES) {
      expect(valid.has(STATUS[status]?.tone ?? "")).toBe(true);
    }
  });
});
