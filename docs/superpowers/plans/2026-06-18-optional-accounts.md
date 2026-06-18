# Optional accounts + cross-device sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organisers optionally sign in so their walks (drafts + published) sync across devices; signed-out behaviour is unchanged; participants never need an account.

**Architecture:** A thin `auth.ts` wraps Firebase Auth. `HybridStorage` becomes auth-aware via an injected `getUid()` — signed in, it stamps walks with `ownerId`/`updatedAt`, writes both local + cloud, and merges cloud walks into `listWalks`. A conditional Firestore owner-guard protects owned walks while leaving anonymous ones world-writable. An `AuthSheet` bottom sheet handles sign in / create / reset.

**Tech Stack:** React 18, TypeScript, Vite, Vitest (jsdom), Firebase Auth + Firestore (firebase v12).

**Spec:** `docs/superpowers/specs/2026-06-18-optional-accounts-cross-device-sync-design.md`

**Test conventions:** Vitest. Pure logic is unit-tested; components are tested via `react-dom/server`'s `renderToStaticMarkup` (no `@testing-library/react` in repo). SDK-wrapping glue is verified by `tsc`/manual run, matching the existing untested `FirestoreStorage`. Run a single file with `npx vitest run <path>`; whole suite with `npm test`; typecheck with `npx tsc -b`.

---

## Task 1: Add `ownerId` + `updatedAt` to the Walk type

**Files:**
- Modify: `src/types.ts:46-59`

Both fields are **optional** so existing walks (and the many `makeWalk` test helpers) keep compiling; missing `updatedAt` is treated as `0` everywhere it's compared.

- [ ] **Step 1: Add the fields**

In `src/types.ts`, inside `export interface Walk extends WalkContent {`, after the `id`/`status`/`createdAt` block add:

```typescript
  /** Firebase Auth uid of the organiser who claimed this walk. Absent on
   *  anonymous walks created while signed out. */
  ownerId?: string;
  /** Epoch ms, bumped on every save. Drives last-write-wins when the same id
   *  exists both locally and in the cloud. Missing is treated as 0. */
  updatedAt?: number;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS (no errors — fields are optional).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add ownerId and updatedAt to Walk type"
```

---

## Task 2: Auth error → Swedish message mapping

**Files:**
- Create: `src/auth.ts`
- Test: `src/auth.test.ts`

Pure function, no SDK — fully unit-testable. The rest of `auth.ts` is added in Task 3.

- [ ] **Step 1: Write the failing test**

Create `src/auth.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { mapAuthError } from "./auth";

describe("mapAuthError", () => {
  it("maps wrong credentials to a generic sign-in error", () => {
    expect(mapAuthError("auth/wrong-password")).toBe("Fel e-post eller lösenord.");
    expect(mapAuthError("auth/user-not-found")).toBe("Fel e-post eller lösenord.");
    expect(mapAuthError("auth/invalid-credential")).toBe("Fel e-post eller lösenord.");
  });

  it("maps email-already-in-use", () => {
    expect(mapAuthError("auth/email-already-in-use")).toBe(
      "Det finns redan ett konto med den e-posten.",
    );
  });

  it("maps weak password", () => {
    expect(mapAuthError("auth/weak-password")).toBe(
      "Lösenordet måste vara minst 6 tecken.",
    );
  });

  it("falls back for unknown codes", () => {
    expect(mapAuthError("auth/something-new")).toBe("Något gick fel. Försök igen.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth.test.ts`
Expected: FAIL — `mapAuthError` is not exported / file missing.

- [ ] **Step 3: Create `src/auth.ts` with the mapping**

