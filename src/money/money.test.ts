import { describe, expect, it } from "vitest";

import { Money, MoneyFormatError } from "./money.ts";
import type { MoneyRefusal } from "./money.ts";

const c = (n: number) => Money.fromCents(n);

const MAX_SAFE = Number.MAX_SAFE_INTEGER; // about $90 trillion
const MAX_DOLLAR_NUMBER = 1e15 - 1; // just under $10 trillion

// The known bad cases: dollar amounts whose float times 100 is not a whole
// number, so a conversion that cuts instead of rounding loses a cent.
// 19.99 once converted badly. Plus zero, negatives and the edges of the range.
const BAD_CASES = [
  1999,
  29,
  57,
  58,
  113,
  114,
  115,
  157,
  435,
  820,
  30,
  0,
  1,
  -1,
  -1999,
  -435,
  100_000_000,
  MAX_DOLLAR_NUMBER,
  -MAX_DOLLAR_NUMBER,
];

// Expects `run` to throw a MoneyFormatError for this reason.
function refused(run: () => void, reason: MoneyRefusal): MoneyFormatError {
  try {
    run();
  } catch (e) {
    expect(e).toBeInstanceOf(MoneyFormatError);
    if (!(e instanceof MoneyFormatError)) throw e;
    expect(e.reason).toBe(reason);
    return e;
  }
  throw new Error("expected a MoneyFormatError, and nothing was thrown");
}

describe("the float traps", () => {
  const TRAPS = [19.99, 0.29, 0.57, 0.58, 1.13, 1.14, 1.15, 1.57, 4.35, 8.2];

  it("really are traps", () => {
    // Times 100, cut: a cent less. (1.57 survives this one.)
    for (const dollars of TRAPS.filter((d) => d !== 1.57)) {
      expect(Math.trunc(dollars * 100)).toBe(Math.round(dollars * 100) - 1);
    }
    // Dollars plus cents / 100, as the app's amount screen used to build
    // it: 1 + 0.57 is 1.5699999999999998.
    expect(1 + 57 / 100).not.toBe(1.57);
  });

  it.each(TRAPS)("%s reads as its cent, as a number and as text", (dollars) => {
    const cents = Math.round(dollars * 100);
    expect(Money.fromDollarNumber(dollars).toCents()).toBe(cents);
    expect(Money.fromDollarNumber(-dollars).toCents()).toBe(-cents);
    const text = dollars.toFixed(2);
    expect(Money.fromDollarString(text).toCents()).toBe(cents);
    expect(Money.parseInput(text).toCents()).toBe(cents);
  });

  it("0.1 + 0.2 is 30 cents: float noise within a millionth of a cent", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(Money.fromDollarNumber(0.1 + 0.2).toCents()).toBe(30);
    expect(Money.fromDollarNumber(1.1 * 3).toCents()).toBe(330);
  });

  it("adding cents does not drift where adding dollars does", () => {
    const money = Money.sum(TRAPS.map((d) => Money.fromDollarNumber(d)));
    expect(money.toCents()).toBe(3897);
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(Money.sum([c(10), c(20)]).equals(c(30))).toBe(true);
  });
});

describe("every way out comes back the same, for the bad cases", () => {
  it.each(BAD_CASES)("%s cents", (cents) => {
    const m = c(cents);
    expect(Money.fromCents(m.toCents()).equals(m)).toBe(true);
    expect(Money.fromDollarString(m.toDollarString()).equals(m)).toBe(true);
    expect(Money.fromDollarNumber(m.toDollarNumber()).equals(m)).toBe(true);
    // Through JSON, as a vendor receives it.
    const wire = JSON.parse(JSON.stringify(m.toDollarNumber())) as number;
    expect(Money.fromDollarNumber(wire).equals(m)).toBe(true);
    // The JSON is the dollar string less its trailing zeros.
    expect(JSON.stringify(m.toDollarNumber())).toBe(
      m
        .toDollarString()
        .replace(/\.00$/, "")
        .replace(/(\.\d)0$/, "$1"),
    );
    if (cents >= 0) {
      expect(Money.parseInput(m.toDollarString()).equals(m)).toBe(true);
    }
  });
});

describe("Money.fromCents", () => {
  it.each([
    { input: 1999, cents: 1999 },
    { input: -5, cents: -5 },
    { input: 0, cents: 0 },
    { input: -0, cents: 0 },
    { input: MAX_SAFE, cents: MAX_SAFE },
    { input: -MAX_SAFE, cents: -MAX_SAFE },
  ])("accepts $input", ({ input, cents }) => {
    expect(Object.is(Money.fromCents(input).toCents(), cents)).toBe(true);
  });

  it.each([
    1.5,
    0.1 + 0.2,
    19.99,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    MAX_SAFE + 1,
  ])("refuses %s", (input) => {
    refused(() => Money.fromCents(input), "not-whole-cents");
  });
});

