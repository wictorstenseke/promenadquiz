# CLAUDE.md — agent onboarding for Promenadquiz

> Read this file first. It is written so an AI agent (or human) can clone the
> repo, run one command, see tests pass, and start shipping safely without
> asking the maintainer anything. The UI is in Swedish; this doc is in English.

## What this is

**Promenadquiz** is a digital _tipspromenad_ (a Swedish walking quiz). An
organiser builds questions in **1 · X · 2** format, plays them digitally and/or
prints one question per A4 sheet, and shares the walk via a link + QR code.
Participants answer one question at a time; progress autosaves. There is a
shared leaderboard. Optional accounts (Firebase Auth) let an organiser's walks
sync across devices; signed-out use works fully on-device.

Live: https://wictorstenseke.github.io/promenadquiz/

## One-command setup

```bash
npm install
npm run verify   # lint + typecheck + coverage + emulator integration tests
```

`npm run verify` is the full local gate (mirrors CI). For just the fast unit
suite use `npm test`. The integration tests need a JRE (the Firestore emulator);
`verify`/`test:integration` will fail without Java — use `npm test` if you only
need unit/component coverage.

## Tech stack

| Area | Choice | Notes |
|---|---|---|
| Build | Vite 5 | `base: /promenadquiz/` for Pages subpath |
| UI | React 18 + TypeScript 5 | function components, hooks |
| Routing | react-router-dom 6 | **HashRouter** (Pages has no server rewrites) |
| Backend | Firebase 12 / Firestore | Spark plan; rules in `firestore.rules` |
| QR | qrcode.react | |
| Tests | Vitest 2 + Testing Library + jsdom | `@firebase/rules-unit-testing` + emulator for integration |
| CI/Deploy | GitHub Actions → GitHub Pages | |

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm test` | Unit + component suite (offline, fast) |
| `npm run test:watch` | Vitest watch |
| `npm run test:coverage` | Unit suite + coverage (fails under 60% lines) |
| `npm run test:integration` | Boots Firestore emulator, runs `*.emulator.test.ts` |
| `npm run test:emulators` | Start the Firestore emulator standalone |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` |
| `npm run verify` | lint + typecheck + coverage + integration (the gate) |

## Architecture map

```
src/
  main.tsx              entry; HashRouter + route table; wraps app in AuthProvider
  styles.css            global styles (incl. @media print for A4 sheets + QR poster)
  types.ts              Walk, WalkContent, Question, Submission, Progress, OptionKey
  auth.ts               Firebase Auth wrapper (email/password): signIn/up/reset, onAuthChange
  firebase.ts           Firebase init from VITE_FIREBASE_* env; `db` is null with no config
  hooks/useAuth.tsx     AuthProvider + useAuth(); adopts local walks on first sign-in
  lib/
    scoring.ts          pure scoreWalk(walk, answers) -> {score, total}
    walk.ts             walk content helpers (walkContent, ordering, validation)
    shareUrl.ts         playUrl(id) etc. — the shareable participant link
    factory.ts          newWalk(), newQuestion()
    id.ts               shortId() / uid() (crypto-random, unambiguous alphabet)
  storage/
    Storage.ts          the stable persistence CONTRACT (Storage, RemoteStorage)
    index.ts            THE ONLY place the backend is chosen (singleton `storage`)
    HybridStorage.ts    auth-aware: local + cloud merge; degrades to local
    LocalStorageStorage.ts   localStorage impl
    FirestoreStorage.ts      Firestore impl (RemoteStorage)
    progress.ts         participant in-progress answers — ALWAYS localStorage
  components/           Sheet, Switch, ConfirmSheet, JoinSheet, AuthSheet,
                        WalkActionsSheet, PrintMenu, PrintSheets, TalongSheets,
                        QrPoster, Shell, Icons
  pages/                HomePage, EditorPage, PreviewPage, SharePage,
                        LeaderboardPage, PlayPage, ResultPage, NotFoundPage
```

### Routes (HashRouter — URLs are `/#/...`)

- `/` — organiser's list + create (HomePage)
- `/walk/:id/edit` — build & publish, autosaves (EditorPage)
- `/walk/:id/preview` — preview (PreviewPage)
- `/walk/:id/share` — link + QR + print menu (SharePage)
- `/walk/:id/leaderboard` — leaderboard (LeaderboardPage)
- `/p/:id` — participant view, one question at a time (PlayPage)
- `/p/:id/result/:submissionId` — own result (ResultPage)

