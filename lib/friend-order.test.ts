import { describe, expect, it } from "vitest";
import { moveId, sortByOrder } from "./friend-order";

const f = (id: string, name: string) => ({ id, name });
const friends = [f("a", "Zed"), f("b", "Amy"), f("c", "Bo")];

describe("sortByOrder", () => {
  it("uses the saved order, then names for friends without one", () => {
    const sorted = sortByOrder(friends, (x) => x.id, (x) => x.name, [{ friend_id: "a", position: 0 }]);
    expect(sorted.map((x) => x.id)).toEqual(["a", "b", "c"]); // Zed was placed first, then Amy, Bo by name
    const all = sortByOrder(friends, (x) => x.id, (x) => x.name, [{ friend_id: "c", position: 0 }, { friend_id: "a", position: 1 }, { friend_id: "b", position: 2 }]);
    expect(all.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
  it("sorts by name when nothing is saved", () => {
    expect(sortByOrder(friends, (x) => x.id, (x) => x.name, undefined).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});

describe("moveId", () => {
  it("moves a friend up or down one place", () => {
    expect(moveId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });
  it("stays put at the ends or for an unknown id", () => {
    expect(moveId(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveId(["a", "b"], "b", 1)).toEqual(["a", "b"]);
    expect(moveId(["a", "b"], "x", 1)).toEqual(["a", "b"]);
  });
});
