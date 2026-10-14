// The real console lets one tab hold the phone. The mock has one tab.
export function usePhoneTab(): { owns: boolean | null } {
  return { owns: true };
}

export function claimPhone() {
  // Nothing to claim.
}
