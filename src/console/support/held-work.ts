// What goes back to New when a person ends live. The mock holds nothing,
// so End live never needs to ask.

export function useHeldWork() {
  return { emails: 0 };
}

export function useHeldCasesLine(): string | null {
  return null;
}

export function endDialogWords(_held: { emails: number }): string | null {
  return null;
}
