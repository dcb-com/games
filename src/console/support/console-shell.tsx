import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Building2,
  ChevronsUpDown,
  Command as CommandIcon,
  FolderOpen,
  Headset,
  History,
  ShieldAlert,
  Inbox,
  Keyboard,
  LayoutList,
  LogOut,
  Phone,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import { cn, focusRing } from "@dcb/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dcb/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@dcb/ui/tooltip";

import { roleLabel } from "~/console/components/staff-labels";
import { useMediaQuery } from "~/console/lib/use-media-query";
import { useMe } from "~/console/lib/use-me";
import { CallBar } from "~/console/support/call-bar";
import { waitClass } from "~/console/support/calls/call-rules";
import { CommandMenu } from "~/console/support/commands/command-menu";
import {
  CommandProvider,
  useCommandMenu,
  useCommands,
} from "~/console/support/commands/command-registry";
import { KeyHint } from "~/console/support/commands/key-hint";
import { ShortcutsDialog } from "~/console/support/commands/shortcuts-dialog";
import { LiveControl } from "~/console/support/live-control";
import { useLive, useNow } from "~/console/support/live-provider";
import { useMock } from "~/mock/store";

type NavTo =
  | "/support"
  | "/cases"
  | "/support/new"
  | "/support/mine"
  | "/support/all"
  | "/support/calls"
  | "/staff"
  | "/companies"
  | "/activity"
  | "/misuse"
  | "/profile";

interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
  keys?: string;
}

// The support sidebar's pages.
// They show only while live. The order never changes; only the counts do.
const SUPPORT_NAV: (NavItem & { adminOnly: boolean })[] = [
  {
    to: "/support/new",
    label: "New",
    icon: Inbox,
    keys: "g n",
    adminOnly: false,
  },
  {
    to: "/support/mine",
    label: "My cases",
    icon: UserRound,
    keys: "g m",
    adminOnly: false,
  },
  {
    to: "/support/all",
    label: "All cases",
    icon: LayoutList,
    keys: "g a",
    adminOnly: true,
  },
  {
    to: "/support/calls",
    label: "Calls",
    icon: Phone,
    keys: "g c",
    adminOnly: false,
  },
];

const SUPPORT_HOME: NavItem = {
  to: "/support",
  label: "Customer support",
  icon: Headset,
};
const CASES: NavItem = { to: "/cases", label: "Cases", icon: FolderOpen };

const ADMIN_NAV: NavItem[] = [
  { to: "/staff", label: "Staff", icon: UsersRound },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/misuse", label: "Watching for misuse", icon: ShieldAlert },
];

// The frame around every signed-in page: the sidebar on the left, and on
// the right the call bar (every page, while live) over the page. The phone
// and the alert for an offer run on every page too (calls/phone-host.tsx).
//
// Customer support is a workspace of its own. While the person is live and on a support page,
// the main sidebar folds to its icon rail and the support sidebar opens
// beside it: the live control, search, and New, My cases, All cases and
// Calls. Not live, a support page is the Go live page, and the support
// sidebar is not drawn.
export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <CommandProvider>
      <Frame>{children}</Frame>
    </CommandProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const { live } = useLive();
  const wide = useMediaQuery("(min-width: 1280px)");
  // The mock is always on New, a support page.
  const onSupport = true;
  const workspace = Boolean(live) && onSupport;
  useFrameCommands();

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar compact={!wide || workspace} workspace={workspace} />
      {workspace && <SupportSidebar />}
      <main className="flex min-w-0 flex-1 flex-col">
        {live && <CallBar />}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
      <CommandMenu />
      <ShortcutsDialog />
    </div>
  );
}

