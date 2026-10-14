import { cn } from "@dcb/ui";
import { Checkbox } from "@dcb/ui/checkbox";
import { DatePicker } from "@dcb/ui/date-picker";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@dcb/ui/field";
import { Input } from "@dcb/ui/input";
import { Select } from "@dcb/ui/select";

import {
  cleanMoney,
  formatMoney,
  normalizeMoney,
} from "~/dashboard/components/form/format";

// Plain controlled inputs with the shared label / description / error layout.
// They know nothing about form state; form.tsx binds them to TanStack fields,
// and hand-rolled forms (finalize) drive them with useState directly.

export interface Option {
  value: string;
  label: string;
}

function OptionalTag({ optional }: { optional?: boolean }) {
  if (!optional) return null;
  return <span className="text-muted-foreground font-normal"> (optional)</span>;
}

export function TextField({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  optional,
  description,
  placeholder,
  inputMode,
  maxLength,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  optional?: boolean;
  description?: string;
  placeholder?: string;
  inputMode?: React.ComponentProps<typeof Input>["inputMode"];
  maxLength?: number;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        <OptionalTag optional={optional} />
      </FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

// Stores a clean numeric string in form state, so callers keep parsing it with Number().
export function MoneyField({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  optional,
  description,
  placeholder,
  suffix,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  optional?: boolean;
  description?: string;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        <OptionalTag optional={optional} />
      </FieldLabel>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          $
        </span>
        <Input
          id={name}
          name={name}
          inputMode="decimal"
          className={cn("pl-8", suffix && "pr-32")}
          placeholder={placeholder}
          value={formatMoney(value)}
          onBlur={() => {
            onChange(normalizeMoney(value));
            onBlur?.();
          }}
          onChange={(e) => onChange(cleanMoney(e.target.value))}
          aria-invalid={error ? true : undefined}
        />
        {suffix && (
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

export function DateField({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  optional,
  description,
  placeholder,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  optional?: boolean;
  description?: string;
  placeholder?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        <OptionalTag optional={optional} />
      </FieldLabel>
      <DatePicker
        id={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        invalid={!!error}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

export function SelectField({
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  error,
  optional,
  description,
  placeholder,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Option[];
  error?: string;
  optional?: boolean;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        <OptionalTag optional={optional} />
      </FieldLabel>
      <Select
        id={name}
        name={name}
        className="w-full"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
      >
        <option value="">
          {disabled
            ? (placeholder ?? "None available")
            : (placeholder ?? "Select…")}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

export function CheckboxField({
  name,
  label,
  checked,
  onChange,
  description,
  error,
  disabled,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  error?: string;
  disabled?: boolean;
}) {
  const descriptionId = `${name}-description`;
  const errorId = `${name}-error`;
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Field
      orientation="horizontal"
      className="items-start"
      data-invalid={error ? true : undefined}
    >
      {/* aria-invalid is also what focusFirstInvalid looks for, so a refused
          submit lands on an unticked declaration like any other field. */}
      <Checkbox
        id={name}
        name={name}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next === true)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      <FieldContent>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        {description && (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        )}
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </FieldContent>
    </Field>
  );
}

export function TextareaField({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  optional,
  description,
  placeholder,
  maxLength,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  optional?: boolean;
  description?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        <OptionalTag optional={optional} />
      </FieldLabel>
      <textarea
        id={name}
        name={name}
        rows={3}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        className="border-input bg-secondary text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-ring/20 aria-invalid:border-destructive w-full rounded-lg border px-4 py-2 text-sm outline-none focus-visible:ring-4"
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
