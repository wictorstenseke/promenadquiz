# QR Poster Print Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a print option that produces a single A4 QR poster (walk name, large QR, scan prompt, and a typeable join-URL + code fallback) so arriving participants can scan straight into a walk.

**Architecture:** Mirror the existing print pattern — a print-only React block (`QrPoster`) that lives in the DOM always and is shown only when `body.print-qr` is set. `PrintMenu` gains a third item that toggles that class around `window.print()`. URL building is extracted into a small shared helper so `SharePage`'s on-screen QR and the poster's QR stay in sync. The QR-poster option is always available; questions/talonger options remain gated on `walk.settings.printable`.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + jsdom, `qrcode.react` (`QRCodeSVG`), CSS `@media print` in `src/styles.css`.

---

## File Structure

- **Create** `src/lib/shareUrl.ts` — URL helpers: `playUrl(walkId)` (full play link), `cleanJoinUrl(host, base)` (pure scheme-less host+base), `joinDisplayUrl()` (reads globals → clean display URL).
- **Create** `src/lib/shareUrl.test.ts` — unit tests for the pure helpers.
- **Create** `src/components/QrPoster.tsx` — print-only poster markup.
- **Create** `src/components/QrPoster.test.tsx` — render tests (SSR markup).
- **Modify** `src/pages/SharePage.tsx` — use `playUrl`; pass `printable` to `PrintMenu`; always render `<QrPoster>`.
- **Modify** `src/components/PrintMenu.tsx` — add `printable` prop + QR-affisch item + `print-qr` toggle; clear both print classes on `afterprint`.
- **Modify** `src/pages/PreviewPage.tsx` — pass `printable` to `PrintMenu`; always render `<QrPoster>`.
- **Modify** `src/styles.css` — `.qr-only` default-hidden, `body.print-qr` swap rules, and poster `@media print` layout.

---

## Task 1: Shared URL helper

**Files:**
- Create: `src/lib/shareUrl.ts`
- Test: `src/lib/shareUrl.test.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/shareUrl.test.ts
import { describe, expect, test } from "vitest";
import { cleanJoinUrl, playUrl } from "./shareUrl";

describe("cleanJoinUrl", () => {
  test("joins host + base and strips scheme and trailing slash", () => {
    expect(cleanJoinUrl("wictorstenseke.github.io", "/promenadquiz/")).toBe(
      "wictorstenseke.github.io/promenadquiz",
    );
  });

  test("collapses a bare root base to just the host", () => {
    expect(cleanJoinUrl("localhost:3000", "/")).toBe("localhost:3000");
  });
});

describe("playUrl", () => {
  test("builds a hash play link ending in the walk id", () => {
    // jsdom origin + Vite BASE_URL ("/") + hash route.
    expect(playUrl("abc123")).toContain("#/p/abc123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/shareUrl.test.ts`
Expected: FAIL — "Failed to resolve import './shareUrl'" / functions not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/shareUrl.ts

/** Full participant play link. HashRouter + GitHub Pages base path:
 *  origin + base + "#/p/:id" (same shape SharePage has always used). */
