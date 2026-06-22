import { describe, expect, test } from "vitest";
import { cleanJoinUrl, playUrl } from "./shareUrl";

describe("cleanJoinUrl", () => {
  test("joins host + base and strips scheme and trailing slash", () => {
    expect(cleanJoinUrl("wictorstenseke.github.io", "/promenadquiz/")).toBe(
      "wictorstenseke.github.io/promenadquiz",
    );
  });

  test("collapses a bare root base to just the host", () => {
    expect(cleanJoinUrl("localhost:3000", "/")).toBe("localhost:3000");
  });
});

describe("playUrl", () => {
  test("builds a hash play link ending in the walk id", () => {
    expect(playUrl("abc123")).toContain("#/p/abc123");
  });
});
