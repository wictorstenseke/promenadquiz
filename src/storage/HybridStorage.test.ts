import { beforeEach, describe, expect, it, vi } from "vitest";

// Force the Firebase singletons to null so that omitting `remote` (or passing
// `remote: null`) deterministically yields a remote-less HybridStorage,
// independent of any real .env config. (`deps.remote ?? (db ? ... : null)`
// only collapses to null when `db` is null.)
vi.mock("../firebase", () => ({ db: null, auth: null, firebaseEnabled: false }));

import { HybridStorage, mergeWalks } from "./HybridStorage";
import { LocalStorageStorage } from "./LocalStorageStorage";
import type { LeaderboardEntry, RemoteStorage } from "./Storage";
import type { Submission, Walk } from "../types";

function makeWalk(id: string, over: Partial<Walk> = {}): Walk {
  return {
    id,
    title: `Walk ${id}`,
    status: "draft",
    createdAt: 1,
    settings: { showQuestionText: true, printable: true, includeTiebreaker: true, showResults: true },
    questions: [],
    ...over,
  };
}

/** In-memory RemoteStorage stub. */
class FakeRemote implements RemoteStorage {
  walks = new Map<string, Walk>();
  async listWalks() { return [] as Walk[]; }
  async listWalksByOwner(uid: string) {
    return [...this.walks.values()].filter((w) => w.ownerId === uid);
  }
  async getWalk(id: string) { return this.walks.get(id) ?? null; }
  async saveWalk(w: Walk) { this.walks.set(w.id, w); }
  async deleteWalk(id: string) { this.walks.delete(id); }
  async saveSubmission(_s: Submission) {}
  async getLeaderboard(_id: string) { return []; }
}

describe("mergeWalks", () => {
  it("dedupes by id, newer updatedAt wins, newest createdAt first", () => {
    const local = [makeWalk("a", { createdAt: 1, updatedAt: 10 }), makeWalk("b", { createdAt: 3 })];
    const cloud = [makeWalk("a", { createdAt: 1, updatedAt: 20, title: "Cloud A" })];
    const merged = mergeWalks(local, cloud);
    expect(merged.map((w) => w.id)).toEqual(["b", "a"]);
    expect(merged.find((w) => w.id === "a")?.title).toBe("Cloud A");
  });

  it("treats missing updatedAt as 0", () => {
    const local = [makeWalk("a", { updatedAt: 5 })];
    const cloud = [makeWalk("a", { title: "No stamp" })]; // updatedAt undefined -> 0
    expect(mergeWalks(local, cloud)[0].title).toBe("Walk a");
  });
});

