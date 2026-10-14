import { ChevronDown, LogOut, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dcb/ui/dropdown-menu";

// The signed-in admin and their company. Made up.
const USER = {
  firstName: "Pat",
  name: "Pat Admin",
  email: "pat.admin@example.com",
};
const WORKSPACE = "Example Supply Co · Admin";

/**
 * Who is signed in, which company their screen is about, and the one menu that
 * changes either: the workspaces they can work in, their own account, and the
 * way out. It sits in the top bar at every width, so there is one place to
 * look for all of it.
 */
export function AccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account and workspace"
          className="hover:bg-accent/40 flex max-w-[15rem] items-center gap-2 rounded-xl px-2 py-1 transition-colors xl:max-w-[24rem]"
        >
          <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {USER.firstName[0]}
          </span>
          {/* The name and the company are the whole point of the control, so
              they only give way on a phone, where the bar has no room. */}
          <span className="hidden min-w-0 flex-col items-start text-left lg:flex">
            <span className="text-foreground w-full truncate text-sm font-medium">
              {USER.name}
            </span>
            <span className="text-muted-foreground w-full truncate text-xs">
              {WORKSPACE}
            </span>
          </span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{USER.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {USER.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
