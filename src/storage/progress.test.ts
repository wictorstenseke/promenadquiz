import { beforeEach, describe, expect, it } from "vitest";
import { clearProgress, loadProgress, saveProgress } from "./progress";
import type { Progress } from "../types";

const p: Progress = {
  walkId: "w1",
  participantName: "Lag Kantarell",
  answers: { q1: "1", q2: "X" },
  tiebreakerAnswer: "42",
  currentIndex: 2,
  updatedAt: 0,
};

describe("progress autosave", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing saved", () => {
    expect(loadProgress("w1")).toBeNull();
  });

  it("saves and reloads in-progress answers", () => {
    saveProgress(p);
    const back = loadProgress("w1");
    expect(back?.participantName).toBe("Lag Kantarell");
    expect(back?.answers).toEqual({ q1: "1", q2: "X" });
    expect(back?.currentIndex).toBe(2);
    expect(back?.tiebreakerAnswer).toBe("42");
  });

  it("stamps updatedAt on save", () => {
    saveProgress(p);
    expect(loadProgress("w1")!.updatedAt).toBeGreaterThan(0);
  });

  it("scopes progress per walk", () => {
    saveProgress(p);
    expect(loadProgress("other")).toBeNull();
  });

  it("clears progress", () => {
    saveProgress(p);
    clearProgress("w1");
    expect(loadProgress("w1")).toBeNull();
  });
});
