import { describe, expect, it } from "vitest";
import { hasPendingChanges, liveContent, walkContent } from "./walk";
import type { Walk } from "../types";

function baseWalk(): Walk {
  return {
    id: "abc123",
    title: "Skogspromenaden",
    status: "draft",
    settings: { showQuestionText: true, printable: true, includeTiebreaker: false, showResults: true },
    questions: [
      {
        id: "q1",
        stationNumber: 1,
        text: "Vad heter trädet?",
        options: { "1": "Ek", X: "Björk", "2": "Tall" },
        correct: "X",
      },
    ],
    createdAt: 1,
  };
}

function publish(walk: Walk): Walk {
  return { ...walk, status: "published", publishedSnapshot: walkContent(walk) };
}

describe("liveContent", () => {
  it("returns the draft when never published", () => {
    expect(liveContent(baseWalk()).title).toBe("Skogspromenaden");
  });

  it("returns the snapshot, not the draft, once published", () => {
    const live = publish(baseWalk());
    const edited: Walk = { ...live, title: "Nytt namn" };
    expect(liveContent(edited).title).toBe("Skogspromenaden");
  });
});

describe("hasPendingChanges", () => {
  it("is false for a draft", () => {
    expect(hasPendingChanges(baseWalk())).toBe(false);
  });

  it("is false right after publishing (clean)", () => {
    expect(hasPendingChanges(publish(baseWalk()))).toBe(false);
  });

  it("is true when the draft diverges from the snapshot", () => {
    const live = publish(baseWalk());
    const edited: Walk = { ...live, title: "Ändrad titel" };
    expect(hasPendingChanges(edited)).toBe(true);
  });

  it("is false again after re-publishing the edit", () => {
    const live = publish(baseWalk());
    const edited: Walk = { ...live, title: "Ändrad titel" };
    const republished = { ...edited, publishedSnapshot: walkContent(edited) };
    expect(hasPendingChanges(republished)).toBe(false);
  });

  it("detects a changed correct answer", () => {
    const live = publish(baseWalk());
    const edited: Walk = {
      ...live,
      questions: [{ ...live.questions[0], correct: "1" }],
    };
    expect(hasPendingChanges(edited)).toBe(true);
  });
});
