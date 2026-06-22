/**
 * Emulator-backed integration tests for FirestoreStorage.
 *
 * Exercises the real Firestore client against the emulator (no rules involved
 * here — that's firestore-rules.emulator.test.ts). Each test uses unique ids so
 * the shared emulator instance needs no per-test clearing.
 *
 * Run with: npm run test:integration  (boots the Firestore emulator).
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  setDoc,
  terminate,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { Submission, Walk } from "../types";
import { FirestoreStorage } from "./FirestoreStorage";

let app: FirebaseApp;
let db: Firestore;
let storage: FirestoreStorage;
let env: RulesTestEnvironment;

beforeAll(async () => {
  const [host, port] = (
    process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"
  ).split(":");
  app = initializeApp({ projectId: "demo-test" });
  db = getFirestore(app);
  connectFirestoreEmulator(db, host, Number(port));
  storage = new FirestoreStorage(db);

  // Owned (ownerId-stamped) walks can't be written by this unauthenticated
  // client — firestore.rules only lets the matching signed-in owner do that,
  // and no Auth emulator is booted. We seed those via a rules-disabled admin
  // context, then read them back through the adapter (reads are open to all).
  env = await initializeTestEnvironment({
    projectId: "demo-test",
    firestore: { host, port: Number(port) },
  });
});

afterAll(async () => {
  await terminate(db);
  await deleteApp(app);
  await env.cleanup();
});

async function seedWalk(walk: Walk): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "walks", walk.id), walk);
  });
}

function makeWalk(id: string, overrides: Partial<Walk> = {}): Walk {
  return {
    id,
    title: `Walk ${id}`,
    status: "published",
    createdAt: 1000,
    settings: {
      showQuestionText: true,
      printable: false,
      includeTiebreaker: true,
      showResults: true,
    },
    questions: [
      {
        id: `${id}-q1`,
        stationNumber: 1,
        text: "Capital of Sweden?",
        options: { "1": "Oslo", X: "Stockholm", "2": "Copenhagen" },
        correct: "X",
      },
    ],
    tiebreaker: { question: "Year?", answer: "1995" },
    ...overrides,
  };
}

function makeSubmission(
  id: string,
  walkId: string,
  score: number,
  finishedAt: number,
): Submission {
  return {
    id,
    walkId,
    participantName: `P-${id}`,
    answers: { q1: "X" },
    score,
    total: 10,
    finishedAt,
  };
}

describe("FirestoreStorage (emulator)", () => {
  test("saveWalk then getWalk round-trips the full walk", async () => {
    const walk = makeWalk("rt-1");
    await storage.saveWalk(walk);
    const got = await storage.getWalk("rt-1");
    expect(got).toEqual(walk);
  });

  test("getWalk returns null for an unknown id", async () => {
    const got = await storage.getWalk("does-not-exist-xyz");
    expect(got).toBeNull();
  });

  test("listWalksByOwner returns only the matching owner's walks", async () => {
    await seedWalk(makeWalk("own-a1", { ownerId: "alice" }));
    await seedWalk(makeWalk("own-a2", { ownerId: "alice" }));
    await seedWalk(makeWalk("own-b1", { ownerId: "bob" }));

    const aliceWalks = await storage.listWalksByOwner("alice");
    const ids = aliceWalks.map((w) => w.id).sort();
    expect(ids).toEqual(["own-a1", "own-a2"]);
    expect(aliceWalks.every((w) => w.ownerId === "alice")).toBe(true);
  });

  test("deleteWalk removes a walk", async () => {
    await storage.saveWalk(makeWalk("del-1"));
    expect(await storage.getWalk("del-1")).not.toBeNull();
    await storage.deleteWalk("del-1");
    expect(await storage.getWalk("del-1")).toBeNull();
  });

  test("getLeaderboard sorts by score desc, finishedAt asc, with 1-based ranks", async () => {
    const walkId = "lb-walk";
    const other = "lb-other";

    // Saved out of order on purpose.
    await storage.saveSubmission(makeSubmission("s-mid", walkId, 5, 100));
    await storage.saveSubmission(makeSubmission("s-top", walkId, 9, 200));
    await storage.saveSubmission(makeSubmission("s-tie-late", walkId, 5, 300));
    await storage.saveSubmission(makeSubmission("s-low", walkId, 1, 50));
    // Belongs to a different walk; must be excluded.
    await storage.saveSubmission(makeSubmission("s-other", other, 100, 1));

    const board = await storage.getLeaderboard(walkId);

    expect(board.map((e) => e.submission.id)).toEqual([
      "s-top", // score 9
      "s-mid", // score 5, finishedAt 100 (earlier wins tie)
      "s-tie-late", // score 5, finishedAt 300
      "s-low", // score 1
    ]);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    expect(board.some((e) => e.submission.id === "s-other")).toBe(false);
  });
});
