// Regression test for the `remote: null` bug: an explicit null must force the
// offline (local-only) path even when Firebase IS configured. Here `db` is
// mocked truthy and FirestoreStorage is a spy, so we can assert the cloud
// backend is never constructed/used when null is passed — and still IS used by
// default. See HybridStorage constructor.
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Submission, Walk } from "../types";
import type { LeaderboardEntry, Storage } from "./Storage";

vi.mock("../firebase", () => ({ db: { __fake: true }, auth: null, firebaseEnabled: true }));

const FirestoreStorageSpy = vi.fn();
vi.mock("./FirestoreStorage", () => ({
  FirestoreStorage: function (...args: unknown[]) {
    return FirestoreStorageSpy(...args);
  },
}));

import { HybridStorage } from "./HybridStorage";

function fakeLocal(): Storage {
  const walks = new Map<string, Walk>();
  return {
    listWalks: async () => [...walks.values()],
    getWalk: async (id) => walks.get(id) ?? null,
    saveWalk: async (w) => void walks.set(w.id, w),
    deleteWalk: async (id) => void walks.delete(id),
    saveSubmission: async (_s: Submission) => {},
    getLeaderboard: async (): Promise<LeaderboardEntry[]> => [],
  };
}

beforeEach(() => FirestoreStorageSpy.mockReset());

describe("HybridStorage remote: null (forced offline)", () => {
  test("explicit null never constructs the Firestore backend, even with db configured", async () => {
    const local = fakeLocal();
    const store = new HybridStorage({ local, remote: null, getUid: () => "u1" });

    // The cloud backend must not have been built despite db being truthy.
    expect(FirestoreStorageSpy).not.toHaveBeenCalled();

    // And behaviour stays local-only: a signed-in listWalks returns the local
    // list without attempting any owner query.
    await store.saveWalk({
      id: "w1",
      title: "T",
      status: "published",
      settings: { showQuestionText: true, printable: true, includeTiebreaker: false, showResults: true },
      questions: [],
      createdAt: 1,
    });
    expect(await store.listWalks()).toHaveLength(1);
  });

  test("omitting remote falls back to the default Firestore backend", () => {
    new HybridStorage({ local: fakeLocal(), getUid: () => null });
    expect(FirestoreStorageSpy).toHaveBeenCalledTimes(1);
    expect(FirestoreStorageSpy).toHaveBeenCalledWith({ __fake: true });
  });
});
