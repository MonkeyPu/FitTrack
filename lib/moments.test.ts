import { describe, expect, it } from "vitest";
import { buildMoments, type MomentInput } from "./moments";

const base: MomentInput = {
  date: "2026-10-15", today: "2026-10-15", hour: 14, food: 1500, maxFood: 2000, protein: 40, proteinGoal: 120,
  yesterday: null, goalDate: null, goalText: null,
};
const ids = (o: Partial<MomentInput>) => buildMoments({ ...base, ...o }).map((m) => m.id);

describe("buildMoments", () => {
  it("shows nothing on a normal day", () => expect(ids({})).toEqual([]));
  it("shows the chud screen only when strictly over the limit", () => {
    expect(ids({ food: 2000 })).toEqual([]);
    expect(buildMoments({ ...base, food: 2320 })[0]).toMatchObject({ kind: "over", title: "chud", sub: "320 kcal over your limit" });
  });
  it("celebrates hitting the protein goal", () => {
    expect(ids({ protein: 120 })).toEqual(["protein:2026-10-15"]);
    expect(ids({ protein: 119 })).toEqual([]);
  });
  it("celebrates yesterday only if something was logged and the limit held", () => {
    expect(ids({ yesterday: { date: "2026-10-14", food: 1900, maxFood: 2000, logged: true } })).toEqual(["within:2026-10-14"]);
    expect(ids({ yesterday: { date: "2026-10-14", food: 0, maxFood: 2000, logged: false } })).toEqual([]);
    expect(ids({ yesterday: { date: "2026-10-14", food: 2100, maxFood: 2000, logged: true } })).toEqual([]);
  });
  it("counts today as a win from 9pm if still within the limit", () => {
    expect(ids({ hour: 20 })).toEqual([]);
    expect(ids({ hour: 21 })).toEqual(["within:2026-10-15"]);
    expect(ids({ hour: 22, food: 0 })).toEqual([]);
    expect(ids({ hour: 22, food: 2500 })).toEqual(["over:2026-10-15"]);
  });
  it("celebrates reaching the goal date", () => {
    expect(ids({ goalDate: "2026-10-15" })).toEqual(["goal:2026-10-15"]);
    expect(ids({ goalDate: "2026-12-01" })).toEqual([]);
  });
  it("never shows moments for other days", () => {
    expect(ids({ date: "2026-10-10", food: 5000, protein: 500 })).toEqual([]);
  });
  it("does nothing without targets", () => {
    expect(ids({ maxFood: null, proteinGoal: 0, food: 9999, hour: 23 })).toEqual([]);
  });
  it("puts the chud screen first", () => {
    expect(ids({ food: 2300, protein: 130 })).toEqual(["over:2026-10-15", "protein:2026-10-15"]);
  });
});
