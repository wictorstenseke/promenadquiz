# TESTING.md — test strategy & how to extend it

The suite follows a testing pyramid, riskiest paths first. All tests are
**deterministic and offline**: no real network, no prod Firestore. Cloud
behaviour is tested against the **Firestore emulator** (project `demo-test`).

## Layers

| Layer | Files | Runner | What it covers |
|---|---|---|---|
| Unit (pure) | `src/lib/*.test.ts`, `src/storage/*Storage.test.ts`, `progress.test.ts` | `npm test` | scoring, walk helpers, shareUrl, factory, id, LocalStorageStorage, HybridStorage merge + auth branches |
| Component | `src/components/*.test.tsx` | `npm test` | rendering, interaction, accessible roles for sheets/switch/menu/shell |
| Page / integration | `src/pages/*.test.tsx` | `npm test` | Editor (load/autosave/publish-snapshot/guards), Play (name gate, nav, scored submit, resume), Result, Leaderboard, Preview, Share — via mocked `storage` singleton + `MemoryRouter` |
| Firestore rules | `src/storage/firestore-rules.emulator.test.ts` | `npm run test:integration` | allow/deny matrix for `walks` (anon create, ownerId binding, owner-only update/delete, adoption) and `submissions` (append-only) |
| Adapter integration | `src/storage/FirestoreStorage.emulator.test.ts` | `npm run test:integration` | round-trip save/get, listWalksByOwner filtering, delete, leaderboard ordering/ranks |

Coverage floor: **60% lines/functions/statements/branches** (`vite.config.ts`),
enforced by `test:coverage` and CI. Current is ~80% lines. Ratchet the
thresholds up as coverage rises; bump the numbers in `vite.config.ts`.

## Running

```bash
npm test                 # unit + component + page (offline, ~1.5s)
npm run test:watch       # watch mode
npm run test:coverage    # + coverage report + threshold gate
npm run test:integration # boots Firestore emulator, runs *.emulator.test.ts
npm run verify           # the whole gate (== CI)
```

`*.emulator.test.ts` is **excluded** from the default suite (see
`vite.config.ts` `test.exclude`) and runs only under
`vitest.integration.config.ts`, which `firebase emulators:exec` wraps so the
emulator is booted and torn down automatically. Requires a JRE.

## How to add a test

**Pure function / module** — add `src/<area>/<name>.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { scoreWalk } from "./scoring";
test("scores matching answers", () => {
  expect(scoreWalk({ questions: [...] }, { ... }).score).toBe(2);
});
```

**Component or page** — add `src/<area>/<name>.test.tsx`. Pages read the
`storage` singleton and use the router, so mock both:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../storage", () => ({ storage: {
  listWalks: vi.fn().mockResolvedValue([]),
  getWalk: vi.fn(), saveWalk: vi.fn().mockResolvedValue(undefined),
  deleteWalk: vi.fn(), saveSubmission: vi.fn().mockResolvedValue(undefined),
  getLeaderboard: vi.fn().mockResolvedValue([]), adoptLocalWalks: vi.fn(),
}}));
// If the page calls useAuth:
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

// Render with a route so useParams resolves:
render(
  <MemoryRouter initialEntries={["/p/abc"]}>
    <Routes><Route path="/p/:id" element={<PlayPage />} /></Routes>
  </MemoryRouter>,
);
await screen.findByRole("button", { name: /…/ });
```
`src/test/setup.ts` adds jest-dom matchers and clears the DOM + localStorage
between tests. Use `findBy*`/`waitFor` for content that appears after the mocked
storage promises resolve.

**Firestore rules or adapter** — add `src/storage/<name>.emulator.test.ts` and
copy the emulator bootstrap from `firestore-rules.emulator.test.ts`
(rules) or `FirestoreStorage.emulator.test.ts` (adapter). Read host/port from
`process.env.FIRESTORE_EMULATOR_HOST`. Run with `npm run test:integration`.

## Principles

- **Test behaviour, not implementation.** Assert on rendered text, roles, and
  the contract (what `storage`/`scoreWalk` is called with / returns), not on
  internal state.
- **Deterministic.** No real timers without `vi.useFakeTimers`, no network, no
  prod. Use unique ids or `clearFirestore()` between emulator tests.
- **A revealed bug is a separate concern.** Make the test assert current
  behaviour and note the bug (see CLAUDE.md "Known quirks"); fix in its own
  commit. Don't change app behaviour inside a test-only change.
