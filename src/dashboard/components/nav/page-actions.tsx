import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useLocation } from "~/dashboard/lib/mock-router";

import { Button } from "@dcb/ui/button";

/**
 * The top bar is the only chrome above a page, so anything that belongs to the
 * page in view and is not the page itself is drawn up there: a word beside the
 * page's name, the page's own buttons, and Reload on a page we embed.
 *
 * A page hands its buttons over as they are, through a portal, so a button
 * keeps the page's state and its handlers. Reload is a function rather than a
 * button, because the bar draws the same button on every embedded page.
 *
 * Either way a page speaks only for the route it was mounted on. The frame
 * hosts keep every page someone has opened mounted and hidden, so several are
 * in the tree at once and only the one whose route is open may draw anything.
 */

/** The places in the bar a page can put something. */
type SlotName = "title" | "actions";
type Slots = Partial<Record<SlotName, HTMLElement | null>>;
type SetSlot = (name: SlotName, node: HTMLElement | null) => void;
type Register = (path: string, reload: () => void) => () => void;
type Fill = (path: string) => () => void;

// Separate contexts so that filling one of them does not re-run the effects
// that fill the others: `register`, `fill` and `setSlot` never change.
const RegisterContext = createContext<Register | null>(null);
const ReloadsContext = createContext<Readonly<Record<string, () => void>>>({});
const FillContext = createContext<Fill | null>(null);
const FilledContext = createContext<Readonly<Record<string, true>>>({});
const SlotsContext = createContext<Slots>({});
const SetSlotContext = createContext<SetSlot>(() => undefined);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [reloads, setReloads] = useState<Readonly<Record<string, () => void>>>(
    {},
  );
  const [filled, setFilled] = useState<Readonly<Record<string, true>>>({});
  const [slots, setSlots] = useState<Slots>({});

  const setSlot = useCallback<SetSlot>((name, node) => {
    setSlots((prev) =>
      prev[name] === node ? prev : { ...prev, [name]: node },
    );
  }, []);

  const register = useCallback<Register>((path, reload) => {
    setReloads((prev) => ({ ...prev, [path]: reload }));
    return () =>
      setReloads((prev) => {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      });
  }, []);

  // Says that the page on `path` has buttons for the bar, so the bar can keep
  // the place they go out of the layout on the pages that have none.
  const fill = useCallback<Fill>((path) => {
    setFilled((prev) => ({ ...prev, [path]: true }));
    return () =>
      setFilled((prev) => {
        if (!(path in prev)) return prev;
        const next = { ...prev };
        delete next[path];
        return next;
      });
  }, []);

  return (
    <RegisterContext.Provider value={register}>
      <ReloadsContext.Provider value={reloads}>
        <FillContext.Provider value={fill}>
          <FilledContext.Provider value={filled}>
            <SlotsContext.Provider value={slots}>
              <SetSlotContext.Provider value={setSlot}>
                {children}
              </SetSlotContext.Provider>
            </SlotsContext.Provider>
          </FilledContext.Provider>
        </FillContext.Provider>
      </ReloadsContext.Provider>
    </RegisterContext.Provider>
  );
}

/**
 * Offers the page's Reload to the top bar while its route is open. Pass
 * undefined when the page has nothing to reload, such as a tab holding one of
 * our own screens rather than a frame.
 */
export function usePageReload(onReload: (() => void) | undefined) {
  const register = useContext(RegisterContext);
  const { pathname } = useLocation();
  // The route this page belongs to is the one it was mounted on. Reading the
  // live path instead would let a hidden page put its Reload on whatever route
  // is open now.
  const [home] = useState(pathname);

  // The handler is a fresh closure on every render of the page that owns it,
  // and what the bar holds is one wrapper that calls the newest one.
  const latest = useRef(onReload);
  useEffect(() => {
    latest.current = onReload;
  }, [onReload]);

  const offered = Boolean(onReload);
  useEffect(() => {
    if (!register || !offered) return;
    return register(home, () => latest.current?.());
  }, [register, offered, home]);
}

// Draws the page's own nodes in one place in the bar, and nothing at all when
// the page that filled it is not the page in view.
function TopBarPortal({
  name,
  children,
}: {
  name: SlotName;
  children?: ReactNode;
}) {
  const slot = useContext(SlotsContext)[name];
  const fill = useContext(FillContext);
  const { pathname } = useLocation();
  const [home] = useState(pathname);

  // The bar has to know whether the page has buttons before it draws the place
  // they go, and a portal says nothing about its own contents, so the page
  // that owns them says so here.
  const offered = name === "actions" && Boolean(children);
  useEffect(() => {
    if (!fill || !offered) return;
    return fill(home);
  }, [fill, offered, home]);

  if (!slot || !children || home !== pathname) return null;
  return createPortal(children, slot);
}

/** What the page adds about the record in view, beside the page's name. */
export function TopBarTitleExtra({ children }: { children?: ReactNode }) {
  return <TopBarPortal name="title">{children}</TopBarPortal>;
}

/** The page's own buttons, on the right of the bar. See PageHeader. */
export function TopBarActions({ children }: { children?: ReactNode }) {
  return <TopBarPortal name="actions">{children}</TopBarPortal>;
}

// One slot in the bar. The callback ref hands the node to the provider, so a
// page can portal into it.
function Slot({ name, className }: { name: SlotName; className?: string }) {
  const setSlot = useContext(SetSlotContext);
  const ref = useCallback(
    (node: HTMLElement | null) => setSlot(name, node),
    [name, setSlot],
  );
  return <div ref={ref} className={className} />;
}

/** Beside the page's name: what the page says about the record in view. */
export function PageTitleExtra() {
  return <Slot name="title" className="flex min-w-0 items-center gap-2" />;
}

/**
 * Whether the page in view has anything for the bar to draw on its right. The
 * bar asks before it lays itself out: below `sm:` a page with buttons gets a
 * row of its own for them, and a page without stays one row tall.
 */
export function usePageHasActions() {
  const reloads = useContext(ReloadsContext);
  const filled = useContext(FilledContext);
  const { pathname } = useLocation();
  return Boolean(reloads[pathname] ?? filled[pathname]);
}

/** The controls that belong to the page in view, for the top bar's right side. */
export function PageActions() {
  const reloads = useContext(ReloadsContext);
  const { pathname } = useLocation();
  const reload = reloads[pathname];

  return (
    <>
      {reload && (
        <Button variant="outline" size="sm" onClick={reload}>
          <RotateCw /> Reload
        </Button>
      )}
      <Slot
        name="actions"
        className="flex items-center gap-2 max-md:*:flex-1"
      />
    </>
  );
}
