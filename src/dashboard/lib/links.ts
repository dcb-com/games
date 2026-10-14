// The real file types every address from the generated route tree. The
// mock has no routes for the nav's pages, so an address is a string.
export type StaticAppPath = string;

export interface AppLink {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}
