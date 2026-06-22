import { describe, expect, test } from "vitest";
import { newQuestion, newWalk } from "./factory";

describe("newQuestion", () => {
  test("has empty text and blank options", () => {
    const q = newQuestion(3);
    expect(q.text).toBe("");
    expect(q.options).toEqual({ "1": "", X: "", "2": "" });
  });

  test("starts with no correct answer", () => {
    expect(newQuestion(3).correct).toBeNull();
  });

  test("uses the given station number", () => {
    expect(newQuestion(7).stationNumber).toBe(7);
  });

  test("has a non-empty id", () => {
    expect(newQuestion(1).id).toBeTruthy();
    expect(typeof newQuestion(1).id).toBe("string");
  });
});

describe("newWalk", () => {
  test("is a draft with empty title", () => {
    const w = newWalk();
    expect(w.status).toBe("draft");
    expect(w.title).toBe("");
  });

  test("has all default settings enabled", () => {
    expect(newWalk().settings).toEqual({
      showQuestionText: true,
      printable: true,
      includeTiebreaker: true,
      showResults: true,
    });
  });

  test("starts with exactly one question numbered 1", () => {
    const w = newWalk();
    expect(w.questions).toHaveLength(1);
    expect(w.questions[0].stationNumber).toBe(1);
  });

  test("has an id", () => {
    expect(newWalk().id).toBeTruthy();
    expect(typeof newWalk().id).toBe("string");
  });

  test("has a numeric createdAt timestamp", () => {
    expect(typeof newWalk().createdAt).toBe("number");
  });
});