```typescript
/** Maps a Firebase Auth error code to a plain Swedish message. */
export function mapAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Ogiltig e-postadress.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Fel e-post eller lösenord.";
    case "auth/email-already-in-use":
      return "Det finns redan ett konto med den e-posten.";
    case "auth/weak-password":
      return "Lösenordet måste vara minst 6 tecken.";
    case "auth/too-many-requests":
      return "För många försök. Försök igen senare.";
    case "auth/network-request-failed":
      return "Nätverksfel. Kontrollera din anslutning.";
    case "auth-unavailable":
      return "Inloggning är inte tillgänglig just nu.";
    default:
      return "Något gick fel. Försök igen.";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/auth.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/auth.test.ts
git commit -m "feat: Swedish auth error mapping"
```

---

## Task 3: Firebase Auth instance + auth wrapper

**Files:**
- Modify: `src/firebase.ts`
- Modify: `src/auth.ts`
- Test: `src/auth.test.ts`

`auth.ts` wraps the SDK and degrades to no-ops when `firebaseEnabled` is false. In the test env no `VITE_FIREBASE_*` vars are set, so `auth` is `null` — we test exactly that degraded path.

- [ ] **Step 1: Export an `auth` instance from `src/firebase.ts`**

Add to the imports at the top:

```typescript
import { getAuth, type Auth } from "firebase/auth";
```

Add `let authInstance: Auth | undefined;` next to the existing `let app`/`let firestore` declarations. Inside the existing `if (firebaseEnabled) {` block, after `firestore = initializeFirestore(...)`, add:

```typescript
  authInstance = getAuth(app);
```

At the end of the file, after the `db` export, add:

```typescript
/** Firebase Auth instance, or null when no config is present. */
export const auth: Auth | null = authInstance ?? null;
```

- [ ] **Step 2: Write the failing test for the degraded path**

Append to `src/auth.test.ts`:

```typescript
import { currentUser, onAuthChange } from "./auth";

describe("auth wrapper without Firebase config", () => {
  it("currentUser is null", () => {
    expect(currentUser()).toBeNull();
  });

  it("onAuthChange immediately reports null and returns an unsubscribe", () => {
    let seen: unknown = "unset";
    const unsub = onAuthChange((u) => {
      seen = u;
    });
    expect(seen).toBeNull();
    expect(typeof unsub).toBe("function");
    unsub();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/auth.test.ts`
Expected: FAIL — `currentUser`/`onAuthChange` not exported.

- [ ] **Step 4: Add the wrapper to `src/auth.ts`**

Add above `mapAuthError`:

