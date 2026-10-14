import { ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "~/dashboard/lib/mock-router";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@dcb/ui/sheet";

import { AccountMenu } from "~/dashboard/components/nav/account-menu";
import {
  PageActions,
  PageTitleExtra,
  usePageHasActions,
} from "~/dashboard/components/nav/page-actions";
import type { PageBack } from "~/dashboard/components/nav/page-title";
import { PAGE_GUTTER } from "~/dashboard/components/page";
import type { NavItem } from "~/dashboard/components/sidebar";
import { SidebarNav, SidebarSearch } from "~/dashboard/components/sidebar";

/**
 * A thin bar over every page, and the only chrome above a page: the page's
 * name and the way back out of it on the left, the controls that belong to the
 * page (Reload on an embedded page) and the account menu on the right. Below
 * `md:` the rail is gone, so the bar also holds the way into the same nav.
 */
export function TopBar({
  nav,
  title,
  back,
}: {
  nav: NavItem[];
  title: string;
  back: PageBack | null;
}) {
  const [open, setOpen] = useState(false);
  const hasActions = usePageHasActions();

  return (
    <div
      className={cn(
        "border-border bg-card flex flex-wrap items-center gap-x-2 border-b py-2",
        PAGE_GUTTER,
      )}
    >
      <div className="order-1 flex min-w-0 flex-1 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open navigation"
          className="-ml-2 md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </Button>
        {back && (
          <Button variant="ghost" size="sm" asChild className="-ml-2 shrink-0">
            <Link {...back.to} aria-label={`Back to ${back.label}`}>
              <ChevronLeft />
              {/* A page with no name of its own is already named by the list
                  it sits in, so the arrow stands alone rather than saying the
                  same words twice. */}
              {back.label !== title && (
                <span className="hidden sm:inline">{back.label}</span>
              )}
            </Link>
          </Button>
        )}
        <h1 className="type-label truncate">{title}</h1>
        {/* What the page adds about the record it is showing. */}
        <PageTitleExtra />
      </div>
      {/* On a phone the page's buttons take a row under the page's name
          rather than squeezing it down to a few letters, so they come after the
          account menu and only claim a row when the page has any. There they
          share the full width, the way a phone screen lays out its main
          action, rather than huddling at the right edge. From `md:` the bar
          is one row again; the account menu keeps its name and workspace text
          back until `lg:` so the row has room. */}
      <div
        className={cn(
          "order-3 flex shrink-0 items-center justify-end gap-2 md:order-2",
          hasActions ? "max-md:mt-2 max-md:w-full max-md:*:flex-1" : "hidden",
        )}
      >
        <PageActions />
      </div>
      <div className="order-2 shrink-0 md:order-3">
        <AccountMenu />
      </div>

      {/* The panel itself doesn't scroll: the nav inside it does, so the logo
          and the search stay where they are. The account menu is in the bar
          above at every width, so the drawer holds only the way to a page. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <img
              src="/dcb-dark.svg"
              alt="DCB"
              className="h-6 w-auto self-start"
            />
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              The same pages as the sidebar.
            </SheetDescription>
          </SheetHeader>
          <SidebarSearch />
          <SidebarNav
            nav={nav}
            onNavigate={() => setOpen(false)}
            className="min-h-0 flex-1"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