### Data flow

- All persistence goes through the `Storage` contract via the `storage`
  singleton in `storage/index.ts`. UI never talks to Firestore directly.
- **Drafts** live in localStorage. **Published** walks are mirrored to Firestore
  by id so a shared link/QR works across devices. **Signed-in** users get every
  save (drafts included) stamped with `ownerId` + `updatedAt` and written to both
  local and cloud; `listWalks` merges the owner's cloud walks in.
- A published walk freezes a `publishedSnapshot` of its content. **Participants
  see the snapshot, not the live draft** — edits stay invisible until re-publish.
- Participant progress autosaves separately in localStorage (`storage/progress.ts`),
  never to the cloud.

### Firestore collections

| Collection | Doc shape | Rules (`firestore.rules`) |
|---|---|---|
| `walks/{id}` | `Walk` (see `types.ts`): title, settings, questions[], status, `publishedSnapshot?`, `ownerId?`, `updatedAt?` | read: anyone. create: anyone, but any `ownerId` must equal caller uid. update/delete: unowned → world-writable; owned → owner-only. Adoption (unowned → my uid) allowed. |
| `submissions/{id}` | `Submission`: walkId, participantName, answers, score, total, finishedAt | read + create: anyone. update/delete: never (append-only). |

## Conventions

- **Naming:** PascalCase components/pages, camelCase functions/vars, `Page`
  suffix for routes, `Sheet` suffix for modal/bottom-sheet components.
- **State:** local component state + a small `AuthProvider` context. No Redux.
- **Styling:** hand-written CSS in `src/styles.css` + utility-ish classnames
  (`btn`, `pill`, `card`, `row`). No Tailwind, no shadcn in this repo.
- **Persistence:** add backend behaviour only behind the `Storage` interface;
  switch implementations in `storage/index.ts` only.
- **UI copy:** Swedish.
- **Commits:** concise, imperative, Conventional-Commits-style prefixes
  (`feat:`, `fix:`, `test:`, `chore:`, `ci:`, `docs:`).

## Gotchas / non-obvious decisions

- **HashRouter on purpose.** GitHub Pages has no server-side rewrites; hash URLs
  survive cold starts and shared deep links. Don't switch to BrowserRouter.
- **`base: /promenadquiz/`** in `vite.config.ts` — asset paths break if changed
  without matching the Pages subpath.
- **No Firebase config ⇒ local-only.** `firebase.ts` exports `db = null` when
  `VITE_FIREBASE_*` is absent; `HybridStorage` degrades to pure localStorage and
  nothing crashes. Tests rely on this.
- **Participants read `publishedSnapshot`**, not the draft. When changing the
  editor, preserve the publish→snapshot freeze or you'll leak unpublished edits.
- **Spark plan / cost.** Keep Firestore reads cheap and never hit prod in tests —
  integration tests use the **emulator** with project `demo-test`.
- **`storage/index.ts` is the single backend swap point** (deep-module design).
- **Known quirks found while testing (NOT yet fixed):**
  1. `HybridStorage.ts` constructor: `deps.remote ?? (db ? new FirestoreStorage(db) : null)`
     — `??` collapses an explicit `remote: null`, so passing `null` does **not**
     disable the cloud layer when Firebase is configured. Tests mock `../firebase`
     (`db: null`) to exercise the offline branches.
  2. PlayPage's `Ditt namn` `<label>` has no `htmlFor`/id association (a11y).
  3. PreviewPage ignores `settings.showQuestionText` — it always renders the
     question text, unlike PlayPage.

## Definition of Done (any change)

1. `npm run verify` is green (lint, types, coverage ≥ 60%, integration).
2. New/changed behaviour has tests (see `TESTING.md` for where each layer lives).
3. No app behaviour changed silently — if a test surfaces a bug, fix it in its
   own commit or list it; don't paper over it in the test.
4. Docs updated in the same commit when behaviour, commands, or data shape change.
5. Conventional commit message; small, reviewable commits.

## Testing

See **`TESTING.md`** for the strategy, what each suite covers, and how to add a
test. Short version: pure logic → `*.test.ts`; components/pages → `*.test.tsx`
(Testing Library + module-mock the `storage` singleton + `MemoryRouter`);
Firestore rules + adapter → `*.emulator.test.ts` (run via `test:integration`).
