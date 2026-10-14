import { FieldApi, FormApi } from "@tanstack/react-form";
import { describe, expect, it, vi } from "vitest";

import {
  digits,
  email,
  minLength,
  nonNegative,
  pattern,
  positive,
  required,
  rules,
  ssn,
} from "~/dashboard/components/form/rules";

describe("rules", () => {
  it("returns undefined when no rule is active", () => {
    expect(rules()).toBeUndefined();
    expect(rules(false, null, undefined)).toBeUndefined();
  });

  it("reports the first failing rule and skips falsy entries", () => {
    const v = rules(false, required("Email"), email);
    expect(v?.onChange({ value: "" })).toBe("Email is required");
    expect(v?.onChange({ value: "nope" })).toBe("Enter a valid email address");
    expect(v?.onChange({ value: "a@b.co" })).toBeUndefined();
  });

  it("supports a custom required message and format rules", () => {
    expect(required("Code", "Enter the code.")("")).toBe("Enter the code.");
    expect(minLength(8, "short")("1234567")).toBe("short");
    expect(minLength(8, "short")("12345678")).toBeUndefined();
    expect(digits(10, "ten")("(555) 555-0100")).toBeUndefined();
    expect(digits(10, "ten")("555")).toBe("ten");
    expect(pattern(/^[a-z]+$/, "letters")("abc")).toBeUndefined();
    expect(pattern(/^[a-z]+$/, "letters")("ab1")).toBe("letters");
    expect(nonNegative("neg")("-1")).toBe("neg");
    expect(nonNegative("neg")("0")).toBeUndefined();
    expect(nonNegative("neg")("abc")).toBe("neg");
  });

  it("treats empty as valid for non-required rules", () => {
    expect(email("")).toBeUndefined();
    expect(ssn("")).toBeUndefined();
    expect(positive("bad")("  ")).toBeUndefined();
    expect(minLength(8, "short")("")).toBeUndefined();
    expect(digits(6, "six")("")).toBeUndefined();
    expect(pattern(/x/, "p")("")).toBeUndefined();
    expect(nonNegative("neg")("")).toBeUndefined();
    expect(positive("bad")("0")).toBe("bad");
    expect(ssn("123-45-678")).toBe("Enter a valid 9-digit SSN");
    expect(ssn("666-45-6789")).toBe("This isn’t a valid SSN");
  });
});

// The reason the rules run on change: a stale error must clear the moment the
// value is valid, without the user leaving the field.
describe("change-triggered validation", () => {
  function setup() {
    const onSubmit = vi.fn();
    const form = new FormApi({
      defaultValues: { name: "" },
      onSubmit: ({ value }) => {
        onSubmit(value);
      },
    });
    form.mount();
    const field = new FieldApi({
      form,
      name: "name",
      validators: rules(required("Name")),
    });
    field.mount();
    return { form, field, onSubmit };
  }

  it("clears the error and unlocks submit as soon as the value is valid", () => {
    const { form, field } = setup();
    field.handleChange("x");
    field.handleChange("");
    expect(field.state.meta.errors).toEqual(["Name is required"]);
    expect(form.state.canSubmit).toBe(false);

    field.handleChange("Ada");
    expect(field.state.meta.errors).toEqual([]);
    expect(form.state.canSubmit).toBe(true);
  });

  it("surfaces untouched required fields on submit, then submits once fixed", async () => {
    const { form, field, onSubmit } = setup();
    await form.handleSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.state.submissionAttempts).toBe(1);
    expect(field.state.meta.errors).toEqual(["Name is required"]);

    field.handleChange("Ada");
    await form.handleSubmit();
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada" });
  });
});