describe("Money.fromDollarNumber", () => {
  it.each([
    { input: 0, cents: 0 },
    { input: -0, cents: 0 },
    { input: 19.99, cents: 1999 },
    { input: -19.98, cents: -1998 },
    { input: 25, cents: 2500 },
    { input: 0.1 + 0.2, cents: 30 },
    { input: 9_999_999_999_999.99, cents: MAX_DOLLAR_NUMBER },
  ])("accepts $input", ({ input, cents }) => {
    expect(Money.fromDollarNumber(input).toCents()).toBe(cents);
  });

  it.each<{ input: number; reason: MoneyRefusal }>([
    { input: Number.NaN, reason: "not-finite" },
    { input: Number.POSITIVE_INFINITY, reason: "not-finite" },
    { input: 19.999, reason: "fraction-of-a-cent" },
    { input: 19.995, reason: "fraction-of-a-cent" },
    { input: 1.005, reason: "fraction-of-a-cent" },
    { input: 0.001, reason: "fraction-of-a-cent" },
    { input: -0.005, reason: "fraction-of-a-cent" },
    { input: 12.345, reason: "fraction-of-a-cent" },
    { input: 1e13, reason: "too-large" },
  ])("refuses $input ($reason), naming the field and the value", (t) => {
    const error = refused(
      () => Money.fromDollarNumber(t.input, { field: "bank transfer_amount" }),
      t.reason,
    );
    expect(error.kind).toBe("dollar-number");
    expect(error.field).toBe("bank transfer_amount");
    expect(error.received).toBe(String(t.input));
    expect(error.message).toContain(String(t.input));
  });

  it("holds a field to its declared decimals", () => {
    expect(Money.fromDollarNumber(25, { maxDecimals: 0 }).toCents()).toBe(2500);
    refused(
      () => Money.fromDollarNumber(19.99, { maxDecimals: 0 }),
      "too-many-decimals",
    );
    expect(Money.fromDollarNumber(19.9, { maxDecimals: 1 }).toCents()).toBe(
      1990,
    );
    refused(
      () => Money.fromDollarNumber(19.99, { maxDecimals: 1 }),
      "too-many-decimals",
    );
  });
});

describe("Money.fromDollarString", () => {
  it.each([
    { input: "0.00", cents: 0 },
    { input: "-0.00", cents: 0 },
    { input: "19.99", cents: 1999 },
    { input: "1234.56", cents: 123456 },
    { input: "-42.07", cents: -4207 },
    // the bank's card balance comes as a string like these.
    { input: "479.78", cents: 47978 },
    { input: "90071992547409.91", cents: MAX_SAFE },
  ])("accepts $input", ({ input, cents }) => {
    expect(Money.fromDollarString(input).toCents()).toBe(cents);
  });

  it.each<{ input: string; reason: MoneyRefusal; why: string }>([
    { input: " 19.99", reason: "bad-format", why: "a leading space" },
    { input: "19.99 ", reason: "bad-format", why: "a trailing space" },
    { input: "+19.99", reason: "bad-format", why: "a plus sign" },
    { input: "1,234.56", reason: "bad-format", why: "a comma" },
    { input: "$19.99", reason: "bad-format", why: "a dollar sign" },
    { input: "1e3", reason: "bad-format", why: "an exponent" },
    { input: "1.00e3", reason: "bad-format", why: "an exponent" },
    { input: "01.00", reason: "bad-format", why: "a leading zero" },
    { input: "00.50", reason: "bad-format", why: "a leading zero" },
    { input: ".50", reason: "bad-format", why: "no whole part" },
    { input: "5.", reason: "bad-format", why: "a point with no decimals" },
    { input: "5", reason: "bad-format", why: "no decimals" },
    { input: "5.5", reason: "bad-format", why: "one decimal" },
    { input: "19.999", reason: "too-many-decimals", why: "three decimals" },
    { input: "0.005", reason: "too-many-decimals", why: "three decimals" },
    { input: "١٩.٩٩", reason: "bad-format", why: "Arabic-Indic digits" },
    { input: "１９.９９", reason: "bad-format", why: "full-width digits" },
    { input: "", reason: "bad-format", why: "nothing" },
    { input: "-", reason: "bad-format", why: "a lone minus" },
    { input: "--1.00", reason: "bad-format", why: "two minuses" },
    { input: "NaN", reason: "bad-format", why: "not a number" },
    { input: "Infinity", reason: "bad-format", why: "not a number" },
    { input: "0x10.00", reason: "bad-format", why: "hex" },
    {
      input: "90071992547409.92",
      reason: "too-large",
      why: "past the safe limit",
    },
  ])("refuses $input: $why", ({ input, reason }) => {
    const error = refused(
      () => Money.fromDollarString(input, { field: "bank balance" }),
      reason,
    );
    expect(error.received).toBe(JSON.stringify(input));
    expect(error.field).toBe("bank balance");
  });

  it('takes "5" and "5.5" only when the field declares "0-2"', () => {
    const loose = { decimals: "0-2" } as const;
    expect(Money.fromDollarString("5", loose).toCents()).toBe(500);
    expect(Money.fromDollarString("5.5", loose).toCents()).toBe(550);
    expect(Money.fromDollarString("5.50", loose).toCents()).toBe(550);
    refused(() => Money.fromDollarString("5.", loose), "bad-format");
    refused(() => Money.fromDollarString("05", loose), "bad-format");
    refused(() => Money.fromDollarString("5.555", loose), "too-many-decimals");
  });
});

