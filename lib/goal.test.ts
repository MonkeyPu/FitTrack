import { describe, expect, it } from "vitest";
import { goalDeficit, netBar } from "./calc";

describe("netBar", () => {
  it("fills right from zero toward the target", () => {
    const b = netBar(850, 1700);
    expect(b.left).toBe(30);
    expect(b.width).toBeCloseTo(35, 5);
  });
  it("fills left when exercise is bigger than food, down to the floor", () => {
    expect(netBar(-250, 1700).width).toBeCloseTo(15, 5);
    expect(netBar(-250, 1700).left).toBeCloseTo(15, 5);
    expect(netBar(-900, 1700).left).toBe(0);
  });
  it("caps at the end of the bar and handles no target", () => {
    expect(netBar(3000, 1700).width).toBeCloseTo(70, 5);
    expect(netBar(500, null).width).toBe(0);
  });
});

describe("goalDeficit", () => {
  const days = [
    { date: "2026-10-15", food: 2000, exercise: 200 },
    { date: "2026-10-16", food: 2200, exercise: 0 },
    { date: "2026-10-17", food: 0, exercise: 300 }, // nothing eaten logged: skipped
    { date: "2026-10-19", food: 500, exercise: 0 }, // today: skipped
  ];
  it("sums finished days that have food logged", () => {
    const g = goalDeficit(days, { maintenance: 2500, netTarget: 2000 }, "2026-10-19");
    expect(g.loggedDays).toBe(2);
    expect(g.food).toBe(4200);
    expect(g.exercise).toBe(200);
    expect(g.net).toBe(4000);
    expect(g.deficit).toBe(1000); // 2 x 2500 - 4000
    expect(g.targetDeficit).toBe(1000); // 2 x (2500 - 2000)
  });
  it("shows a surplus as negative and needs maintenance", () => {
    expect(goalDeficit(days, { maintenance: 1500, netTarget: 1400 }, "2026-10-19").deficit).toBe(-1000);
    expect(goalDeficit(days, { maintenance: null, netTarget: 1400 }, "2026-10-19").deficit).toBeNull();
  });
});
