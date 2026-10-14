import { Fragment } from "react";

import { cn } from "@dcb/ui";
import { Kbd, KbdGroup } from "@dcb/ui/kbd";

import { keyLabels } from "~/console/support/commands/keys";
import { useCommandMenu } from "~/console/support/commands/command-registry";

// A command's keys as printed keycaps: "⌘ K", "G then N". Used in menus,
// tooltips, the command menu and the shortcuts list, so a key is always
// taught the same way.
export function KeyHint({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}) {
  const { isMac } = useCommandMenu();
  const strokes = keyLabels(keys, isMac);
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {strokes.map((stroke, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="type-caption">then</span>}
          <KbdGroup>
            {stroke.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </KbdGroup>
        </Fragment>
      ))}
    </span>
  );
}
