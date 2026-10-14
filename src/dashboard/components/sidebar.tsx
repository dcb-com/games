import { ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "~/dashboard/lib/mock-router";

import { cn } from "@dcb/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

import { CommandPaletteButton } from "~/dashboard/components/command-palette";
import { useFrameReset } from "~/dashboard/components/frame-reset";
import type { StaticAppPath } from "~/dashboard/lib/links";
import { safeStorage } from "~/dashboard/lib/safe-storage";

const COLLAPSE_KEY = "dcb.sidebar.collapsed";

// The part of the URL the nav reads to decide where the person is.
export interface NavLocation {
  pathname: string;
  search: string;
}

// `page` is the the payroll provider page whose frame a re-click resets, null for native
// pages. `end: false` marks a leaf that stays "you are here" for the pages
// under it, the way Settings does for a settings page. `activeFor` decides
// "you are here" where comparing paths cannot.
export interface NavLeaf {
  path: StaticAppPath;
  label: string;
  page: number | null;
  end?: boolean;
  activeFor?: (location: NavLocation) => boolean;
}

export type NavItem =
  | { kind: "link"; label: string; icon: LucideIcon; leaf: NavLeaf }
  | {
      kind: "group";
      label: string;
      icon: LucideIcon;
      // A group whose header is a page of its own: the header links there and
      // the chevron opens the list.
      hub?: NavLeaf;
      children: NavLeaf[];
    };

// A leaf is named by where it goes, which is also what the command palette
// keys its rows by.
export function navLeafKey(leaf: NavLeaf): string {
  return leaf.path;
}

function useLeafClick(onNavigate?: () => void) {
  const { pathname } = useLocation();
  const { resetFrame } = useFrameReset();
  return (_e: React.MouseEvent, leaf: NavLeaf) => {
    onNavigate?.();
    // Native pages (page === null) have no frame to reset.
    if (leaf.page !== null && leaf.path === pathname) {
      resetFrame(leaf.page);
    }
  };
}

// Worked out here rather than left to the router's own active state: a
// render-prop className can't survive being cloned into a tooltip trigger, and
// the router ignores the query a settings category is named by.
function leafIsActive(leaf: NavLeaf, location: NavLocation) {
  if (leaf.activeFor) return leaf.activeFor(location);
  if (leaf.end === false)
    return (
      location.pathname === leaf.path ||
      location.pathname.startsWith(`${leaf.path}/`)
    );
  return location.pathname === leaf.path;
}

// A route that hangs off a leaf without being one: /payroll/run/1000313 under
// /payroll/run. The Dashboard leaf is "/", which every path hangs off, so it
// is left out.
function leafHoldsPath(leaf: NavLeaf, pathname: string) {
  return leaf.path !== "/" && pathname.startsWith(`${leaf.path}/`);
}

// Where the current address sits in the nav: the leaf it belongs to, the group
// holding that leaf, and whether the address is the leaf's own page or a
// record inside it. One walk of the tree answers all three, so a leaf and its
// group can never disagree about where the person is.
interface NavPosition {
  group: string | null;
  leafKey: string | null;
  onLeaf: boolean;
}

export function navPosition(
  nav: NavItem[],
  location: NavLocation,
): NavPosition {
  let held: { leaf: NavLeaf; group: string | null } | null = null;

  for (const item of nav) {
    const entries =
      item.kind === "link"
        ? [{ leaf: item.leaf, group: null }]
        : [
            ...(item.hub ? [{ leaf: item.hub, group: item.label }] : []),
            ...item.children.map((leaf) => ({ leaf, group: item.label })),
          ];
    for (const entry of entries) {
      // A leaf of its own always wins, so /people/i9 marks I-9 Forms rather
      // than falling to the /people leaf it happens to sit under.
      if (leafIsActive(entry.leaf, location)) {
        return {
          group: entry.group,
          leafKey: navLeafKey(entry.leaf),
          onLeaf: true,
        };
      }
      if (
        leafHoldsPath(entry.leaf, location.pathname) &&
        (!held || entry.leaf.path.length > held.leaf.path.length)
      ) {
        held = entry;
      }
    }
  }

  if (held) {
    return { group: held.group, leafKey: navLeafKey(held.leaf), onLeaf: false };
  }
  return { group: null, leafKey: null, onLeaf: false };
}

function RailTooltip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactElement;
}) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const linkClass = (collapsed: boolean, isActive: boolean) =>
  cn(
    "flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
    collapsed && "justify-center px-0",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
  );

/**
 * The command palette, at the top of the nav: it is a way to reach a page, so
 * it belongs with the pages. In the collapsed rail it keeps only its icon and
 * names itself in a tooltip, as the links do.
 */
export function SidebarSearch({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
      <RailTooltip label="Search pages" collapsed={collapsed}>
        {/* The button brings the palette itself along, so the tooltip holds a
            wrapper rather than the button. */}
        <span className="block">
          <CommandPaletteButton
            className={cn(
              "w-full",
              collapsed
                ? "justify-center px-0 [&_span]:hidden"
                : "justify-start [&_span]:inline [&>span:last-child]:ml-auto",
            )}
          />
        </span>
      </RailTooltip>
    </div>
  );
}