```typescript
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

function toUser(u: User | null): AuthUser | null {
  return u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null;
}

export function currentUser(): AuthUser | null {
  return auth ? toUser(auth.currentUser) : null;
}

/** Subscribe to auth changes. Calls back with null and no-ops when auth is off. */
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(toUser(u)));
}

export async function signUp(email: string, password: string): Promise<void> {
  if (!auth) throw { code: "auth-unavailable" };
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Fire-and-forget: don't block the sign-up flow on the verification email.
  void sendEmailVerification(cred.user).catch(() => {});
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!auth) throw { code: "auth-unavailable" };
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await fbSignOut(auth);
}

export async function sendReset(email: string): Promise<void> {
  if (!auth) throw { code: "auth-unavailable" };
  await sendPasswordResetEmail(auth, email);
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/auth.test.ts`
Expected: PASS.
Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/firebase.ts src/auth.ts src/auth.test.ts
git commit -m "feat: Firebase Auth wrapper with degraded fallback"
```

---

## Task 4: `RemoteStorage` interface + owner query

**Files:**
- Modify: `src/storage/Storage.ts`
- Modify: `src/storage/FirestoreStorage.ts`

Adds the cloud-only "my walks" query. The query is thin glue over the SDK; consistent with the existing untested `FirestoreStorage`, it's verified by `tsc` (the merge logic that depends on it is unit-tested in Task 5).

- [ ] **Step 1: Add `RemoteStorage` to `src/storage/Storage.ts`**

`Storage.ts` already imports `Walk` at the top (`import type { Submission, Walk } from "../types";`), so reuse it — no new import. At the end of the file add:

```typescript
/** A backend that can list a single owner's walks (needs identity). */
export interface RemoteStorage extends Storage {
  listWalksByOwner(uid: string): Promise<Walk[]>;
}
```

- [ ] **Step 2: Implement it in `src/storage/FirestoreStorage.ts`**

Change the class declaration:

```typescript
import type { LeaderboardEntry, RemoteStorage } from "./Storage";
// ...
export class FirestoreStorage implements RemoteStorage {
```

Add this method (after `listWalks`):

```typescript
  /** Walks owned by a signed-in organiser, for cross-device "my walks". */
  async listWalksByOwner(uid: string): Promise<Walk[]> {
    const q = query(collection(this.db, WALKS), where("ownerId", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Walk);
  }
```

(`collection`, `query`, `where`, `getDocs` are already imported in this file.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/storage/Storage.ts src/storage/FirestoreStorage.ts
git commit -m "feat: RemoteStorage.listWalksByOwner for owner sync"
```

---

## Task 5: Auth-aware HybridStorage (core)

**Files:**
- Modify: `src/storage/HybridStorage.ts`
- Test: `src/storage/HybridStorage.test.ts`

This is the heart of sync: a pure `mergeWalks`, plus constructor-injected `remote`/`getUid` so it's testable with a fake remote. Stamping `ownerId`/`updatedAt`, writing both layers when signed in, merging cloud into `listWalks`, and `adoptLocalWalks`.

- [ ] **Step 1: Write the failing test**

Create `src/storage/HybridStorage.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/storage/HybridStorage.test.ts`
Expected: FAIL — `mergeWalks` not exported; constructor doesn't accept deps.

- [ ] **Step 3: Rewrite `src/storage/HybridStorage.ts`**

```typescript
import type { Submission, Walk } from "../types";
import type { LeaderboardEntry, RemoteStorage, Storage } from "./Storage";
import { LocalStorageStorage } from "./LocalStorageStorage";
import { FirestoreStorage } from "./FirestoreStorage";
import { db } from "../firebase";

/** Dedupe two walk lists by id (newer `updatedAt` wins), newest `createdAt` first. */
export function mergeWalks(local: Walk[], cloud: Walk[]): Walk[] {
  const byId = new Map<string, Walk>();
  for (const w of [...local, ...cloud]) {
    const prev = byId.get(w.id);
    if (!prev || (w.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) byId.set(w.id, w);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export interface HybridDeps {
  local?: Storage;
  remote?: RemoteStorage | null;
  /** Returns the signed-in uid, or null when signed out / auth disabled. */
  getUid?: () => string | null;
}

/**
 * Auth-aware persistence.
 *
 *   signed out  -> drafts local-only; published walks mirrored to cloud by id
 *                  (today's behaviour; anonymous, no ownerId)
 *   signed in   -> every save stamped with ownerId + updatedAt and written to
 *                  both local and cloud (drafts included); listWalks merges the
 *                  owner's cloud walks in, so they appear on every device.
 *
 * With no Firebase config, `remote` is null and everything degrades to local.
 */
export class HybridStorage implements Storage {
  private local: Storage;
  private remote: RemoteStorage | null;
  private getUid: () => string | null;

  constructor(deps: HybridDeps = {}) {
    this.local = deps.local ?? new LocalStorageStorage();
    this.remote = deps.remote ?? (db ? new FirestoreStorage(db) : null);
    this.getUid = deps.getUid ?? (() => null);
  }

  async listWalks(): Promise<Walk[]> {
    const local = await this.local.listWalks();
    const uid = this.getUid();
    if (!this.remote || !uid) return local;
    try {
      const cloud = await this.remote.listWalksByOwner(uid);
      return mergeWalks(local, cloud);
    } catch {
      return local; // offline / query failure: don't blank the list
    }
  }

  async getWalk(id: string): Promise<Walk | null> {
    const local = await this.local.getWalk(id);
    if (local) return local;
    return this.remote ? this.remote.getWalk(id) : null;
  }

  async saveWalk(walk: Walk): Promise<void> {
    const uid = this.getUid();
    if (this.remote && uid) {
      const owned: Walk = { ...walk, ownerId: walk.ownerId ?? uid, updatedAt: Date.now() };
      await this.local.saveWalk(owned);
      await this.tryRemote(() => this.remote!.saveWalk(owned));
      return;
    }
    const stamped: Walk = { ...walk, updatedAt: Date.now() };
    await this.local.saveWalk(stamped);
    if (this.remote && stamped.status === "published") {
      await this.tryRemote(() => this.remote!.saveWalk(stamped));
    }
  }

  async deleteWalk(id: string): Promise<void> {
    await this.local.deleteWalk(id);
    if (this.remote) await this.tryRemote(() => this.remote!.deleteWalk(id));
  }

  async saveSubmission(submission: Submission): Promise<void> {
    if (this.remote) return this.remote.saveSubmission(submission);
    return this.local.saveSubmission(submission);
  }

  async getLeaderboard(walkId: string): Promise<LeaderboardEntry[]> {
    if (this.remote) return this.remote.getLeaderboard(walkId);
    return this.local.getLeaderboard(walkId);
  }

  /** Claim every unowned local walk for `uid` and push it to the cloud. Idempotent. */
  async adoptLocalWalks(uid: string): Promise<void> {
    if (!this.remote) return;
    const locals = await this.local.listWalks();
    for (const w of locals) {
      if (w.ownerId) continue;
      const owned: Walk = { ...w, ownerId: uid, updatedAt: Date.now() };
      await this.local.saveWalk(owned);
      await this.tryRemote(() => this.remote!.saveWalk(owned));
    }
  }

  /** Cloud writes must never lose the local save; a failure is logged, not thrown. */
  private async tryRemote(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      console.warn("[storage] cloud write failed; kept local copy", e);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/storage/HybridStorage.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `npm test`
Expected: PASS — existing `LocalStorageStorage`/component tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/storage/HybridStorage.ts src/storage/HybridStorage.test.ts
git commit -m "feat: auth-aware HybridStorage with owner sync and adoption"
```

---

## Task 6: Wire live uid into the storage singleton

**Files:**
- Modify: `src/storage/index.ts`

`getUid` reads the *current* auth user on every call (live accessor, not a snapshot), so the module singleton stays correct as auth changes. Export the concrete type so `adoptLocalWalks` is reachable from `useAuth`.

- [ ] **Step 1: Update `src/storage/index.ts`**

```typescript
import { HybridStorage } from "./HybridStorage";
import { currentUser } from "../auth";

/**
 * The one place the backend is chosen. HybridStorage keeps drafts on-device and
 * syncs the signed-in user's walks to Firestore; it degrades to pure
 * localStorage when no Firebase config is present.
 */
export const storage = new HybridStorage({
  getUid: () => currentUser()?.uid ?? null,
});

export type { Storage, LeaderboardEntry } from "./Storage";
```

(Note: the exported `storage` is now typed as `HybridStorage`, so callers can use `storage.adoptLocalWalks`. All existing `Storage`-interface calls still compile.)

- [ ] **Step 2: Typecheck + full suite**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/storage/index.ts
git commit -m "feat: feed live auth uid into storage"
```

---

## Task 7: `useAuth` provider with adoption-on-sign-in

**Files:**
- Create: `src/hooks/useAuth.tsx`
- Modify: `src/main.tsx`

React context exposing `{ user, loading, signOut }`. On every transition to a signed-in user it runs `adoptLocalWalks` (idempotent — already-owned walks are skipped), which also covers a fresh device where anonymous drafts were made before signing in. Glue verified by typecheck + build.

- [ ] **Step 1: Create `src/hooks/useAuth.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange, signOut as authSignOut, type AuthUser } from "../auth";
import { storage } from "../storage";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthChange((u) => {
        setUser(u);
        setLoading(false);
        // Claim any unowned local walks for this account so they cross devices.
        if (u) void storage.adoptLocalWalks(u.uid);
      }),
    [],
  );

  return (
    <AuthContext.Provider value={{ user, loading, signOut: authSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Wrap the router in `src/main.tsx`**

Add the import after the other imports:

```typescript
import { AuthProvider } from "./hooks/useAuth";
```

Change the render call to wrap the provider around `RouterProvider`:

```tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: PASS (build succeeds).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAuth.tsx src/main.tsx
git commit -m "feat: AuthProvider with adopt-on-sign-in"
```

---

## Task 8: AuthSheet (sign in / create / reset)

**Files:**
- Create: `src/components/AuthSheet.tsx`
- Test: `src/components/AuthSheet.test.tsx`
- Modify: `src/styles.css`

One sheet, three modes. `initialMode` makes each mode statically renderable for tests (mode toggling itself is trivial `useState`). Password show/hide is a `type` swap. Submit is disabled while pending and when required fields are empty.

- [ ] **Step 1: Add styles to `src/styles.css`**

Extend the input selector (line ~425) to cover email + password, and add auth helpers. Change:

```css
input[type="text"],
input[type="number"],
textarea {
```

to:

```css
input[type="text"],
input[type="number"],
input[type="email"],
input[type="password"],
textarea {
```

Then append at the end of the file:

```css
.pw-field {
  position: relative;
}
.pw-field input {
  padding-right: 4.2rem;
}
.pw-field .pw-toggle {
  position: absolute;
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--forest);
  cursor: pointer;
  padding: 0.3rem 0.4rem;
}
.auth-alt {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 0.9rem;
  font-size: 0.9rem;
}
.auth-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--forest);
  font-weight: 700;
  font-size: inherit;
  cursor: pointer;
}
.auth-notice {
  margin: 0;
  color: var(--forest);
  font-size: 0.9rem;
  font-weight: 600;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/AuthSheet.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AuthSheet } from "./AuthSheet";

function render(mode: "signin" | "signup" | "reset") {
  return renderToStaticMarkup(
    <AuthSheet open onClose={() => {}} initialMode={mode} />,
  );
}

describe("AuthSheet", () => {
  test("sign-in mode shows email + password and a forgot-password link", () => {
    const html = render("signin");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain("Glömt lösenord?");
    expect(html).toContain("Logga in");
  });

  test("create mode shows the password rule hint", () => {
    const html = render("signup");
    expect(html).toContain("minst 6 tecken");
    expect(html).toContain("Skapa konto");
  });

  test("reset mode shows only email (no password field)", () => {
    const html = render("reset");
    expect(html).toContain('type="email"');
    expect(html).not.toContain('type="password"');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/AuthSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/components/AuthSheet.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { mapAuthError, sendReset, signIn, signUp } from "../auth";

export type AuthMode = "signin" | "signup" | "reset";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Starting mode. Defaults to sign-in; also used to render modes in tests. */
  initialMode?: AuthMode;
}

const TITLES: Record<AuthMode, string> = {
  signin: "Logga in",
  signup: "Skapa konto",
  reset: "Återställ lösenord",
};

/** Bottom sheet for optional accounts: sign in, create, or reset password. */
export function AuthSheet({ open, onClose, initialMode = "signin" }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setEmail("");
    setPassword("");
    setShowPw(false);
    setError(null);
    setNotice(null);
    setPending(false);
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open, initialMode]);

  function go(next: AuthMode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        onClose();
      } else if (mode === "signup") {
        await signUp(email.trim(), password);
        onClose(); // AuthProvider runs adoption when the user becomes non-null
      } else {
        await sendReset(email.trim());
        setNotice("Kolla din inkorg för en återställningslänk.");
      }
    } catch (err) {
      const code =
        (err as { code?: string }).code ?? (err as Error).message ?? "";
      setError(mapAuthError(code));
    } finally {
      setPending(false);
    }
  }

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit =
    !pending && emailOk && (mode === "reset" || password.length >= 6);

  return (
    <Sheet open={open} onClose={onClose}>
      <h3 className="sheet-title">{TITLES[mode]}</h3>
      <p className="sheet-body muted">
        {mode === "reset"
          ? "Vi skickar en länk för att återställa ditt lösenord."
          : "Logga in för att spara dina promenader på alla dina enheter. Frivilligt — appen fungerar lika bra utan konto."}
      </p>

      <form className="stack" style={{ gap: "0.9rem", marginTop: "1rem" }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="auth-email">E-post</label>
          <input
            ref={emailRef}
            id="auth-email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="namn@exempel.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="auth-pw">Lösenord</label>
            <div className="pw-field">
              <input
                id="auth-pw"
                type={showPw ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "Minst 6 tecken" : "Ditt lösenord"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Dölj lösenord" : "Visa lösenord"}
              >
                {showPw ? "Dölj" : "Visa"}
              </button>
            </div>
            {mode === "signup" && (
              <span className="muted" style={{ fontSize: "0.82rem" }}>
                Lösenordet måste vara minst 6 tecken.
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="field-error" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-notice" aria-live="polite">
            {notice}
          </p>
        )}

        <button className="btn blaze" type="submit" disabled={!canSubmit}>
          {pending ? "Vänta…" : TITLES[mode]}
        </button>
      </form>

      <div className="auth-alt">
        {mode === "signin" && (
          <>
            <button type="button" className="auth-link" onClick={() => go("reset")}>
              Glömt lösenord?
            </button>
            <button type="button" className="auth-link" onClick={() => go("signup")}>
              Skapa konto
            </button>
          </>
        )}
        {mode === "signup" && (
          <button type="button" className="auth-link" onClick={() => go("signin")}>
            Har du redan ett konto? Logga in
          </button>
        )}
        {mode === "reset" && (
          <button type="button" className="auth-link" onClick={() => go("signin")}>
            Tillbaka till inloggning
          </button>
        )}
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/AuthSheet.test.tsx`
Expected: PASS (all 3).

- [ ] **Step 6: Commit**

```bash
git add src/components/AuthSheet.tsx src/components/AuthSheet.test.tsx src/styles.css
git commit -m "feat: AuthSheet with sign in, create, and reset modes"
```

---

## Task 9: Topbar entry point + home refresh on auth change

**Files:**
- Modify: `src/components/Shell.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/styles.css` (small)

Topbar shows "Logga in" when signed out, or the email + "Logga ut" when signed in. HomePage re-lists walks whenever `user` changes. UI glue — verified by build + manual run.

- [ ] **Step 1: Add the auth control to `src/components/Shell.tsx`**

Replace the file body with (keeps the existing scroll-reset effect and layout, adds an auth control + sheet):

```tsx
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { HomeIcon } from "./Icons";
import { useAuth } from "../hooks/useAuth";
import { AuthSheet } from "./AuthSheet";

export function Shell() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  // Router keeps scroll position across navigations; reset to top on each route
  // change so a new page renders from the top, not wherever the last one sat.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <header className="topbar no-print">
        <Link to="/" className="brand">
          <span>
            Promenadquiz
            <small>Tipspromenad</small>
          </span>
        </Link>
        <div className="topbar-actions">
          {user ? (
            <>
              <span className="topbar-email" title={user.email ?? undefined}>
                {user.email}
              </span>
              <button className="btn ghost sm" onClick={() => void signOut()}>
                Logga ut
              </button>
            </>
          ) : (
            <button className="btn ghost sm" onClick={() => setAuthOpen(true)}>
              Logga in
            </button>
          )}
          <Link to="/" className="btn ghost sm nav-home" aria-label="Mina promenader">
            <HomeIcon />
            <span className="nav-home-label">Mina promenader</span>
          </Link>
        </div>
      </header>
      <Outlet />
      <footer className="footer no-print">
        <span className="footer-meta">
          <a href="https://wictorstenseke.se">WictorStenseke.se</a> · 2026
        </span>
      </footer>
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Add minimal styles to `src/styles.css`**

Append:

```css
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.topbar-email {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-soft);
  max-width: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 520px) {
  .topbar-email {
    display: none;
  }
}
```

- [ ] **Step 3: Re-list walks on auth change in `src/pages/HomePage.tsx`**

Add the import near the other imports:

```typescript
import { useAuth } from "../hooks/useAuth";
```

In the component, add `const { user } = useAuth();` at the top of `HomePage` (next to the other hooks). Then change the existing load effect's dependency array so it re-runs when the user changes — replace `}, []);` at the end of the `useEffect` that calls `storage.listWalks()` with:

```typescript
  }, [user]);
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: PASS.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the app. With Firebase configured:
- Topbar shows "Logga in" → opens the sheet.
- Create an account → sheet closes, topbar shows your email + "Logga ut".
- Confirm a draft made before sign-in now has an owner (appears after reload), and that it shows up on a second browser signed into the same account.
- "Logga ut" returns to "Logga in".
Expected: all behave as described.

