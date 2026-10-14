// One way to hold money in DCB: whole US cents in an immutable `Money`.
// Every crossing into or out of our code goes through one named function
// here, named for the kind of value on the other side: whole cents, a
// dollar number, a dollar string, what a person typed, or what we show.
// Each vendor field picks the one that matches its format; the list of
// which field is which lives at the vendor's client.
//
// Every constructor is strict. Anything ambiguous throws a MoneyFormatError
// that says why; nothing is rounded to fit or guessed at.
//
// The wire and the database carry plain integer cents (`amountCents`). A
// class does not survive JSON, so code wraps the number with
// `Money.fromCents` where it adds, compares or crosses a boundary, and
// unwraps it with `.toCents()`.

/** Which constructor refused a value. */
export type MoneyKind = "cents" | "dollar-number" | "dollar-string" | "input";

/** Why it was refused. */
export type MoneyRefusal =
  /** fromCents: not a whole number, or past the safe-integer limit. */
  | "not-whole-cents"
  /** fromDollarNumber: NaN or Infinity. */
  | "not-finite"
  /** fromDollarNumber: not within a millionth of a cent of a whole cent. */
  | "fraction-of-a-cent"
  /** A string that does not match the declared pattern. */
  | "bad-format"
  /** More decimals than the call declared. */
  | "too-many-decimals"
  /** A negative amount where the call did not allow one. */
  | "negative"
  /** Too large to carry exactly. */
  | "too-large";

/**
 * A value that is not money in the form the call expected. It carries what
 * came in and why it was refused, so the log shows the exact value a vendor
 * or a person sent. `field` says where it came from ("bank
 * transfer_amount").
 */
export class MoneyFormatError extends Error {
  readonly kind: MoneyKind;
  readonly reason: MoneyRefusal;
  readonly field: string | undefined;
  readonly received: string;

  constructor(
    kind: MoneyKind,
    reason: MoneyRefusal,
    received: number | string,
    field?: string,
  ) {
    const shown = describe(received);
    super(
      `Refused ${kind}${field ? ` for ${field}` : ""} (${reason}): ${shown}`,
    );
    this.name = "MoneyFormatError";
    this.kind = kind;
    this.reason = reason;
    this.field = field;
    this.received = shown;
  }
}

function describe(value: number | string): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (Object.is(value, -0)) return "-0";
  // String() is the shortest text that reads back as the same double, so
  // it is what the vendor's JSON most likely said.
  return String(value);
}

/** How many decimals a dollar string must have. */
export type DollarStringDecimals = 2 | "0-2";

export interface DollarStringOptions {
  /** 2 (the default): exactly two, "5.00". "0-2": "5", "5.5" or "5.50",
   * for a field declared to send that shape. */
  decimals?: DollarStringDecimals;
  /** Where the value came from, for the error and the log. */
  field?: string;
}

export interface DollarNumberOptions {
  /** The most decimals the field may carry: 2 (the default), or fewer for
   * a field declared as whole dollars (0) or dimes (1). */
  maxDecimals?: 0 | 1 | 2;
  field?: string;
}

export interface InputOptions {
  /** Negatives are refused unless the call asks for them. */
  allowNegative?: boolean;
}

