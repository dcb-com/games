import { describe, expect, it } from "vitest";

import {
  formatPhone,
  formatPhoneInput,
  isE164,
  maskPhone,
  nationalDigits,
  phoneInputDigits,
  toE164,
} from "./phone.ts";

describe("toE164", () => {
  it("reads a US number however it is written", () => {
    for (const raw of [
      "4155550191",
      "(415) 555-0191",
      "(415)-555-0191",
      "415.555.0191",
      "+1 415 555 0191",
      "1-415-555-0191",
      "14155550191",
      "+14155550191",
      "  415 555 0191  ",
      "\u202a+1 (415) 555-0191\u202c",
    ]) {
      expect(toE164(raw)).toBe("+14155550191");
    }
  });

  it("keeps a number from abroad that carries its country code", () => {
    expect(toE164("+44 20 7946 0958")).toBe("+442079460958");
    expect(toE164("+447700900123")).toBe("+447700900123");
  });

  it("refuses what cannot be a number", () => {
    for (const raw of [
      "",
      "   ",
      "555-0191",
      "415555019",
      "24155550191",
      "0155550191",
      "1155550191",
      "+1 015 555 0191",
      "+0 123 4567",
      "+12345",
      "415-555-CALL",
      "415x5550191",
      "+1 415 555 0191 ext 2",
    ]) {
      expect(toE164(raw)).toBeNull();
    }
  });
});

describe("isE164", () => {
  it("is true only for a stored number", () => {
    expect(isE164("+14155550191")).toBe(true);
    expect(isE164("+447700900123")).toBe(true);
    expect(isE164("4155550191")).toBe(false);
    expect(isE164("+1 415 555 0191")).toBe(false);
    expect(isE164("+10155550191")).toBe(false);
    expect(isE164("+1415555019")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("shows a US number with +1 and the usual grouping", () => {
    expect(formatPhone("+14155550191")).toBe("+1 (415) 555-0191");
    expect(formatPhone("4155550191")).toBe("+1 (415) 555-0191");
    expect(formatPhone("1-415-555-0191")).toBe("+1 (415) 555-0191");
  });

  it("shows a number from abroad in E.164", () => {
    expect(formatPhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("leaves anything else as it was", () => {
    expect(formatPhone("+1 (***) ***-0191")).toBe("+1 (***) ***-0191");
    expect(formatPhone("Unknown number")).toBe("Unknown number");
    expect(formatPhone("")).toBe("");
  });
});

describe("formatPhoneInput", () => {
  it("groups the digits as they are typed", () => {
    expect(formatPhoneInput("")).toBe("");
    expect(formatPhoneInput("4")).toBe("(4");
    expect(formatPhoneInput("415")).toBe("(415");
    expect(formatPhoneInput("4155")).toBe("(415) 5");
    expect(formatPhoneInput("415555")).toBe("(415) 555");
    expect(formatPhoneInput("4155550")).toBe("(415) 555-0");
    expect(formatPhoneInput("4155550191")).toBe("(415) 555-0191");
  });

  it("drops anything but digits, a pasted +1, and anything past ten", () => {
    expect(formatPhoneInput("(415) 555-01919")).toBe("(415) 555-0191");
    expect(formatPhoneInput("(415) ")).toBe("(415");
    expect(formatPhoneInput("+1 (415) 555-0191")).toBe("(415) 555-0191");
    expect(formatPhoneInput("1")).toBe("(1");
  });
});

describe("phoneInputDigits", () => {
  it("keeps the ten digits a US field holds", () => {
    expect(phoneInputDigits("14155550191")).toBe("4155550191");
    expect(phoneInputDigits("(415) 555-0191")).toBe("4155550191");
    expect(phoneInputDigits("415555019123")).toBe("4155550191");
  });
});

describe("nationalDigits", () => {
  it("gives the ten digits after +1", () => {
    expect(nationalDigits("+14155550191")).toBe("4155550191");
    expect(nationalDigits("+447700900123")).toBe("447700900123");
  });
});

describe("maskPhone", () => {
  it("keeps the last four digits", () => {
    expect(maskPhone("+14155550191")).toBe("+1 (***) ***-0191");
  });
});