// The commands every page has: going places, the menu and the key list.
function useFrameCommands() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const { setMenuOpen, setShortcutsOpen } = useCommandMenu();
  const go = (item: NavItem) => ({
    id: `go.${item.to}`,
    label: `Go to ${item.label}`,
    group: "Go to" as const,
    icon: item.icon,
    keys: item.keys,
    // The mock has one page, so going elsewhere does nothing.
    run: () => undefined,
  });
  useCommands([
    go(SUPPORT_HOME),
    ...SUPPORT_NAV.filter((i) => !i.adminOnly || isAdmin).map(go),
    ...(isAdmin ? [CASES, ...ADMIN_NAV].map(go) : []),
    go({ to: "/profile", label: "Profile", icon: UserRound }),
    {
      id: "help.menu",
      label: "Command menu",
      group: "Help",
      keys: "mod+k",
      keyOnly: true,
      run: () => setMenuOpen((open) => !open),
    },
    {
      id: "help.shortcuts",
      label: "Keyboard shortcuts",
      group: "Help",
      icon: Keyboard,
      keys: "?",
      run: () => setShortcutsOpen(true),
    },
  ]);
}

// The main sidebar: Customer support for everyone, and for admins Cases
// and the admin pages. Inside the support workspace it is the icon rail,
// and search and the live control move to the support sidebar. Live on
// any other page, the live control stays here.
function Sidebar({
  compact,
  workspace,
}: {
  compact: boolean;
  workspace: boolean;
}) {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const { live } = useLive();

  return (
    <aside
      className={cn(
        "border-sidebar-border bg-sidebar text-sidebar-foreground flex shrink-0 flex-col border-r",
        compact ? "w-14 items-center" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-12 shrink-0 items-center gap-2",
          compact ? "justify-center" : "px-4",
        )}
      >
        {/* Narrower in the rail, so the whole mark fits its 56px. */}
        <img
          src="/dcb-dark.svg"
          alt="DCB"
          className={compact ? "h-auto w-9" : "h-5 w-auto"}
        />
        {!compact && (
          <span className="type-secondary font-medium">Console</span>
        )}
      </div>
      {!workspace && (
        <div
          className={cn(
            "flex w-full flex-col gap-2 pb-3",
            compact ? "px-2" : "px-3",
          )}
        >
          {/* Live but away from support (on Cases, Staff): the same live
              control, so the ringer and End live are never out of reach. */}
          {live && <LiveControl compact={compact} />}
          <SearchButton compact={compact} />
        </div>
      )}
      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto",
          compact ? "w-full px-2" : "px-3",
        )}
      >
        <NavLink
          item={SUPPORT_HOME}
          compact={compact}
          extra={live ? <LiveDot /> : null}
        />
        {isAdmin && (
          <>
            <NavLink item={CASES} compact={compact} />
            <NavGroup title="Admin" compact={compact} />
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.to} item={item} compact={compact} />
            ))}
          </>
        )}
      </nav>
      <div
        className={cn(
          "border-sidebar-border w-full border-t py-2",
          compact ? "px-2" : "px-3",
        )}
      >
        <YouMenu compact={compact} />
      </div>
    </aside>
  );
}

// The support workspace's own sidebar, while live: the live control
// (ringer, End live), search, and the support pages with their counts.
function SupportSidebar() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const counts = { new: useMock().agent.newRows.length, mine: 3, all: 0 };
  const navCounts: Partial<Record<NavTo, number>> = {
    "/support/new": counts.new,
    "/support/mine": counts.mine,
    "/support/all": counts.all,
  };
  return (
    <aside
      aria-label="Customer support"
      className="border-sidebar-border bg-sidebar text-sidebar-foreground flex w-56 shrink-0 flex-col border-r"
    >
      <div className="flex h-12 shrink-0 items-center px-4">
        <span className="type-label font-semibold">Customer support</span>
      </div>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <LiveControl compact={false} />
        <SearchButton compact={false} />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {SUPPORT_NAV.filter((i) => !i.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            item={item}
            compact={false}
            count={
              item.to === "/support/calls" ? undefined : navCounts[item.to]
            }
            extra={item.to === "/support/calls" ? <WaitingCount /> : null}
          />
        ))}
      </nav>
    </aside>
  );
}