// Exactly two decimals, no leading zeros, an optional minus. ASCII digits
// only: \d with no `u` flag matches 0-9 and nothing else.
const DOLLAR_STRING_2 = /^(-)?(0|[1-9]\d*)\.(\d{2})$/;
// The same with zero, one or two decimals: "5", "5.5", "5.50".
const DOLLAR_STRING_0_2 = /^(-)?(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
// What a person types: digits, then an optional point and one or two
// decimals. No "$", no commas, no spaces: none of our screens produce them.
const INPUT = /^(-)?(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

// A dollar number within this much of a whole cent, measured in cents, is
// that cent: 0.30000000000000004 is 30 cents. 19.999 is a tenth of a cent
// away and is refused.
const CENT_EPSILON = 1e-6;

// Below this many cents, cents / 100 is exact enough to print and read back
// as the same decimal: it has at most 15 significant digits, and a double
// tells all of those apart. That is just under $10 trillion.
const DOLLAR_NUMBER_LIMIT = 1e15;

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** How the sign shows in `format`. The values are Intl's `signDisplay`. */
export interface FormatOptions {
  /** "auto" (the default) shows a minus on negatives only. "always" shows
   * a plus or a minus, "exceptZero" does too but not on zero, and "never"
   * shows the size alone. */
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
}

export class Money {
  readonly #cents: number;

  private constructor(cents: number) {
    // -0 and 0 are the same amount.
    this.#cents = cents === 0 ? 0 : cents;
  }

  static readonly zero: Money = new Money(0);

  // ---- in ----

  /** Whole cents, as the database and our API carry them. A safe integer
   * only; -0 is 0. */
  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new MoneyFormatError("cents", "not-whole-cents", cents);
    }
    return new Money(cents);
  }

  /**
   * Dollars as a JSON number: 19.99. Rounded to the nearest cent, never
   * cut, and only when it is already a whole cent give or take float noise
   * (a millionth of a cent). 19.999 is refused.
   */
  static fromDollarNumber(
    dollars: number,
    options: DollarNumberOptions = {},
  ): Money {
    const refuse = (reason: MoneyRefusal) =>
      new MoneyFormatError("dollar-number", reason, dollars, options.field);
    if (!Number.isFinite(dollars)) throw refuse("not-finite");
    // 19.99 * 100 is 1998.9999999999998 and must be 1999.
    const scaled = dollars * 100;
    const cents = Math.round(scaled);
    if (Math.abs(cents) >= DOLLAR_NUMBER_LIMIT) throw refuse("too-large");
    // Either within a millionth of a cent, or exactly the double nearest a
    // whole cent, which is the test that holds at large amounts where the
    // product itself carries more float error than a millionth.
    if (Math.abs(scaled - cents) >= CENT_EPSILON && cents / 100 !== dollars) {
      throw refuse("fraction-of-a-cent");
    }
    const step = 10 ** (2 - (options.maxDecimals ?? 2));
    if (cents % step !== 0) throw refuse("too-many-decimals");
    return new Money(cents);
  }

  /**
   * Dollars as text: "1234.56", "-0.05". Exactly two decimals unless the
   * call declares "0-2". No spaces, "+", "$", commas, exponents, leading
   * zeros or non-ASCII digits. More decimals is refused, never rounded: it
   * means the value is a rate, not money.
   */
  static fromDollarString(
    text: string,
    options: DollarStringOptions = {},
  ): Money {
    const decimals = options.decimals ?? 2;
    const pattern = decimals === 2 ? DOLLAR_STRING_2 : DOLLAR_STRING_0_2;
    const match = pattern.exec(text);
    if (!match) {
      throw new MoneyFormatError(
        "dollar-string",
        tooManyDecimals(text) ? "too-many-decimals" : "bad-format",
        text,
        options.field,
      );
    }
    const [, minus, whole = "0", fraction = ""] = match;
    return fromParts(
      minus,
      whole,
      fraction,
      "dollar-string",
      text,
      options.field,
    );
  }

  /**
   * What a person typed: "19.99", "12", "0.5". Digits, then an optional
   * point with one or two decimals. No "$", commas or spaces; the caller
   * trims. Negatives only when the call allows them. A limit such as the
   * transfer limit is the schema's job (moneyCents in ./zod.ts).
   */
  static parseInput(text: string, options: InputOptions = {}): Money {
    const match = INPUT.exec(text);
    if (!match) {
      throw new MoneyFormatError(
        "input",
        tooManyDecimals(text) ? "too-many-decimals" : "bad-format",
        text,
      );
    }
    const [, minus, whole = "0", fraction = ""] = match;
    if (minus && !options.allowNegative) {
      throw new MoneyFormatError("input", "negative", text);
    }
    return fromParts(minus, whole, fraction, "input", text);
  }

  /** The sum of a list. An empty list is zero. */
  static sum(list: Iterable<Money>): Money {
    let total = 0;
    for (const m of list) total = safe(total + m.#cents);
    return new Money(total);
  }

  /** The larger of two amounts. */
  static max(a: Money, b: Money): Money {
    return a.#cents >= b.#cents ? a : b;
  }

  /** The smaller of two amounts. */
  static min(a: Money, b: Money): Money {
    return a.#cents <= b.#cents ? a : b;
  }

  // ---- out ----

  /** Whole cents, for the database and our API. */
  toCents(): number {
    return this.#cents;
  }

  /**
   * Dollars as a number, for a JSON field that takes one. JSON writes it
   * as the exact decimal ("19.99"). The receiver can still lose a cent if
   * it converts badly; see.
   */
  toDollarNumber(): number {
    return exactDollars(this.#cents);
  }

  /** Dollars as text, always two places: "1234.56", "-0.05". For files,
   * logs and fields that take a dollar string. */
  toDollarString(): string {
    const magnitude = Math.abs(this.#cents);
    const fraction = String(magnitude % 100).padStart(2, "0");
    const whole = String(Math.trunc(magnitude / 100));
    return `${this.#cents < 0 ? "-" : ""}${whole}.${fraction}`;
  }

  /** For people: "$1,234.56", "-$0.05". Through Intl. */
  format(options: FormatOptions = {}): string {
    const formatter =
      options.signDisplay && options.signDisplay !== "auto"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            signDisplay: options.signDisplay,
          })
        : USD;
    // Intl rounds the dollar number to two places, which lands back on the
    // exact amount for anything below about $10 trillion.
    return formatter.format(exactDollars(this.#cents));
  }

  /** For logs and debugging: the dollar string. */
  toString(): string {
    return this.toDollarString();
  }

  /** In JSON a Money is its cents, the same as on our wire. */
  toJSON(): number {
    return this.#cents;
  }

  // ---- arithmetic ----

  add(other: Money): Money {
    return new Money(safe(this.#cents + other.#cents));
  }

  subtract(other: Money): Money {
    return new Money(safe(this.#cents - other.#cents));
  }

  negate(): Money {
    return new Money(-this.#cents);
  }

  abs(): Money {
    return this.#cents < 0 ? this.negate() : this;
  }

  /**
   * Splits this amount by whole-number weights so the parts add up to it
   * exactly (the largest-remainder method). Each part gets the floor of
   * its share, and the cents left over go to the largest remainders, ties
   * to the earlier row. A zero weight gets nothing; when every weight is
   * zero the amount splits equally. A credit splits like the charge it
   * reverses.
   */
  allocate(weights: readonly number[]): Money[] {
    return allocateCents(this.#cents, weights).map((c) => new Money(c));
  }

  // ---- comparison ----

  isZero(): boolean {
    return this.#cents === 0;
  }

  isNegative(): boolean {
    return this.#cents < 0;
  }

  isPositive(): boolean {
    return this.#cents > 0;
  }

  /** -1, 0 or 1. */
  sign(): -1 | 0 | 1 {
    return this.#cents < 0 ? -1 : this.#cents > 0 ? 1 : 0;
  }

  /** Negative, zero or positive, for `sort`. */
  compare(other: Money): number {
    return this.#cents - other.#cents;
  }

  equals(other: Money): boolean {
    return this.#cents === other.#cents;
  }

  greaterThan(other: Money): boolean {
    return this.#cents > other.#cents;
  }

  lessThan(other: Money): boolean {
    return this.#cents < other.#cents;
  }
}

// ---- internals ----

function exactDollars(cents: number): number {
  if (Math.abs(cents) >= DOLLAR_NUMBER_LIMIT) {
    throw new RangeError(`Too large for a dollar number: ${cents} cents`);
  }
  // The one division by 100: the double nearest the exact decimal.
  return cents / 100;
}

function safe(n: number): number {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Money out of range: ${n} cents`);
  }
  return n;
}

// Tells "too many decimals" apart from any other bad shape, for the error.
function tooManyDecimals(text: string): boolean {
  return /^-?\d+\.\d{3,}$/.test(text);
}

// Integer math end to end: the text never becomes a float.
function fromParts(
  minus: string | undefined,
  whole: string,
  fraction: string,
  kind: MoneyKind,
  received: string,
  field?: string,
): Money {
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyFormatError(kind, "too-large", received, field);
  }
  return Money.fromCents(minus ? -cents : cents);
}

// Largest-remainder method. BigInt for the products: cents times a weight
// overflows a double long before it overflows a real payroll amount.
function allocateCents(
  totalCents: number,
  weights: readonly number[],
): number[] {
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) {
      throw new RangeError(`Weights must be whole numbers 0 or more, got ${w}`);
    }
  }
  if (weights.length === 0) {
    if (totalCents !== 0) {
      throw new RangeError(`Cannot split ${totalCents} cents across no rows`);
    }
    return [];
  }

  const effective = weights.some((w) => w > 0) ? weights : weights.map(() => 1);
  const divisor = effective.reduce((s, w) => s + BigInt(w), 0n);

  // The sign is set aside: floor() on a negative share would bias every
  // row, and a credit must split like the charge it reverses.
  const negative = totalCents < 0;
  const total = BigInt(Math.abs(totalCents));

  const shares = new Array<number>(weights.length).fill(0);
  const remainders: { index: number; remainder: bigint }[] = [];
  let distributed = 0n;
  effective.forEach((weight, index) => {
    const product = total * BigInt(weight);
    const base = product / divisor;
    shares[index] = Number(base);
    distributed += base;
    if (weight > 0) remainders.push({ index, remainder: product % divisor });
  });

  let leftover = Number(total - distributed);
  remainders.sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const { index } of remainders) {
    if (leftover <= 0) break;
    shares[index] = (shares[index] ?? 0) + 1;
    leftover -= 1;
  }

  const signed = negative ? shares.map((s) => -s) : shares;
  const sum = signed.reduce((s, v) => s + v, 0);
  if (sum !== totalCents) {
    throw new Error(`Allocation lost cents: ${sum} != ${totalCents}`);
  }
  return signed;
}
