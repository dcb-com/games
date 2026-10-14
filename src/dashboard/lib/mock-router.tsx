import type { ComponentProps } from "react";

// The real dashboard has a route for every page in its nav. This mock has
// one page, a payroll run, so the nav and the top bar use these stand-ins:
// a link that shows where it would go but stays put, and a location fixed
// on the run.

export const MOCK_PATHNAME = "/payroll/run/1001";

export function useLocation(): { pathname: string; searchStr: string } {
  return { pathname: MOCK_PATHNAME, searchStr: "" };
}

export function Link({
  to,
  params: _params,
  search: _search,
  ...props
}: Omit<ComponentProps<"a">, "href"> & {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}) {
  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        props.onClick?.(e);
      }}
      {...props}
    />
  );
}
