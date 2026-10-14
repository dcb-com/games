import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dcb/ui/dialog";

import { useCommandMenu } from "~/console/support/commands/command-registry";
import { KeyHint } from "~/console/support/commands/key-hint";

// Every key the console knows. It is a fixed list rather than the registry, so
// a person sees every key, including those of a page they are not on.
const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Anywhere",
    rows: [
      ["mod+k", "Command menu"],
      ["?", "Keyboard shortcuts"],
      ["g n", "Go to New"],
      ["g m", "Go to My cases"],
      ["g a", "Go to All cases (admins)"],
      ["g c", "Go to Calls"],
      ["c", "Start a case"],
      ["a", "Answer the call being offered"],
    ],
  },
  {
    title: "In a list",
    rows: [
      ["j", "Next row"],
      ["k", "Previous row"],
      ["enter", "Open the row (My cases)"],
      ["p", "Pick up the row"],
      ["shift+p", "Pick up next, the oldest in New"],
      ["/", "Search the list (All cases)"],
    ],
  },
  {
    title: "In a case",
    rows: [
      ["r", "Reply"],
      ["n", "Note"],
      ["mod+enter", "Send the reply or add the note"],
      ["e", "Close case"],
      ["f", "Add follow-up"],
      ["m", "Merge into another case"],
      ["[", "Show or hide the list"],
    ],
  },
];

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useCommandMenu();
  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Keys work anywhere except while you type in a field. Nothing that
            gives work away or stops calls has a key.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title} className="flex flex-col gap-1">
              <h3 className="type-caption mb-1 font-medium">{section.title}</h3>
              {section.rows.map(([keys, label]) => (
                <div
                  key={keys}
                  className="flex h-8 items-center justify-between gap-4"
                >
                  <span className="type-body">{label}</span>
                  <KeyHint keys={keys} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