- [ ] **Step 6: Commit**

```bash
git add src/components/Shell.tsx src/pages/HomePage.tsx src/styles.css
git commit -m "feat: topbar auth control and home refresh on auth change"
```

---

## Task 10: Conditional owner-guard Firestore rules

**Files:**
- Modify: `firestore.rules`

Owned walks become writable only by their owner; unowned (anonymous/legacy) walks stay world-writable so signed-out publishing keeps working; the adoption claim transition is allowed. Submissions unchanged.

- [ ] **Step 1: Replace the walks block in `firestore.rules`**

```
rules_version = '2';

// Optional accounts. A walk with no ownerId is anonymous and stays world-
// writable (accepted risk, scoped to unclaimed walks). Once a signed-in user
// claims it (ownerId set to their uid), only that owner may write it.
service cloud.firestore {
  match /databases/{database}/documents {

    match /walks/{walkId} {
      allow read: if true;

      // Create: anyone. If an ownerId is present it must be the caller's uid.
      allow create: if !("ownerId" in request.resource.data)
                    || request.resource.data.ownerId == request.auth.uid;

      // Update/delete: unowned docs stay open; owned docs are owner-only. The
      // adoption claim (unowned -> ownerId == my uid) is permitted because the
      // existing resource has no ownerId.
      allow update, delete: if !("ownerId" in resource.data)
                            || resource.data.ownerId == request.auth.uid;
    }

    // Participant submissions: append-only, anonymous. Unchanged.
    match /submissions/{submissionId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Deploy the rules**

Run: `npx firebase deploy --only firestore:rules`
Expected: "Deploy complete!" (requires firebase CLI auth; if not installed, deploy the rules from the Firebase console instead).

- [ ] **Step 3: Manual verification**

- Signed out: publishing a walk still works (anonymous doc, no ownerId).
- Signed in on device A: create/edit a walk → succeeds (owned by you).
- Signed in as a *different* account: editing the first user's walk is rejected (permission denied).
Expected: all hold.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: conditional owner-guard Firestore rules"
```

---

## Done

After Task 10, update the `firebase-add-editor-auth-guard` memory: the owner guard now protects signed-in users' walks; anonymous walks remain world-writable by design (documented trade-off), so the flag is downgraded, not fully closed.

Final full check:

```bash
npx tsc -b && npm test && npm run build
```

Expected: typecheck clean, all tests pass, build succeeds.