describe("Money.parseInput", () => {
  it.each([
    { input: "0", cents: 0 },
    { input: "12", cents: 1200 },
    { input: "12.5", cents: 1250 },
    { input: "0.5", cents: 50 },
    { input: "19.99", cents: 1999 },
    { input: "1234567.89", cents: 123456789 },
  ])("accepts $input", ({ input, cents }) => {
    expect(Money.parseInput(input).toCents()).toBe(cents);
  });

  it.each<{ input: string; reason: MoneyRefusal; why: string }>([
    { input: " 12", reason: "bad-format", why: "a space: the caller trims" },
    { input: "12 ", reason: "bad-format", why: "a space: the caller trims" },
    { input: "$12", reason: "bad-format", why: "a dollar sign" },
    { input: "1,234", reason: "bad-format", why: "a comma" },
    { input: "+12", reason: "bad-format", why: "a plus sign" },
    { input: "1e3", reason: "bad-format", why: "an exponent" },
    { input: "012", reason: "bad-format", why: "a leading zero" },
    { input: ".5", reason: "bad-format", why: "no whole part" },
    { input: "12.", reason: "bad-format", why: "a point with no decimals" },
    { input: "12.345", reason: "too-many-decimals", why: "three decimals" },
    { input: "١٢", reason: "bad-format", why: "Arabic-Indic digits" },
    { input: "", reason: "bad-format", why: "nothing" },
    { input: "-3.10", reason: "negative", why: "a negative, not allowed" },
    {
      input: "99999999999999999999",
      reason: "too-large",
      why: "past the safe limit",
    },
  ])("refuses $input: $why", ({ input, reason }) => {
    const error = refused(() => Money.parseInput(input), reason);
    expect(error.kind).toBe("input");
  });

  it("takes a negative only when the call allows it", () => {
    expect(Money.parseInput("-3.10", { allowNegative: true }).toCents()).toBe(
      -310,
    );
  });
});

describe("toDollarNumber", () => {
  it("writes the exact decimal in JSON", () => {
    expect(JSON.stringify({ amount: c(1999).toDollarNumber() })).toBe(
      '{"amount":19.99}',
    );
    expect(JSON.stringify(c(MAX_DOLLAR_NUMBER).toDollarNumber())).toBe(
      "9999999999999.99",
    );
  });

  it("refuses an amount a double can't carry exactly", () => {
    expect(() => c(MAX_DOLLAR_NUMBER + 1).toDollarNumber()).toThrow(RangeError);
  });

  it("is its cents in JSON", () => {
    expect(JSON.stringify({ m: c(1999) })).toBe('{"m":1999}');
  });
});

describe("format", () => {
  it.each([
    { cents: 0, text: "$0.00" },
    { cents: 5, text: "$0.05" },
    { cents: 1999, text: "$19.99" },
    { cents: 123456789, text: "$1,234,567.89" },
    { cents: MAX_DOLLAR_NUMBER, text: "$9,999,999,999,999.99" },
    { cents: -1250, text: "-$12.50" },
  ])("$cents → $text", ({ cents, text }) => {
    expect(c(cents).format()).toBe(text);
  });

  it("shows signs on request", () => {
    expect(c(1250).format({ signDisplay: "always" })).toBe("+$12.50");
    expect(c(-1250).format({ signDisplay: "never" })).toBe("$12.50");
    expect(c(0).format({ signDisplay: "exceptZero" })).toBe("$0.00");
  });
});

