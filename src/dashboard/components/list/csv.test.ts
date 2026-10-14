import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

interface Row {
  name: string;
  amount: number | null;
}

describe("toCsv", () => {
  it("writes a header row followed by one row per record", () => {
    const rows: Row[] = [
      { name: "Jane Doe", amount: 100 },
      { name: "John Smith", amount: 200 },
    ];
    const csv = toCsv(rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Amount", value: (r) => r.amount },
    ]);
    expect(csv).toBe(
      ["Name,Amount", "Jane Doe,100", "John Smith,200"].join("\r\n"),
    );
  });

  it("prints null as an empty cell", () => {
    const csv = toCsv<Row>(
      [{ name: "Jane Doe", amount: null }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Amount", value: (r) => r.amount },
      ],
    );
    expect(csv).toBe(["Name,Amount", "Jane Doe,"].join("\r\n"));
  });

  it("quotes a field carrying a comma and doubles embedded quotes (RFC 4180)", () => {
    const csv = toCsv(
      [{ name: 'Doe, "Jane"', amount: 1 }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Amount", value: (r) => r.amount },
      ],
    );
    expect(csv).toBe(["Name,Amount", '"Doe, ""Jane""",1'].join("\r\n"));
  });

  it("quotes a field carrying a line break", () => {
    const csv = toCsv(
      [{ name: "Jane\nDoe", amount: 1 }],
      [{ header: "Name", value: (r) => r.name }],
    );
    expect(csv).toBe(["Name", '"Jane\nDoe"'].join("\r\n"));
  });

  it("prints numbers as plain numbers, not localized strings", () => {
    const csv = toCsv(
      [{ name: "Jane Doe", amount: 1234567 }],
      [{ header: "Amount", value: (r) => r.amount }],
    );
    expect(csv).toBe(["Amount", "1234567"].join("\r\n"));
  });

  it("writes only the header for an empty list", () => {
    const csv = toCsv<Row>([], [{ header: "Name", value: (r) => r.name }]);
    expect(csv).toBe("Name");
  });
});
