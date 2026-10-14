// A refused submit leaves the reason somewhere in a tall, scrolling body. This
// takes the reader to the first field that caused it.
//
// Every control in the app marks itself with aria-invalid when its field has a
// shown error (see inputs.tsx and the bound controls in form.tsx), so one
// selector finds the first one in document order. FormRoot calls this after a
// failed submit; hand-rolled forms (finalize) call it themselves.

const INVALID_SELECTOR = '[aria-invalid="true"]';

/** The two things this does to the control it finds. */
interface FocusableControl {
  focus(options?: FocusOptions): void;
  scrollIntoView(options?: ScrollIntoViewOptions): void;
}

/** The part of a form this reads: a lookup for the first invalid control. */
export interface InvalidControlRoot {
  querySelector(selector: string): FocusableControl | null;
}

// A smooth scroll is movement across the screen, which is exactly what the
// reader asked the system to stop doing.
function scrollBehavior(): ScrollBehavior {
  const ask =
    typeof globalThis.matchMedia === "function"
      ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  return ask?.matches ? "auto" : "smooth";
}

/**
 * Focuses the first invalid control inside `root` and brings it on screen.
 * Returns true when there was one, so a caller can tell a refused submit from
 * one that went through.
 */
export function focusFirstInvalid(
  root: InvalidControlRoot | null | undefined,
): boolean {
  const first = root?.querySelector(INVALID_SELECTOR);
  if (!first) return false;
  // Focus first, scroll second: focus() alone jumps the field into view with no
  // animation, and on a long form that jump is disorienting.
  first.focus({ preventScroll: true });
  first.scrollIntoView({ block: "center", behavior: scrollBehavior() });
  return true;
}