describe("HybridStorage signed out", () => {
  let local: LocalStorageStorage;
  let remote: FakeRemote;
  let store: HybridStorage;
  beforeEach(() => {
    localStorage.clear();
    local = new LocalStorageStorage();
    remote = new FakeRemote();
    store = new HybridStorage({ local, remote, getUid: () => null });
  });

  it("listWalks returns local only", async () => {
    await local.saveWalk(makeWalk("a"));
    expect((await store.listWalks()).map((w) => w.id)).toEqual(["a"]);
  });

  it("saveWalk does not stamp ownerId and mirrors only when published", async () => {
    await store.saveWalk(makeWalk("draft", { status: "draft" }));
    await store.saveWalk(makeWalk("pub", { status: "published" }));
    expect((await store.getWalk("draft"))?.ownerId).toBeUndefined();
    expect(await remote.getWalk("draft")).toBeNull();
    expect(await remote.getWalk("pub")).not.toBeNull();
  });

  it("saveWalk stamps updatedAt and always writes local (even for drafts)", async () => {
    await store.saveWalk(makeWalk("draft", { status: "draft" }));
    const localCopy = await local.getWalk("draft");
    expect(localCopy).not.toBeNull();
    expect(localCopy?.updatedAt).toBeGreaterThan(0);
  });

  it("listWalks does not query the owner's cloud walks when signed out", async () => {
    const spy = vi.spyOn(remote, "listWalksByOwner");
    await local.saveWalk(makeWalk("a"));
    await store.listWalks();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("HybridStorage saveWalk ownerId preservation (signed in)", () => {
  beforeEach(() => localStorage.clear());

  it("preserves an existing ownerId instead of overwriting with the current uid", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });
    await store.saveWalk(makeWalk("a", { ownerId: "original-owner" }));
    expect((await local.getWalk("a"))?.ownerId).toBe("original-owner");
    expect((await remote.getWalk("a"))?.ownerId).toBe("original-owner");
  });
});

describe("HybridStorage remote write failure", () => {
  beforeEach(() => localStorage.clear());

  it("swallows a remote saveWalk failure (warns, does not reject) and keeps the local copy", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    remote.saveWalk = vi.fn().mockRejectedValue(new Error("offline"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });

    await expect(store.saveWalk(makeWalk("a"))).resolves.toBeUndefined();
    expect(await local.getWalk("a")).not.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("HybridStorage getWalk routing", () => {
  beforeEach(() => localStorage.clear());

  it("returns the local hit without touching remote", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    const spy = vi.spyOn(remote, "getWalk");
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });
    await local.saveWalk(makeWalk("a"));
    expect((await store.getWalk("a"))?.id).toBe("a");
    expect(spy).not.toHaveBeenCalled();
  });

  it("falls back to remote when local misses", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });
    await remote.saveWalk(makeWalk("cloud"));
    expect((await store.getWalk("cloud"))?.id).toBe("cloud");
  });

  it("returns null when both layers miss", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });
    expect(await store.getWalk("nope")).toBeNull();
  });

  it("returns null on a local miss when there is no remote", async () => {
    const local = new LocalStorageStorage();
    const store = new HybridStorage({ local, remote: null, getUid: () => null });
    expect(await store.getWalk("nope")).toBeNull();
  });
});

describe("HybridStorage listWalks edge cases", () => {
  beforeEach(() => localStorage.clear());

  it("returns local only when there is no remote (even if signed in)", async () => {
    const local = new LocalStorageStorage();
    const store = new HybridStorage({ local, remote: null, getUid: () => "u1" });
    await local.saveWalk(makeWalk("a"));
    expect((await store.listWalks()).map((w) => w.id)).toEqual(["a"]);
  });

  it("falls back to local when the remote query throws (list not blanked)", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    remote.listWalksByOwner = vi.fn().mockRejectedValue(new Error("offline"));
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });
    await local.saveWalk(makeWalk("a", { ownerId: "u1" }));
    expect((await store.listWalks()).map((w) => w.id)).toEqual(["a"]);
  });
});

describe("HybridStorage adoptLocalWalks", () => {
  beforeEach(() => localStorage.clear());

  it("leaves already-owned walks untouched and writes claimed ones to both layers", async () => {
    const local = new LocalStorageStorage();
    const remote = new FakeRemote();
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });
    await local.saveWalk(makeWalk("orphan"));
    await local.saveWalk(makeWalk("owned", { ownerId: "u2", updatedAt: 9 }));

    await store.adoptLocalWalks("u1");

    expect((await local.getWalk("orphan"))?.ownerId).toBe("u1");
    expect((await remote.getWalk("orphan"))?.ownerId).toBe("u1");
    // already-owned: not re-stamped, not pushed to remote
    expect((await local.getWalk("owned"))?.ownerId).toBe("u2");
    expect(await remote.getWalk("owned")).toBeNull();
  });

  it("is a no-op when there is no remote", async () => {
    const local = new LocalStorageStorage();
    const store = new HybridStorage({ local, remote: null, getUid: () => null });
    await local.saveWalk(makeWalk("orphan"));
    await store.adoptLocalWalks("u1");
    // unowned local walk is untouched (no remote to push to)
    expect((await local.getWalk("orphan"))?.ownerId).toBeUndefined();
  });
});

