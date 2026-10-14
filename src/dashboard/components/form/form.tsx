import {
  createFormHook,
  createFormHookContexts,
  useStore,
} from "@tanstack/react-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@dcb/ui";
import { Button } from "@dcb/ui/button";
import { Checkbox } from "@dcb/ui/checkbox";
import { Field, FieldError } from "@dcb/ui/field";
import { Input } from "@dcb/ui/input";
import { Select } from "@dcb/ui/select";

import { focusFirstInvalid } from "~/dashboard/components/form/focus-invalid";
import {
  CheckboxField,
  DateField,
  MoneyField,
  SelectField,
  TextareaField,
  TextField,
} from "~/dashboard/components/form/inputs";

// The app's form hook. Every form is built the same way:
//
//   const form = useAppForm({ defaultValues, onSubmit });
//
//   <form.AppForm>
//     <form.Root>
//       <form.AppField name="email" validators={rules(required("Email"), email)}>
//         {(field) => <field.Text label="Email" type="email" />}
//       </form.AppField>
//       <form.Submit busy="Saving…">Continue</form.Submit>
//     </form.Root>
//   </form.AppForm>
//
// Defaults baked in here, so no form has to remember them:
//  - validators run on every change (see rules.ts), errors show only after
//    blur or a submit attempt, and clear as soon as the value is valid;
//  - the submit button is never disabled on validity, only while submitting,
//    so Enter always works and a click always explains what is wrong;
//  - a failed submit surfaces every error at once and focuses the first one.
//
// Bound field components read value / onChange / onBlur / error from the field
// context, so a step only spells out label, options, and copy. Add a new input
// by writing a plain component in inputs.tsx and binding it below.

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

// Re-exported so a hand-rolled form can reach the same behaviour from the one
// place it already imports the form kit.

// The form library types a list of errors as `any[]`. Ours are sentences;
// anything else is not shown.
// oxlint-disable-next-line dcb/no-unknown -- the input is the form library's untyped error list, checked here
function firstText(errors: readonly unknown[]): string | undefined {
  const [first] = errors;
  return typeof first === "string" ? first : undefined;
}

// "Reward early, punish late": the error is always current, but it is not
// shown until the user has left the field or tried to submit.
function useShownError(): string | undefined {
  // oxlint-disable-next-line dcb/no-unknown -- only the field's errors are read here, never its value, so any field fits
  const field = useFieldContext<unknown>();
  const first = useStore(field.store, (s) => firstText(s.meta.errors));
  const isBlurred = useStore(field.store, (s) => s.meta.isBlurred);
  const submitted = useStore(field.form.store, (s) => s.submissionAttempts > 0);
  if (!isBlurred && !submitted) return undefined;
  return first;
}

type Unbound<P> = Omit<P, "name" | "value" | "onChange" | "onBlur" | "error">;

// Optional per-keystroke transform (e.g. SSN masking, uppercasing).
interface Transform {
  transform?: (value: string) => string;
}

function BoundText({
  transform,
  ...props
}: Unbound<React.ComponentProps<typeof TextField>> & Transform) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <TextField
      {...props}
      name={field.name}
      value={value}
      onChange={(v) => field.handleChange(transform ? transform(v) : v)}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}

function BoundMoney(props: Unbound<React.ComponentProps<typeof MoneyField>>) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <MoneyField
      {...props}
      name={field.name}
      value={value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}

function BoundDate(props: Unbound<React.ComponentProps<typeof DateField>>) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <DateField
      {...props}
      name={field.name}
      value={value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}

function BoundSelect(props: Unbound<React.ComponentProps<typeof SelectField>>) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <SelectField
      {...props}
      name={field.name}
      value={value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}

function BoundTextarea(
  props: Unbound<React.ComponentProps<typeof TextareaField>>,
) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <TextareaField
      {...props}
      name={field.name}
      value={value}
      onChange={field.handleChange}
      onBlur={field.handleBlur}
      error={error}
    />
  );
}

function BoundCheckbox(
  props: Omit<
    React.ComponentProps<typeof CheckboxField>,
    "name" | "checked" | "onChange" | "error"
  >,
) {
  const field = useFieldContext<boolean>();
  const checked = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <CheckboxField
      {...props}
      name={field.name}
      checked={checked}
      onChange={field.handleChange}
      error={error}
    />
  );
}

// Raw controls for compact layouts (dialog rows). They carry aria-invalid but
// leave the message to <field.Error />, which the layout places where it wants.
function BoundInput({
  transform,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "onBlur"> &
  Transform) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) =>
        field.handleChange(
          transform ? transform(e.target.value) : e.target.value,
        )
      }
      onBlur={field.handleBlur}
      aria-invalid={error ? true : undefined}
    />
  );
}

// A password box with an eye that shows what was typed, so a new password is
// typed once and read back, not typed twice.
function BoundPasswordInput({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur" | "type"
>) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="relative">
      <BoundInput
        {...props}
        type={shown ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((v) => !v)}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
      >
        <Icon className="size-4" />
      </button>
    </div>
  );
}

