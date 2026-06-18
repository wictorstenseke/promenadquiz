import { beforeEach, describe, expect, it } from "vitest";
import { HybridStorage, mergeWalks } from "./HybridStorage";
import { LocalStorageStorage } from "./LocalStorageStorage";
import type { RemoteStorage } from "./Storage";
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
