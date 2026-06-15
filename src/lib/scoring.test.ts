import { describe, expect, it } from "vitest";
import { scoreWalk } from "./scoring";
import type { OptionKey, Question } from "../types";

const q = (id: string, correct: OptionKey): Question => ({
  id,
  stationNumber: 1,
  text: "",
  options: { "1": "a", X: "b", "2": "c" },
  correct,
});

const walk = { questions: [q("a", "1"), q("b", "X"), q("c", "2")] };

describe("scoreWalk", () => {
  it("all correct", () => {
    expect(scoreWalk(walk, { a: "1", b: "X", c: "2" })).toEqual({
      score: 3,
      total: 3,
    });
  });

  it("all wrong", () => {
    expect(scoreWalk(walk, { a: "2", b: "1", c: "X" })).toEqual({
      score: 0,
      total: 3,
    });
  });

  it("mixed", () => {
    expect(scoreWalk(walk, { a: "1", b: "1", c: "2" })).toEqual({
      score: 2,
      total: 3,
    });
  });

  it("empty answers score zero but keep total", () => {
    expect(scoreWalk(walk, {})).toEqual({ score: 0, total: 3 });
  });

  it("ignores answers for unknown questions", () => {
    expect(scoreWalk(walk, { a: "1", zzz: "1" } as Record<string, OptionKey>)).toEqual({
      score: 1,
      total: 3,
    });
  });

  it("empty walk has total zero", () => {
    expect(scoreWalk({ questions: [] }, {})).toEqual({ score: 0, total: 0 });
  });
});
