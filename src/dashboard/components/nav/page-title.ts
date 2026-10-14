import type { AppLink } from "~/dashboard/lib/links";

// The way back out of a page, shown at the left of the top bar.
export interface PageBack {
  to: AppLink;
  label: string;
}
