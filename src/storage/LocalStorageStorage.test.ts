import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageStorage } from "./LocalStorageStorage";
import type { Storage } from "./Storage";
import type { Submission, Walk } from "../types";

// Contract tests — written against the Storage interface so the exact same
// suite can be re-run against a future FirebaseStorage implementation.
function makeWalk(id: string, createdAt: number): Walk {
  return {
    id,
    title: `Walk ${id}`,
    status: "draft",
    settings: { showQuestionText: true, printable: true, includeTiebreaker: true, showResults: true },
    questions: [],
    createdAt,
  };
}

function makeSub(
  id: string,
  walkId: string,
  score: number,
  finishedAt: number,
): Submission {
  return {
    id,
    walkId,
    participantName: id,
    answers: {},
    score,
    total: 10,
    finishedAt,
  };
}

describe("Storage contract (localStorage impl)", () => {
  let store: Storage;

  beforeEach(() => {
    localStorage.clear();
    store = new LocalStorageStorage();
  });

  it("saves and gets a walk", async () => {
    const w = makeWalk("aaa", 1);
    await store.saveWalk(w);
    expect(await store.getWalk("aaa")).toEqual(w);
  });

  it("returns null for missing walk", async () => {
    expect(await store.getWalk("nope")).toBeNull();
  });

  it("saveWalk upserts", async () => {
    await store.saveWalk(makeWalk("a", 1));
    await store.saveWalk({ ...makeWalk("a", 1), title: "Renamed" });
    expect((await store.getWalk("a"))?.title).toBe("Renamed");
    expect(await store.listWalks()).toHaveLength(1);
  });

  it("lists walks newest first", async () => {
    await store.saveWalk(makeWalk("old", 1));
    await store.saveWalk(makeWalk("new", 2));
    expect((await store.listWalks()).map((w) => w.id)).toEqual(["new", "old"]);
  });

  it("deletes a walk and its submissions", async () => {
    await store.saveWalk(makeWalk("a", 1));
    await store.saveSubmission(makeSub("s1", "a", 5, 1));
    await store.deleteWalk("a");
    expect(await store.getWalk("a")).toBeNull();
    expect(await store.getLeaderboard("a")).toEqual([]);
  });

  it("leaderboard sorts by score desc then earliest finish", async () => {
    await store.saveSubmission(makeSub("low", "w", 3, 100));
    await store.saveSubmission(makeSub("late", "w", 8, 200));
    await store.saveSubmission(makeSub("early", "w", 8, 150));
    const board = await store.getLeaderboard("w");
    expect(board.map((e) => e.submission.id)).toEqual(["early", "late", "low"]);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3]);
  });
});
