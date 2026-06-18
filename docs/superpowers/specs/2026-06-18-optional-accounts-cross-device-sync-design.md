# Optional accounts + cross-device sync — design

**Date:** 2026-06-18
**Status:** Approved (pending spec review)

## Goal

Let organisers optionally create an account. Signed in, their walks (drafts +
published) sync across devices. Signed out, the app behaves exactly as today
(localStorage only). Participants never need an account — joining by code and
submitting stays frictionless.

## Non-goals

- No accounts for participants.
- No email-verification gate (verification is sent, not enforced).
- No full lockdown of anonymous walks (see rules trade-off below).
- No real-time/live sync or multi-user co-editing — last-write-wins is enough.

## Key trade-off: conditional owner guard

Today a signed-out admin can publish a walk to Firestore so participants fetch
it by code — no account required. Tightening rules to "only the owner can write
a walk" would force accounts to publish, breaking the "accounts optional,
otherwise same functionality" promise.

Resolution — **conditional owner guard**:

- Walk with **no `ownerId`** (anonymous / legacy) → stays world-writable
  (today's accepted risk, scoped to walks nobody has claimed).
- Walk **with an `ownerId`** → only that signed-in owner may update/delete.

The active security memory (open Firestore rules) is therefore **partially**
resolved: signed-in users' walks are protected; truly-anonymous walks remain
open by design. Full lockdown is explicitly out of scope because it contradicts
the optional-account goal.

## Firestore rules

```
match /walks/{walkId} {
  allow read: if true;                       // world-readable (fetch by code)

  // Create: anyone. If an ownerId is set, it must equal the caller's uid.
  allow create: if !('ownerId' in request.resource.data)
                || request.resource.data.ownerId == request.auth.uid;

  // Update/delete: allowed for unowned (legacy/anonymous) docs, otherwise
  // only the owner. An owned doc's ownerId cannot be reassigned to someone else.
  allow update, delete: if !('ownerId' in resource.data)
                        || resource.data.ownerId == request.auth.uid;
}

match /submissions/{submissionId} {
  allow read: if true;          // leaderboard is public
  allow create: if true;        // participants, anonymous, append-only
  allow update, delete: if false;
}
```

Note: an unowned doc can be claimed (update that sets `ownerId == request.auth.uid`).
This is exactly the adoption path. Once owned, it's locked to that uid.

## Data model changes (`src/types.ts`)

`Walk` gains:

- `ownerId?: string` — Firebase Auth uid of the claiming organiser. Absent on
  anonymous walks.
- `updatedAt: number` — epoch ms, bumped on every save. Drives last-write-wins
  when the same id exists both locally and in the cloud.

Existing local walks lack `updatedAt`; treat missing as `0` so any cloud copy
wins until the next local save stamps it.

## `src/auth.ts` — new module

Thin wrapper over Firebase Auth. Degrades to no-ops / `null` when
`firebaseEnabled` is false, so localStorage-only forks keep working.

- `signUp(email, password): Promise<void>` — creates user, auto signs in, sends
  verification email (non-blocking).
- `signIn(email, password): Promise<void>`
- `signOut(): Promise<void>`
- `sendReset(email): Promise<void>` — Firebase built-in reset email.
- `onAuthChange(cb: (user: AuthUser | null) => void): () => void`
- `currentUser(): AuthUser | null`

`AuthUser = { uid: string; email: string | null; emailVerified: boolean }`.

Firebase auth errors are mapped to plain Swedish messages by error code at the
UI layer (e.g. `auth/wrong-password`, `auth/email-already-in-use`,
`auth/invalid-email`, `auth/weak-password`, `auth/user-not-found`,
`auth/too-many-requests`). Unknown codes get a generic fallback.

## `src/storage` — auth-aware HybridStorage

`HybridStorage` gains a `getUid: () => string | null` injected at construction
(reads current auth uid). Behaviour:

| Operation | Signed out (unchanged) | Signed in |
|-----------|------------------------|-----------|
| `listWalks` | local only | union of local + cloud `where ownerId == uid`, deduped by id, higher `updatedAt` wins |
| `saveWalk` | local; mirror to cloud only if `status === "published"` | stamp `ownerId = uid` + `updatedAt = now`, write to **both** local and cloud (drafts included) |
| `deleteWalk` | local + best-effort cloud | local + cloud |
| `saveSubmission` / `getLeaderboard` | unchanged (Firestore when present) | unchanged |

`FirestoreStorage` gains `listWalksByOwner(uid): Promise<Walk[]>`
(`where("ownerId", "==", uid)`), used only when signed in.

### Adoption on sign-in

When auth transitions to signed-in, run once: for every local walk without an
`ownerId`, set `ownerId = uid` (bump `updatedAt`) and push to cloud via
`saveWalk`. Claims existing on-device walks for the account so they appear on
other devices. Idempotent — already-owned walks are skipped.

### Sign-out

Drop to local-only view. Walks cached locally still show; walks that existed
only in the cloud (created on another device) disappear until next sign-in.
This is expected and acceptable.

### Offline / error handling

Cloud writes are awaited but failures (offline) must not lose the local save:
local write happens first; a failing cloud write is surfaced as a non-fatal
warning, and the next successful save reconciles via `updatedAt`. `listWalks`
falls back to local-only if the cloud query throws.

## Auth state in the UI

`useAuth` hook (small React context) exposing `{ user, loading }` plus the
auth actions. Subscribes via `onAuthChange`.

- **Topbar** (`Shell.tsx`): signed out → "Logga in" button opens the sheet.
  Signed in → shows email + a menu with "Logga ut".
- **HomePage**: re-runs `listWalks` whenever `user` changes (sign-in pulls
  cloud walks; sign-out drops them).

## `AuthSheet.tsx` — the action sheet

Reuses the existing `Sheet` bottom-sheet shell. One sheet, three inline modes:

### Sign in
- Email + password fields; show/hide password toggle (eye icon).
- "Glömt lösenord?" link → reset mode.
- "Skapa konto" toggle → create mode.
- Submit → `signIn`; inline error region (`aria-live`) on failure.

### Create account
- Email + password (+ show/hide).
- Live hint for password rule (Firebase min 6 chars).
- Submit → `signUp` → auto signed in → adoption runs → sheet closes.
- Verification email sent, usage not gated on it.
- "Logga in" toggle back to sign-in mode.

### Forgot password
- Email field only → `sendReset` → success confirmation ("Kolla din inkorg").

### Best-practice details
- `autoComplete`: `email`, `current-password` (sign in), `new-password`
  (create).
- `type="email"`, `autoCapitalize="none"`, `autoCorrect="off"`,
  `spellCheck={false}`.
- Submit disabled while pending; loading state on the button.
- Enter submits; first field autofocused after the sheet slides in.
- Inline error region with `aria-live="polite"`.
- All copy in Swedish.

## Testing

- `auth.ts`: error-code → Swedish-message mapping (pure function, unit-tested).
- `HybridStorage`: signed-out behaviour unchanged; signed-in `saveWalk` stamps
  `ownerId`/`updatedAt` and writes both layers; `listWalks` merge dedupes and
  resolves conflicts by `updatedAt`; adoption claims unowned local walks and is
  idempotent. Mock `FirestoreStorage` + a stub `getUid`.
- `AuthSheet`: mode toggles render correct fields; show/hide flips input type;
  submit disabled while pending; error message surfaces on rejected action.
  (Auth actions mocked.)
- Firestore rules: not unit-tested here (no emulator in repo); manual
  verification — owned walk rejects a different uid's write, unowned walk still
  writable, claim transition works.

## Components touched / added

- New: `src/auth.ts`, `src/components/AuthSheet.tsx`, `src/hooks/useAuth.tsx`.
- Changed: `src/types.ts`, `src/storage/HybridStorage.ts`,
  `src/storage/FirestoreStorage.ts`, `src/storage/index.ts` (wire `getUid`),
  `src/components/Shell.tsx`, `src/pages/HomePage.tsx`, `firestore.rules`.
- `src/firebase.ts`: export an `auth` instance alongside `db`.