function BoundNativeSelect(
  props: Omit<
    React.ComponentProps<typeof Select>,
    "value" | "onChange" | "onBlur"
  >,
) {
  const field = useFieldContext<string>();
  const value = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <Select
      {...props}
      value={value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      aria-invalid={error ? true : undefined}
    />
  );
}

// The ui Field container with its invalid state wired, for layouts that lay
// out label, control, and message themselves:
//   <field.Field><FieldLabel/><field.Input/><field.Error/></field.Field>
function BoundField(props: React.ComponentProps<typeof Field>) {
  const error = useShownError();
  return <Field data-invalid={error ? true : undefined} {...props} />;
}

// The bare control, for an inline "remember me" toggle whose label and layout
// the caller writes itself. Give it an `id` and point a <label htmlFor> at it.
function BoundCheck(
  props: Omit<
    React.ComponentProps<typeof Checkbox>,
    "checked" | "onCheckedChange" | "onBlur"
  >,
) {
  const field = useFieldContext<boolean>();
  const checked = useStore(field.store, (s) => s.value);
  const error = useShownError();
  return (
    <Checkbox
      {...props}
      checked={checked}
      onCheckedChange={(next) => field.handleChange(next === true)}
      onBlur={field.handleBlur}
      aria-invalid={error ? true : undefined}
    />
  );
}

// The field's shown error, or nothing. For layouts that place the message
// themselves; the bound field components above already include it.
function BoundError({ className }: { className?: string }) {
  const error = useShownError();
  if (!error) return null;
  return <FieldError className={className}>{error}</FieldError>;
}

// The form-level error (from the form's own `validators`), shown after a
// submit attempt. Field errors live with their fields.
function FormErrorMessage({ className }: { className?: string }) {
  const form = useFormContext();
  const submitted = useStore(form.store, (s) => s.submissionAttempts > 0);
  const first = useStore(form.store, (s) => firstText(s.errors));
  if (!submitted || first === undefined) return null;
  return (
    <p role="alert" className={cn("text-destructive text-sm", className)}>
      {first}
    </p>
  );
}

// The <form> element. Owns submit wiring so no step repeats it.
function FormRoot({
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit" | "noValidate">) {
  const form = useFormContext();
  const ref = useRef<HTMLFormElement>(null);

  const submit = async () => {
    // handleSubmit skips validation when the form is already known to be
    // invalid, which would leave never-touched fields silently blank. Validate
    // everything first so one click surfaces every problem.
    await form.validateAllFields("submit");
    // A rejected onSubmit (typically a mutateAsync) reports through the
    // mutation's own error state; it must not become an unhandled rejection.
    try {
      await form.handleSubmit();
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    }
    if (form.state.isValid) return;
    // Errors render on the next frame; then move focus to the first one and
    // bring it on screen, which on a long form is where it usually isn't.
    requestAnimationFrame(() => focusFirstInvalid(ref.current));
  };

  return (
    <form
      {...props}
      ref={ref}
      // Browser bubbles (e.g. for type="email") would pre-empt our messages.
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void submit();
      }}
    >
      {children}
    </form>
  );
}

// Disabled only while submitting, never on validity: a disabled submit button
// also disables Enter-to-submit and gives no hint about what is wrong. While
// submitting it shows `busy`, or a spinner in front of its label.
function SubmitButton({
  children,
  busy,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: React.ReactNode }) {
  const form = useFormContext();
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  return (
    <Button type="submit" {...props} disabled={isSubmitting || disabled}>
      {isSubmitting
        ? (busy ?? (
            <>
              <Loader2 className="animate-spin" />
              {children}
            </>
          ))
        : children}
    </Button>
  );
}

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Text: BoundText,
    Money: BoundMoney,
    Date: BoundDate,
    Select: BoundSelect,
    Textarea: BoundTextarea,
    Checkbox: BoundCheckbox,
    Input: BoundInput,
    PasswordInput: BoundPasswordInput,
    NativeSelect: BoundNativeSelect,
    Check: BoundCheck,
    Field: BoundField,
    Error: BoundError,
  },
  formComponents: {
    Root: FormRoot,
    Submit: SubmitButton,
    Error: FormErrorMessage,
  },
});

// A key that changes on every opening of a dialog (and when `session` changes
// while open). Key the component that owns the form with it, so each opening
// mounts a fresh form seeded from the current props and a half-filled form
// never reopens. Stable while closing, so the exit animation plays over the
// old content rather than an empty dialog.
export function useOpeningKey(open: boolean, session = ""): string {
  const [state, setState] = useState({ open, session, gen: 0 });
  if (state.open !== open || (open && state.session !== session)) {
    setState({
      open,
      session: open ? session : state.session,
      gen: open ? state.gen + 1 : state.gen,
    });
  }
  return `${state.session}:${state.gen}`;
}

// The part of a form a shared shell (e.g. a dialog) needs in order to render
// the <form> and its submit button around caller-provided fields. Structural,
// so any `useAppForm` result fits regardless of its value type.
export interface FormShell {
  AppForm: React.ComponentType<React.PropsWithChildren>;
  Root: typeof FormRoot;
  Submit: typeof SubmitButton;
  Error: typeof FormErrorMessage;
}