// The links themselves, shared by the desktop rail and the phone slide-over.
export function SidebarNav({
  nav,
  collapsed = false,
  onNavigate,
  onExpand,
  className,
}: {
  nav: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
  onExpand?: (group: string) => void;
  className?: string;
}) {
  const onLeafClick = useLeafClick(onNavigate);
  const { pathname, searchStr } = useLocation();
  // A settings category is one address, not one path, so the query counts.
  const here = `${pathname}${searchStr}`;

  const position = navPosition(nav, { pathname, search: searchStr });

  // Derived, not synced: a manual toggle overrides the route's default-open
  // group only for the address it was made on.
  const routeGroup = position.group;
  const [groupOverride, setGroupOverride] = useState<{
    here: string;
    group: string | null;
  } | null>(null);
  if (groupOverride && groupOverride.here !== here) {
    setGroupOverride(null);
  }
  const openGroup =
    groupOverride?.here === here ? groupOverride.group : routeGroup;

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex flex-1 flex-col gap-0.5 overflow-y-auto pb-4",
        collapsed ? "px-2" : "px-3",
        className,
      )}
    >
      {nav.map((item) =>
        item.kind === "link" ? (
          <RailTooltip
            key={item.leaf.path}
            label={item.leaf.label}
            collapsed={collapsed}
          >
            <Link
              to={item.leaf.path}
              // The mark is on the leaf the address belongs to; the word
              // "page" is only true when that address is the leaf's own.
              aria-current={
                navLeafKey(item.leaf) === position.leafKey && position.onLeaf
                  ? "page"
                  : undefined
              }
              className={linkClass(
                collapsed,
                navLeafKey(item.leaf) === position.leafKey,
              )}
              onClick={(e) => onLeafClick(e, item.leaf)}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && item.leaf.label}
            </Link>
          </RailTooltip>
        ) : (
          <NavGroup
            key={item.label}
            label={item.label}
            icon={item.icon}
            hub={item.hub}
            items={item.children}
            collapsed={collapsed}
            position={position}
            open={openGroup === item.label}
            onToggle={() =>
              setGroupOverride({
                here,
                group: openGroup === item.label ? null : item.label,
              })
            }
            onExpand={() => {
              onExpand?.(item.label);
              setGroupOverride({ here, group: item.label });
            }}
            onLeafClick={onLeafClick}
          />
        ),
      )}
    </nav>
  );
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(
    () => safeStorage.get(COLLAPSE_KEY) === "1",
  );

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    safeStorage.set(COLLAPSE_KEY, next ? "1" : "0");
  }

  return (
    <aside
      className={cn(
        "border-border bg-card flex h-screen w-0 flex-col overflow-hidden border-r transition-[width] duration-200",
        collapsed ? "md:w-16" : "md:w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center py-4",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && (
          <img src="/dcb-dark.svg" alt="DCB" className="h-6 w-auto" />
        )}
        <button
          type="button"
          onClick={() => setCollapsedPersisted(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-muted-foreground hover:bg-accent/40 hover:text-foreground rounded-lg p-1.5 transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      <SidebarSearch collapsed={collapsed} />

      <SidebarNav
        nav={nav}
        collapsed={collapsed}
        onExpand={() => setCollapsedPersisted(false)}
      />
    </aside>
  );
}

function NavGroup({
  label,
  icon: Icon,
  hub,
  items,
  collapsed,
  position,
  open,
  onToggle,
  onExpand,
  onLeafClick,
}: {
  label: string;
  icon: LucideIcon;
  hub?: NavLeaf;
  items: NavLeaf[];
  collapsed: boolean;
  position: NavPosition;
  open: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onLeafClick: (e: React.MouseEvent, leaf: NavLeaf) => void;
}) {
  const hasActiveChild = items.some(
    (child) => navLeafKey(child) === position.leafKey,
  );
  const hubIsActive = hub ? navLeafKey(hub) === position.leafKey : false;

  if (collapsed) {
    return (
      <RailTooltip label={label} collapsed>
        <button
          type="button"
          aria-label={label}
          onClick={onExpand}
          className={cn(
            "flex w-full items-center justify-center rounded-xl px-0 py-1.5 transition-colors",
            hasActiveChild || hubIsActive
              ? "text-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
        </button>
      </RailTooltip>
    );
  }

  const headerClass = cn(
    "flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
    hasActiveChild
      ? "text-foreground"
      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
  );
  const chevron = (
    <ChevronRight
      className={cn(
        "ml-auto size-4 shrink-0 transition-transform duration-200",
        open && "rotate-90",
      )}
    />
  );

  return (
    <div>
      {hub ? (
        // A group with a page of its own: the name goes there, the chevron
        // opens the list. One click to the hub, one click to a category.
        <div className="flex items-center gap-1">
          <Link
            to={hub.path}
            aria-current={hubIsActive && position.onLeaf ? "page" : undefined}
            className={cn(linkClass(false, hubIsActive), "flex-1")}
            onClick={(e) => {
              onLeafClick(e, hub);
              if (!open) onToggle();
            }}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={
              open ? `Hide ${label} sections` : `Show ${label} sections`
            }
            className="text-muted-foreground hover:bg-accent/40 hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn(headerClass, "w-full")}
        >
          <Icon className="size-4 shrink-0" />
          {label}
          {chevron}
        </button>
      )}
      {/* grid-rows animates 0fr to 1fr, reaching auto content height without measuring.
          `inert` and aria-hidden keep the clipped children out of tab order and the
          a11y tree while collapsed, so a click landing on their coordinates hits the
          nav instead of a hidden link. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        inert={open ? undefined : true}
        aria-hidden={open ? undefined : true}
      >
        <div className="overflow-hidden">
          <div className="border-border mt-0.5 ml-5 flex flex-col gap-0.5 border-l pl-3">
            {items.map((child) => (
              <Link
                key={navLeafKey(child)}
                to={child.path}
                tabIndex={open ? undefined : -1}
                aria-current={
                  navLeafKey(child) === position.leafKey && position.onLeaf
                    ? "page"
                    : undefined
                }
                className={linkClass(
                  false,
                  navLeafKey(child) === position.leafKey,
                )}
                onClick={(e) => onLeafClick(e, child)}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