describe("HybridStorage submission + leaderboard routing", () => {
  beforeEach(() => localStorage.clear());

  function makeSubmission(walkId: string): Submission {
    return { id: "s1", walkId, participantName: "Tester", answers: {}, score: 0, total: 0, finishedAt: 1 };
  }

  it("routes saveSubmission and getLeaderboard to remote when present", async () => {
    const local = new LocalStorageStorage();
    const localSave = vi.spyOn(local, "saveSubmission");
    const localBoard = vi.spyOn(local, "getLeaderboard");
    const remote = new FakeRemote();
    const board: LeaderboardEntry[] = [{ submission: makeSubmission("w1"), rank: 1 }];
    remote.saveSubmission = vi.fn().mockResolvedValue(undefined);
    remote.getLeaderboard = vi.fn().mockResolvedValue(board);
    const store = new HybridStorage({ local, remote, getUid: () => "u1" });

    await store.saveSubmission(makeSubmission("w1"));
    expect(remote.saveSubmission).toHaveBeenCalledTimes(1);
    expect(localSave).not.toHaveBeenCalled();

    expect(await store.getLeaderboard("w1")).toEqual(board);
    expect(remote.getLeaderboard).toHaveBeenCalledWith("w1");
    expect(localBoard).not.toHaveBeenCalled();
  });

  it("routes saveSubmission and getLeaderboard to local when there is no remote", async () => {
    const local = new LocalStorageStorage();
    const localSave = vi.spyOn(local, "saveSubmission");
    const localBoard = vi.spyOn(local, "getLeaderboard");
    const store = new HybridStorage({ local, remote: null, getUid: () => null });

    await store.saveSubmission(makeSubmission("w1"));
    expect(localSave).toHaveBeenCalledTimes(1);

    await store.getLeaderboard("w1");
    expect(localBoard).toHaveBeenCalledWith("w1");
  });
});

describe("HybridStorage signed in", () => {
  let local: LocalStorageStorage;
  let remote: FakeRemote;
  let store: HybridStorage;
  beforeEach(() => {
    localStorage.clear();
    local = new LocalStorageStorage();
    remote = new FakeRemote();
    store = new HybridStorage({ local, remote, getUid: () => "u1" });
  });

  it("saveWalk stamps ownerId + updatedAt and writes both layers", async () => {
    await store.saveWalk(makeWalk("a", { status: "draft" }));
    const localCopy = await local.getWalk("a");
    const cloudCopy = await remote.getWalk("a");
    expect(localCopy?.ownerId).toBe("u1");
    expect(localCopy?.updatedAt).toBeGreaterThan(0);
    expect(cloudCopy?.ownerId).toBe("u1"); // drafts now sync
  });

  it("listWalks merges local + this owner's cloud walks", async () => {
    await local.saveWalk(makeWalk("local-only", { ownerId: "u1", updatedAt: 1 }));
    await remote.saveWalk(makeWalk("cloud-only", { ownerId: "u1", updatedAt: 1 }));
    await remote.saveWalk(makeWalk("other", { ownerId: "u2", updatedAt: 1 }));
    const ids = (await store.listWalks()).map((w) => w.id).sort();
    expect(ids).toEqual(["cloud-only", "local-only"]);
  });

  it("adoptLocalWalks claims unowned local walks and is idempotent", async () => {
    await local.saveWalk(makeWalk("orphan")); // no ownerId
    await local.saveWalk(makeWalk("owned", { ownerId: "u1", updatedAt: 9 }));
    await store.adoptLocalWalks("u1");
    expect((await remote.getWalk("orphan"))?.ownerId).toBe("u1");
    const ownedBefore = await remote.getWalk("owned");
    await store.adoptLocalWalks("u1"); // again
    expect(await remote.getWalk("owned")).toEqual(ownedBefore); // unchanged
  });
});
