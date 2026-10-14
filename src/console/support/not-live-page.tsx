import { Inbox, Info, Loader2, Phone, Radio, UserRound } from "lucide-react";

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
} from "@dcb/ui/alert";
import { Button } from "@dcb/ui/button";
import { FieldError } from "@dcb/ui/field";

import { errorMessage } from "~/console/lib/error-messages";
import { leftLiveNotice } from "~/console/support/live-words";
import { useLive } from "~/console/support/live-provider";
import { useGoLive } from "~/console/support/use-live-actions";

// What going live opens up, for someone seeing this for the first time.
const UNLOCKS = [
  { icon: Inbox, words: "Pick up emails waiting in New" },
  { icon: UserRound, words: "Work your cases in My cases" },
  { icon: Phone, words: "Take calls as they come in" },
];

// What every support address shows while the person is not live: one block in the middle of the main area,
// and nothing else of support loads. Go live runs the same action as the
// sidebar's live control (support/use-live-actions.ts).
export function NotLivePage() {
  const { left, elsewhere, error: stateError } = useLive();
  const { goLive, waiting, error } = useGoLive();
  const notice = leftLiveNotice(left);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        {notice && (
          <Alert tone="warning" className="w-full text-left">
            <AlertIcon>
              <Info />
            </AlertIcon>
            <AlertContent>
              {notice.map((line) => (
                <AlertDescription key={line}>{line}</AlertDescription>
              ))}
            </AlertContent>
          </Alert>
        )}
        {stateError !== null && (
          <FieldError>
            {errorMessage(stateError, "We could not check if you are live.")}
          </FieldError>
        )}
        <h1 className="type-page-title">
          {elsewhere ? "You're live in another browser." : "You are not live"}
        </h1>
        <p className="type-secondary">
          {elsewhere
            ? "Calls and cases work in that browser only. To work here instead, go live here. You will be asked for your passkey."
            : "Go live to take calls and work cases. You will be asked for your passkey."}
        </p>
        <Button disabled={waiting} onClick={() => void goLive()}>
          {waiting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          {waiting
            ? "Waiting for your passkey"
            : elsewhere
              ? "Go live here"
              : "Go live"}
        </Button>
        {error && <FieldError>{error}</FieldError>}
        <ul className="border-border mt-2 flex w-full flex-col gap-2 border-t pt-4 text-left">
          {UNLOCKS.map(({ icon: Icon, words }) => (
            <li key={words} className="type-secondary flex items-center gap-2">
              <Icon className="size-4 shrink-0" aria-hidden />
              {words}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