// Beside Customer support while the person is live.
function LiveDot() {
  return (
    <span
      role="img"
      aria-label="You are live"
      className="bg-success-foreground size-2 shrink-0 rounded-full"
    />
  );
}

function NavGroup({ title, compact }: { title: string; compact: boolean }) {
  if (compact)
    return <div className="border-sidebar-border mx-2 my-2 border-t" />;
  return <p className="type-caption px-2 pt-3 pb-1 font-medium">{title}</p>;
}

const ACTIVE = new Set<NavTo>(["/support", "/support/new"]);

function NavLink({
  item,
  count,
  extra,
  compact,
}: {
  item: NavItem;
  count?: number;
  extra?: ReactNode;
  compact: boolean;
}) {
  // The real nav is router links. The mock has one page, New, so these
  // are buttons and only New and Customer support are marked as here.
  const active = ACTIVE.has(item.to);
  const link = (
    <button
      type="button"
      aria-label={compact ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        focusRing,
        "hover:bg-secondary hover:text-foreground flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-sm font-medium whitespace-nowrap transition-colors",
        compact && "justify-center px-0",
        active &&
          "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {!compact && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {extra}
          {count !== undefined && count > 0 && (
            <span className="type-caption tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </>
      )}
    </button>
  );
  if (!compact) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {count !== undefined && count > 0 ? ` · ${count}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

// How many calls wait, in the wait's color, beside Calls.
function WaitingCount() {
  const { serverNow } = useLive();
  const now = useNow(serverNow);
  const { agent } = useMock();
  if (agent.waitingCalls === 0) return null;
  const oldestMs = agent.waitingSince ? now - agent.waitingSince : 0;
  return (
    <span
      className={cn("text-xs font-medium tabular-nums", waitClass(oldestMs))}
    >
      {agent.waitingCalls}
    </span>
  );
}

function SearchButton({ compact }: { compact: boolean }) {
  const { setMenuOpen } = useCommandMenu();
  const button = (
    <button
      type="button"
      aria-label={compact ? "Search or run a command" : undefined}
      onClick={() => setMenuOpen(true)}
      className={cn(
        focusRing,
        "text-muted-foreground hover:bg-secondary hover:text-foreground flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors",
        compact && "justify-center px-0",
      )}
    >
      <Search className="size-4 shrink-0" />
      {!compact && (
        <>
          <span className="flex-1 truncate text-left">Search</span>
          <KeyHint keys="mod+k" />
        </>
      )}
    </button>
  );
  if (!compact) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">Search or run a command</TooltipContent>
    </Tooltip>
  );
}

function initials(name: string | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// You, at the foot: Profile, the key list and Sign out.
function YouMenu({ compact }: { compact: boolean }) {
  const me = useMe();
  // Sign out does nothing in the mock.
  const pending = false;
  const signOut = () => undefined;
  const { setShortcutsOpen } = useCommandMenu();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={compact ? "Your account" : undefined}
          className={cn(
            focusRing,
            "hover:bg-secondary flex h-10 w-full items-center gap-2 rounded-md px-1.5 text-left transition-colors",
            compact && "justify-center px-0",
          )}
        >
          <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials(me.data?.name)}
          </span>
          {!compact && me.data && (
            <>
              <span className="min-w-0 flex-1">
                <span className="type-label block truncate">
                  {me.data.name}
                </span>
                <span className="type-caption block truncate">
                  {roleLabel(me.data.role)}
                </span>
              </span>
              <ChevronsUpDown className="text-muted-foreground size-4" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        {me.data && (
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="type-label truncate">{me.data.name}</span>
            <span className="type-caption truncate font-normal">
              {me.data.email}
            </span>
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
          <CommandIcon className="size-4" />
          <span className="flex-1">Keyboard shortcuts</span>
          <KeyHint keys="?" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={signOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
