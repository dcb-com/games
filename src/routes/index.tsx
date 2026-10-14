import { Headset, Landmark } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn, focusRing } from "@dcb/ui";

// The start page: the two screens a game could live in.
export const Route = createFileRoute("/")({
  component: Home,
});

const SCREENS = [
  {
    to: "/console" as const,
    icon: Headset,
    title: "Support console",
    body: "Support agents, while live with no call ringing and nothing waiting in New.",
  },
  {
    to: "/payroll" as const,
    icon: Landmark,
    title: "Payroll dashboard",
    body: "Payroll admins, while a payroll run calculates or submits.",
  },
];

function Home() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <img
            src="/dcb-dark.svg"
            alt="DCB"
            className="h-6 w-auto self-start"
          />
          <h1 className="type-page-title mt-4">Games, in place</h1>
          <p className="type-secondary">
            Copies of two DCB screens, running on made-up data. Each has an
            empty box where a game would open. Use the panel at the bottom left
            to make a call ring or a payroll run finish.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SCREENS.map(({ to, icon: Icon, title, body }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                focusRing,
                "border-border bg-card hover:bg-secondary flex flex-col gap-2 rounded-lg border p-5 transition-colors",
              )}
            >
              <Icon className="text-primary size-5" />
              <span className="type-label">{title}</span>
              <span className="type-secondary">{body}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
