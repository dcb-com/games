import type { LucideIcon } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Stroke } from "~/console/support/commands/keys";
import {
  isMacPlatform,
  parseKeys,
  strokeMatches,
  typingTarget,
} from "~/console/support/commands/keys";

// One list of what the person can do from where they are. A
// button, a menu item, the command menu and a key all run the same
// command, so an action never behaves one way from one and another way
// from the other.
//
// A component registers its commands with `useCommands([...])` on every
// render, so each command's `run` sees the component's current state. The
// registration goes when the component unmounts.

export type CommandGroup =
  | "Go to"
  | "Live"
  | "Work"
  | "This case"
  | "List"
  | "Help";

export const GROUP_ORDER: CommandGroup[] = [
  "This case",
  "Work",
  "List",
  "Live",
  "Go to",
  "Help",
];

export interface Command {
  // Unique across the console: "case.close", "go.new".
  id: string;
  label: string;
  group: CommandGroup;
  // See keys.ts for the shape: "e", "shift+p", "g n", "mod+k".
  keys?: string;
  icon?: LucideIcon;
  // Extra words the command menu matches on.
  keywords?: string[];
  // Shown in the menu but greyed, with this reason. Its key does nothing.
  disabledReason?: string;
  // Reachable by key only, not listed in the menu (J, K, Enter on a list).
  keyOnly?: boolean;
  run: () => void;
}

interface Registry {
  set: (owner: string, commands: Command[]) => void;
  remove: (owner: string) => void;
  all: () => Command[];
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  shortcutsOpen: boolean;
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  isMac: boolean;
}

const RegistryContext = createContext<Registry | null>(null);

function useRegistry(): Registry {
  const registry = useContext(RegistryContext);
  if (!registry) throw new Error("CommandProvider is missing");
  return registry;
}

// Registers commands for as long as the calling component is mounted.
export function useCommands(commands: Command[]): void {
  // `set` and `remove` never change. The registry object itself changes
  // whenever the menu or the shortcuts list opens, so an effect keyed on it
  // would run its clean-up then and drop these commands.
  const { set, remove } = useRegistry();
  const owner = useId();
  useLayoutEffect(() => {
    set(owner, commands);
  });
  useEffect(() => () => remove(owner), [remove, owner]);
}

export function useCommandMenu() {
  const r = useRegistry();
  return {
    menuOpen: r.menuOpen,
    setMenuOpen: r.setMenuOpen,
    shortcutsOpen: r.shortcutsOpen,
    setShortcutsOpen: r.setShortcutsOpen,
    all: r.all,
    isMac: r.isMac,
  };
}

// Whether a menu, popover or dialog has the keyboard; then only "mod+"
// keys reach the console.
function overlayOpen(target: EventTarget | null): boolean {
  if (target instanceof HTMLElement) {
    if (target.closest("[role=dialog],[role=menu],[role=listbox]")) return true;
  }
  return (
    document.querySelector(
      "[role=dialog][data-state=open],[role=alertdialog][data-state=open],[role=menu][data-state=open]",
    ) !== null
  );
}

function pressable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("button,a[href],[role=button],[role=link],summary") !== null
  );
}

const SEQUENCE_MS = 1_000;

export function CommandProvider({ children }: { children: ReactNode }) {
  const owners = useRef(new Map<string, Command[]>());
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isMac = useMemo(() => isMacPlatform(), []);

  const set = useCallback((owner: string, commands: Command[]) => {
    owners.current.set(owner, commands);
  }, []);
  const remove = useCallback((owner: string) => {
    owners.current.delete(owner);
  }, []);
  // The most recent registration of an id wins, so a page can stand in for
  // a command the frame also offers.
  const all = useCallback(() => {
    const byId = new Map<string, Command>();
    for (const list of owners.current.values()) {
      for (const c of list) byId.set(c.id, c);
    }
    return [...byId.values()];
  }, []);

  // The keys. A sequence ("g n") waits a second for its second stroke.
  const pending = useRef<{ strokes: Stroke[]; at: number } | null>(null);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.isComposing) return;
      const commands = all().filter((c) => c.keys && !c.disabledReason);
      const withMod = e.metaKey || e.ctrlKey;
      const blocked = typingTarget(e.target) || overlayOpen(e.target);
      if (blocked && !withMod) return;
      // Enter and Space belong to a focused button or link.
      if (
        (e.key === "Enter" || e.key === " ") &&
        !withMod &&
        pressable(e.target)
      ) {
        return;
      }

      const now = Date.now();
      const prior =
        pending.current && now - pending.current.at < SEQUENCE_MS
          ? pending.current.strokes
          : null;
      pending.current = null;

      for (const c of commands) {
        const strokes = parseKeys(c.keys ?? "");
        if (blocked && !strokes.some((s) => s.mod)) continue;
        if (strokes.length === 2 && prior) {
          const [first, second] = strokes;
          if (
            first &&
            second &&
            prior[0]?.key === first.key &&
            strokeMatches(second, e, isMac)
          ) {
            e.preventDefault();
            c.run();
            return;
          }
        }
      }
      for (const c of commands) {
        const strokes = parseKeys(c.keys ?? "");
        if (blocked && !strokes.some((s) => s.mod)) continue;
        const [first] = strokes;
        if (!first || !strokeMatches(first, e, isMac)) continue;
        e.preventDefault();
        if (strokes.length === 1) {
          c.run();
          return;
        }
        // The first stroke of a sequence: wait for the second.
        pending.current = { strokes: [first], at: now };
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [all, isMac]);

  const value = useMemo<Registry>(
    () => ({
      set,
      remove,
      all,
      menuOpen,
      setMenuOpen,
      shortcutsOpen,
      setShortcutsOpen,
      isMac,
    }),
    [set, remove, all, menuOpen, shortcutsOpen, isMac],
  );

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
}