export function playUrl(walkId: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/p/${walkId}`;
}

/** Host + base path with the scheme dropped and any trailing slash removed —
 *  a short, typeable address for the print fallback. Pure for testability. */
export function cleanJoinUrl(host: string, base: string): string {
  return `${host}${base}`.replace(/\/+$/, "");
}

/** Clean join address for the current deployment, e.g.
 *  "wictorstenseke.github.io/promenadquiz". */
export function joinDisplayUrl(): string {
  return cleanJoinUrl(window.location.host, import.meta.env.BASE_URL);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/shareUrl.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareUrl.ts src/lib/shareUrl.test.ts
git commit -m "feat: add shared share-url helpers (playUrl, joinDisplayUrl)"
```

---

## Task 2: QrPoster component

**Files:**
- Create: `src/components/QrPoster.tsx`
- Test: `src/components/QrPoster.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/QrPoster.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { QrPoster } from "./QrPoster";
import { newQuestion } from "../lib/factory";
import type { Walk } from "../types";

function makeWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: "k4m9px",
    title: "Hösttipset",
    status: "draft",
    createdAt: 0,
    settings: {
      showQuestionText: true,
      printable: true,
      includeTiebreaker: true,
      showResults: true,
    },
    questions: [newQuestion(1), newQuestion(2)],
    ...overrides,
  };
}

describe("QrPoster", () => {
  test("renders the walk title and the join code", () => {
    const html = renderToStaticMarkup(<QrPoster walk={makeWalk()} />);
    expect(html).toContain("Hösttipset");
    expect(html).toContain("k4m9px");
  });

  test("falls back to a placeholder title when untitled", () => {
    const html = renderToStaticMarkup(
      <QrPoster walk={makeWalk({ title: "" })} />,
    );
    expect(html).toContain("Namnlös promenad");
  });

  test("renders a QR svg and the scan prompt", () => {
    const html = renderToStaticMarkup(<QrPoster walk={makeWalk()} />);
    expect(html).toContain("<svg");
    expect(html).toContain("Skanna QR-koden för att starta");
  });

  test("shows both fallback section labels", () => {
    const html = renderToStaticMarkup(<QrPoster walk={makeWalk()} />);
    expect(html).toContain("Gå till:");
    expect(html).toContain("och ange kod:");
  });

  test("uses the published snapshot title when present", () => {
    const walk = makeWalk({
      title: "Utkast",
      publishedSnapshot: {
        title: "Publicerad titel",
        settings: {
          showQuestionText: true,
          printable: true,
          includeTiebreaker: false,
          showResults: true,
        },
        questions: [newQuestion(1)],
      },
    });
    const html = renderToStaticMarkup(<QrPoster walk={walk} />);
    expect(html).toContain("Publicerad titel");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/QrPoster.test.tsx`
Expected: FAIL — "Failed to resolve import './QrPoster'".

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/QrPoster.tsx
import { QRCodeSVG } from "qrcode.react";
import { liveContent } from "../lib/walk";
import { joinDisplayUrl, playUrl } from "../lib/shareUrl";
import type { Walk } from "../types";

/** Print-only A4 poster: walk name, a large QR that opens the play page, a scan
 *  prompt, and a typeable fallback (join address + code) for anyone who can't
 *  scan. Hidden on screen; shown only when the body carries `print-qr` (see
 *  styles.css and PrintMenu). The QR encodes the same play URL as SharePage via
 *  the shared playUrl helper, and the code is the walk id. */
export function QrPoster({ walk }: { walk: Walk }) {
  const live = liveContent(walk);
  const url = playUrl(walk.id);

  return (
    <div className="qr-only">
      <section className="qr-poster">
        <h1 className="qr-poster-title">{live.title || "Namnlös promenad"}</h1>
        <div className="qr-poster-code">
          <QRCodeSVG value={url} size={280} bgColor="#ffffff" fgColor="#000000" />
        </div>
        <p className="qr-poster-prompt">Skanna QR-koden för att starta</p>
        <div className="qr-poster-fallback">
          <div className="qr-poster-fallrow">
            <span className="qr-poster-falllabel">Gå till:</span>
            <span className="qr-poster-fallurl">{joinDisplayUrl()}</span>
          </div>
          <div className="qr-poster-fallrow">
            <span className="qr-poster-falllabel">och ange kod:</span>
            <span className="qr-poster-fallcode">{walk.id}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/QrPoster.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/QrPoster.tsx src/components/QrPoster.test.tsx
git commit -m "feat: add QrPoster print-only component"
```

---

## Task 3: PrintMenu — QR-affisch item + print-qr toggle

**Files:**
- Modify: `src/components/PrintMenu.tsx`

Note: `PrintMenu` currently renders only when `printable` is true (the page gates it). After this task the page always renders it and passes `printable` as a prop; the questions/talonger items render only when `printable`, the QR-affisch item always.

- [ ] **Step 1: Add the `printable` prop and signature**

Replace the function signature line:

```tsx
export function PrintMenu() {
```

with:

```tsx
export function PrintMenu({ printable }: { printable: boolean }) {
```

- [ ] **Step 2: Clear both print classes on afterprint**

Replace this effect:

```tsx
  useEffect(() => {
    const clear = () => document.body.classList.remove("print-talonger");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);
```

with:

```tsx
  useEffect(() => {
    const clear = () =>
      document.body.classList.remove("print-talonger", "print-qr");
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);
```

- [ ] **Step 3: Add the printQr handler**

After the existing `printTalonger` function, add:

```tsx
  function printQr() {
    setOpen(false);
    document.body.classList.add("print-qr");
    window.print();
  }
```

- [ ] **Step 4: Gate the question/talonger items and add the QR item**

Replace the menu popup block:

```tsx
      {open && (
        <div className="print-menu-pop" role="menu">
          <button className="menu-item" role="menuitem" onClick={printQuestions}>
            Skriv ut frågor
          </button>
          <button className="menu-item" role="menuitem" onClick={printTalonger}>
            Skriv ut talonger
          </button>
        </div>
      )}
```

with:

```tsx
      {open && (
        <div className="print-menu-pop" role="menu">
          {printable && (
            <button className="menu-item" role="menuitem" onClick={printQuestions}>
              Skriv ut frågor
            </button>
          )}
          {printable && (
            <button className="menu-item" role="menuitem" onClick={printTalonger}>
              Skriv ut talonger
            </button>
          )}
          <button className="menu-item" role="menuitem" onClick={printQr}>
            Skriv ut QR-affisch
          </button>
        </div>
      )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: PASS (no errors). Note: `SharePage.tsx`/`PreviewPage.tsx` still pass no prop to `<PrintMenu>` — they are fixed in Tasks 5–6. If `tsc` reports a missing `printable` prop there, that is expected until those tasks land; proceed.

- [ ] **Step 6: Commit**

```bash
git add src/components/PrintMenu.tsx
git commit -m "feat: add QR-affisch item and print-qr toggle to PrintMenu"
```

---

## Task 4: Poster print styles

**Files:**
- Modify: `src/styles.css`

The `@media print { … }` block spans lines 1276–1437 (closes just after `.talong-tie`). Default-hidden `.qr-only` and the `body.print-qr` swap go *inside* that block; insert them right after the existing talonger swap rules.

- [ ] **Step 1: Add the qr-only default + swap rules**

Find this existing block (the talonger swap):

```css
  body.print-talonger .print-only {
    display: none;
  }
  body.print-talonger .talong-only {
    display: block;
  }
```

Immediately after it, add:

```css
  /* QR poster: hidden on the default path; its button toggles body.print-qr to
     swap it in and hide both the question sheets and the talonger. */
  .qr-only {
    display: none;
  }
  body.print-qr .print-only,
  body.print-qr .talong-only {
    display: none;
  }
  body.print-qr .qr-only {
    display: block;
  }
```

- [ ] **Step 2: Add the poster layout**

Find the closing of the talonger styles inside the print block:

```css
  .talong-tie {
    margin-top: 5mm;
    font-family: var(--mono);
    font-size: 10pt;
    display: flex;
    align-items: baseline;
    gap: 3mm;
  }
}
```

Insert the poster rules *before* that final `}` (i.e. after the `.talong-tie` rule, still inside `@media print`):

```css
  /* Single portrait A4 poster, vertically centered. min-height (not height)
     keeps iOS Safari — which ignores @page size — from spilling to page 2. */
  .qr-poster {
    page: auto;
    min-height: calc(247mm - 36mm);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #000;
    break-inside: avoid;
  }
  .qr-poster-title {
    font-family: var(--display);
    font-size: 40pt;
    line-height: 1.05;
    margin: 0 0 14mm;
  }
  .qr-poster-code {
    line-height: 0;
  }
  .qr-poster-prompt {
    font-family: var(--display);
    font-size: 22pt;
    margin: 10mm 0 0;
  }
  .qr-poster-fallback {
    margin-top: 16mm;
    display: grid;
    gap: 4mm;
  }
  .qr-poster-fallrow {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4mm;
  }
  .qr-poster-falllabel {
    font-family: var(--mono);
    font-size: 12pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .qr-poster-fallurl {
    font-family: var(--mono);
    font-size: 14pt;
  }
  .qr-poster-fallcode {
    font-family: var(--mono);
    font-size: 24pt;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
```

- [ ] **Step 3: Build to verify CSS is valid and bundles**

Run: `npx vite build`
Expected: PASS — build completes, no CSS syntax error.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat: add print styles for the QR poster"
```

---

## Task 5: Wire QrPoster + PrintMenu into SharePage

**Files:**
- Modify: `src/pages/SharePage.tsx`

- [ ] **Step 1: Add imports**

After the existing `import { PrintMenu } from "../components/PrintMenu";` line, add:

```tsx
import { QrPoster } from "../components/QrPoster";
import { playUrl } from "../lib/shareUrl";
```

- [ ] **Step 2: Use the shared playUrl helper**

Replace:

```tsx
  // HashRouter + GitHub Pages base path: link must be origin + base + "#/p/:id".
  const url = `${window.location.origin}${import.meta.env.BASE_URL}#/p/${walk.id}`;
```

with:

```tsx
  // HashRouter + GitHub Pages base path: origin + base + "#/p/:id".
  const url = playUrl(walk.id);
```

- [ ] **Step 3: Always render PrintMenu with the printable prop**

Replace:

```tsx
          {walk.settings.printable && <PrintMenu />}
```

with:

```tsx
          <PrintMenu printable={walk.settings.printable} />
```

- [ ] **Step 4: Always render the poster; keep sheets gated**

Replace:

```tsx
    {walk.settings.printable && <PrintSheets walk={walk} />}
    {walk.settings.printable && <TalongSheets walk={walk} />}
    </>
```

with:

```tsx
    {walk.settings.printable && <PrintSheets walk={walk} />}
    {walk.settings.printable && <TalongSheets walk={walk} />}
    <QrPoster walk={walk} />
    </>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SharePage.tsx
git commit -m "feat: render QR poster on SharePage; always show print menu"
```

---

## Task 6: Wire QrPoster + PrintMenu into PreviewPage

**Files:**
- Modify: `src/pages/PreviewPage.tsx`

- [ ] **Step 1: Add the QrPoster import**

After `import { PrintMenu } from "../components/PrintMenu";`, add:

```tsx
import { QrPoster } from "../components/QrPoster";
```

- [ ] **Step 2: Always render PrintMenu with the printable prop**

Replace:

```tsx
        {walk.settings.printable && <PrintMenu />}
```

with:

```tsx
        <PrintMenu printable={walk.settings.printable} />
```

- [ ] **Step 3: Always render the poster; keep sheets gated**

Replace:

```tsx
    {walk.settings.printable && <PrintSheets walk={walk} />}
    {walk.settings.printable && <TalongSheets walk={walk} />}
    </>
```

with:

```tsx
    {walk.settings.printable && <PrintSheets walk={walk} />}
    {walk.settings.printable && <TalongSheets walk={walk} />}
    <QrPoster walk={walk} />
    </>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PreviewPage.tsx
git commit -m "feat: render QR poster on PreviewPage; always show print menu"
```

---

## Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all suites green, including the new `shareUrl` and `QrPoster` tests.

- [ ] **Step 2: Type-check + production build**

Run: `npm run build`
Expected: PASS (`tsc -b` clean, `vite build` succeeds).

- [ ] **Step 3: Manual print check (dev server)**

Run: `npm run dev`, open a walk's Share page.
- With **printable ON**: open "Skriv ut" → three items (frågor, talonger, QR-affisch). Click QR-affisch → print preview shows ONE A4 page: walk name, large QR, "Skanna QR-koden för att starta", and the "Gå till:" + "och ange kod:" fallback rows. The question/talonger sheets must NOT appear on that preview.
- Set **printable OFF** in the editor, return to Share: "Skriv ut" still shows, with only the QR-affisch item; it prints the poster only.
- After closing print, trigger "Skriv ut frågor" again (printable ON) → only question sheets print (confirms `print-qr` was cleared on `afterprint`).
- Scan the printed/preview QR with a phone → opens the correct play page.
- Repeat the QR-affisch check on the Preview page.

- [ ] **Step 4: Final commit (only if Step 1–2 surfaced fixes)**

```bash
git add -A
git commit -m "fix: address QR poster verification findings"
```

---

## Self-Review Notes

- **Spec coverage:** A4 poster (Task 2/4), walk name + fallback title (Task 2), large QR encoding play URL (Task 2 via `playUrl`), scan prompt (Task 2), two fallback sections join-URL + code (Task 2, `joinDisplayUrl` + `walk.id`), 3rd menu item always available (Task 3), printable-gated questions/talonger (Tasks 3/5/6), shared URL helper keeping SharePage QR in sync (Tasks 1/5), CSS swap + layout (Task 4). All covered.
- **Type consistency:** `PrintMenu` prop `printable: boolean` defined Task 3, supplied Tasks 5–6. `QrPoster` prop `{ walk: Walk }` consistent across tasks. Helpers `playUrl`/`cleanJoinUrl`/`joinDisplayUrl` named identically in definition (Task 1) and use (Tasks 2/5).
- **Ordering note:** Task 3 changes `PrintMenu`'s signature before Tasks 5–6 update its call sites, so `tsc` between Task 3 and Task 5 may flag the call sites — called out explicitly in Task 3 Step 5.
