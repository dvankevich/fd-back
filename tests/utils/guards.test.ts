import { describe, it, expect } from "vitest";
import { isBoolean, isDefined, isNonEmptyString, isNumber, isRecord, isString } from "../../src/utils/guards.ts";

describe("guards", () => {
  it.each([
    ["", true],
    ["abc", true],
    [5, false],
    [null, false],
    [undefined, false],
  ])("isString(%j) is %j", (value, expected) => {
    expect(isString(value)).toBe(expected);
  });

  it.each([
    ["abc", true],
    ["", false],
    [5, false],
    [undefined, false],
  ])("isNonEmptyString(%j) is %j", (value, expected) => {
    expect(isNonEmptyString(value)).toBe(expected);
  });

  it.each([
    [0, true],
    [-1.5, true],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    ["5", false],
    [null, false],
  ])("isNumber(%j) is %j", (value, expected) => {
    expect(isNumber(value)).toBe(expected);
  });

  it.each([
    [true, true],
    [false, true],
    ["true", false],
    [0, false],
  ])("isBoolean(%j) is %j", (value, expected) => {
    expect(isBoolean(value)).toBe(expected);
  });

  it.each([
    [{}, true],
    [{ a: 1 }, true],
    [[], false],
    [null, false],
    ["x", false],
  ])("isRecord(%j) is %j", (value, expected) => {
    expect(isRecord(value)).toBe(expected);
  });

  it("should keep only defined values when filtering", () => {
    expect([1, null, 2, undefined, 0].filter(isDefined)).toEqual([1, 2, 0]);
  });
});