describe("arithmetic", () => {
  it("adds, subtracts and negates in whole cents", () => {
    expect(c(157).add(c(43)).toCents()).toBe(200);
    expect(c(157).subtract(c(200)).toCents()).toBe(-43);
    expect(c(157).negate().toCents()).toBe(-157);
    expect(Object.is(c(0).negate().toCents(), 0)).toBe(true);
    expect(c(-157).abs().toCents()).toBe(157);
  });

  it("sums a list, and an empty list is zero", () => {
    expect(Money.sum([c(10), c(20), c(-5)]).toCents()).toBe(25);
    expect(Money.sum([]).isZero()).toBe(true);
  });

  it("refuses to leave the safe range", () => {
    expect(() => c(MAX_SAFE).add(c(1))).toThrow(RangeError);
    expect(() => c(-MAX_SAFE).subtract(c(1))).toThrow(RangeError);
    expect(() => Money.sum([c(MAX_SAFE), c(1)])).toThrow(RangeError);
  });

  it("compares", () => {
    expect(c(5).compare(c(7))).toBeLessThan(0);
    expect(c(5).greaterThan(c(4))).toBe(true);
    expect(c(5).lessThan(c(4))).toBe(false);
    expect(c(-5).sign()).toBe(-1);
    expect(c(0).sign()).toBe(0);
    expect(c(0).isZero()).toBe(true);
    expect(c(-1).isNegative()).toBe(true);
    expect(c(1).isPositive()).toBe(true);
    expect(Money.max(c(1), c(2)).toCents()).toBe(2);
    expect(Money.min(c(1), c(2)).toCents()).toBe(1);
    const sorted = [c(3), c(1), c(2)].sort((a, b) => a.compare(b));
    expect(sorted.map((m) => m.toCents())).toEqual([1, 2, 3]);
  });
});

// Moved from payroll's money.test.ts with the function.
describe("allocate", () => {
  const split = (total: number, weights: number[]) =>
    c(total)
      .allocate(weights)
      .map((m) => m.toCents());

  // Employer taxes apportioned across three paylines by gross cents; the third is zero-gross.
  const GROSS = [30500, 12200, 0];
  it.each([
    { total: 2647, expected: [1891, 756, 0] },
    { total: 619, expected: [442, 177, 0] },
    { total: 257, expected: [184, 73, 0] },
    { total: 1153, expected: [824, 329, 0] },
  ])("$total across [30500, 12200, 0] → $expected", ({ total, expected }) => {
    expect(split(total, GROSS)).toEqual(expected);
  });

  it("sums exactly to the total for every amount over a fixed weighting", () => {
    for (let total = 0; total <= 3000; total++) {
      const shares = split(total, GROSS);
      expect(shares.reduce((s, v) => s + v, 0)).toBe(total);
      expect(shares[2]).toBe(0);
    }
  });

  it("is stable under adversarial remainders (n rows of equal weight)", () => {
    expect(split(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(split(101, [1, 1, 1])).toEqual([34, 34, 33]);
    expect(split(1, [5, 5, 5, 5, 5, 5, 5])).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });

  it("gives zero-weight rows nothing, however small the total", () => {
    expect(split(1, [0, 1, 0])).toEqual([0, 1, 0]);
    expect(split(3, [0, 0, 100, 0])).toEqual([0, 0, 3, 0]);
  });

  it("spreads equally when every weight is zero", () => {
    expect(split(10, [0, 0, 0])).toEqual([4, 3, 3]);
    expect(split(0, [0, 0])).toEqual([0, 0]);
  });

  it("handles single-weight and zero-total cases", () => {
    expect(split(1234, [999])).toEqual([1234]);
    expect(split(0, [30500, 12200, 0])).toEqual([0, 0, 0]);
    expect(split(0, [])).toEqual([]);
  });

  it("splits a credit the same way as the charge it reverses", () => {
    const charge = split(2647, GROSS);
    const credit = split(-2647, GROSS);
    expect(credit).toEqual(charge.map((v) => (v === 0 ? 0 : -v)));
  });

  it("stays exact at magnitudes that overflow double-precision products", () => {
    const shares = split(9_999_999_999, [9_999_999_999, 1]);
    expect(shares.reduce((s, v) => s + v, 0)).toBe(9_999_999_999);
    expect(shares[1]).toBe(1);
  });

  it("rejects inputs that cannot be apportioned", () => {
    expect(() => split(100, [-1, 2])).toThrow();
    expect(() => split(100, [1.5, 2])).toThrow();
    expect(() => split(100, [])).toThrow();
  });
});
