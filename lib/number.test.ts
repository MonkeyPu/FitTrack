import { describe, expect, it } from "vitest";
import { normalizeDecimal, parseDecimal } from "./number";

describe("parseDecimal", () => {
  it("accepts a comma or a dot as the decimal point", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(parseDecimal("0,25")).toBe(0.25);
    expect(parseDecimal(",5")).toBe(0.5);
    expect(parseDecimal("5,")).toBe(5);
    expect(parseDecimal(" 7,5 ")).toBe(7.5);
  });
  it("treats the last mark as the decimal point when both are typed", () => {
    expect(parseDecimal("1.234,5")).toBe(1234.5);
    expect(parseDecimal("1,234.5")).toBe(1234.5);
  });
  it("keeps whole numbers, blanks and text working like Number()", () => {
    expect(parseDecimal("250")).toBe(250);
    expect(parseDecimal("")).toBe(0);
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("1,2x")).toBeNaN();
    expect(parseDecimal("-")).toBeNaN();
  });
  it("normalizes to a dot", () => {
    expect(normalizeDecimal("3,14")).toBe("3.14");
    expect(normalizeDecimal("42")).toBe("42");
  });
});
