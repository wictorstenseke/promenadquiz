/**
 * Firestore security-rules tests (firestore.rules) against the emulator.
 *
 * Riskiest path in the app: a wrong rule lets anyone overwrite a published walk
 * or forge submissions. These assert the allow/deny matrix for both collections.
 *
 * Run with: npm run test:integration  (boots the Firestore emulator).
 */
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

/** Write a doc bypassing rules, to set up preconditions. */
async function seed(path: string, id: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path, id), data);
  });
}

describe("walks rules", () => {
  test("anyone may read a walk (signed in or out)", async () => {
    await seed("walks", "w1", { title: "T" });
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "walks", "w1")));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("alice").firestore(), "walks", "w2")));
  });

  test("create: anonymous walk with no ownerId is allowed", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "walks", "anon"), { title: "A" }));
  });

  test("create: ownerId must equal the caller's uid", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "walks", "mine"), { title: "M", ownerId: "alice" }));
    await assertFails(setDoc(doc(db, "walks", "forged"), { title: "F", ownerId: "bob" }));
  });

  test("update: unowned walk stays world-writable", async () => {
    await seed("walks", "open", { title: "Open" });
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "walks", "open"), { title: "Edited" }));
  });

  test("update: owned walk is writable only by its owner", async () => {
    await seed("walks", "owned", { title: "O", ownerId: "alice" });
    await assertSucceeds(
      setDoc(doc(env.authenticatedContext("alice").firestore(), "walks", "owned"), {
        title: "O2",
        ownerId: "alice",
      }),
    );
    await assertFails(
      setDoc(doc(env.authenticatedContext("bob").firestore(), "walks", "owned"), {
        title: "Hijack",
        ownerId: "alice",
      }),
    );
  });

  test("adoption: claiming an unowned walk with my uid is allowed", async () => {
    await seed("walks", "claimable", { title: "C" });
    await assertSucceeds(
      setDoc(doc(env.authenticatedContext("alice").firestore(), "walks", "claimable"), {
        title: "C",
        ownerId: "alice",
      }),
    );
  });

  test("delete: owner may delete, others may not", async () => {
    await seed("walks", "del", { title: "D", ownerId: "alice" });
    await assertFails(deleteDoc(doc(env.authenticatedContext("bob").firestore(), "walks", "del")));
    await assertSucceeds(
      deleteDoc(doc(env.authenticatedContext("alice").firestore(), "walks", "del")),
    );
  });
});

describe("submissions rules", () => {
  test("anyone may read and create, but never update or delete", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "submissions", "s1"), { walkId: "w1", score: 3 }));
    await assertSucceeds(getDoc(doc(db, "submissions", "s1")));
    await assertFails(setDoc(doc(db, "submissions", "s1"), { walkId: "w1", score: 99 }));
    await assertFails(deleteDoc(doc(db, "submissions", "s1")));
  });
});
