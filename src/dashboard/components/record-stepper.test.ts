import { describe, expect, it } from "vitest";

import {
  findRecordById,
  stepperBounds,
} from "~/dashboard/components/record-stepper";

const records = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe("stepperBounds", () => {
  it("has no previous at the first record", () => {
    const { position, previous, next } = stepperBounds(records, 1);
    expect(position).toBe(0);
    expect(previous).toBeUndefined();
    expect(next).toEqual({ id: 2 });
  });

  it("has both neighbours in the middle", () => {
    const { position, previous, next } = stepperBounds(records, 2);
    expect(position).toBe(1);
    expect(previous).toEqual({ id: 1 });
    expect(next).toEqual({ id: 3 });
  });

  it("has no next at the last record", () => {
    const { position, previous, next } = stepperBounds(records, 3);
    expect(position).toBe(2);
    expect(previous).toEqual({ id: 2 });
    expect(next).toBeUndefined();
  });

  it("reports position -1 and no neighbours when the id is not in the list", () => {
    const { position, previous, next } = stepperBounds(records, 99);
    expect(position).toBe(-1);
    expect(previous).toBeUndefined();
    expect(next).toBeUndefined();
  });

  it("reports position -1 for a null or missing id", () => {
    expect(stepperBounds(records, null).position).toBe(-1);
    expect(stepperBounds(records, undefined).position).toBe(-1);
  });

  it("has no neighbours in a single-record list", () => {
    const { position, previous, next } = stepperBounds([{ id: 1 }], 1);
    expect(position).toBe(0);
    expect(previous).toBeUndefined();
    expect(next).toBeUndefined();
  });
});

describe("findRecordById", () => {
  const named = [
    { id: 1, name: "Adams, Carlos" },
    { id: 2, name: "Anderson, Jamie" },
    { id: 3, name: "Clark, James" },
  ];

  it("finds the record whose id matches the select's string value", () => {
    expect(findRecordById(named, "2")).toEqual({
      id: 2,
      name: "Anderson, Jamie",
    });
  });

  it("returns undefined when no record matches", () => {
    expect(findRecordById(named, "99")).toBeUndefined();
  });
});
