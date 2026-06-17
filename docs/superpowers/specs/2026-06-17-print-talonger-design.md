# Print talonger (answer slips) — design

**Date:** 2026-06-17
**Status:** Approved, ready for implementation plan

## Problem

Organisers can print station signs (one question per A4 page) via "Skriv ut frågor".
Participants who don't use the app need a paper answer slip ("talong") to mark 1/X/2 per
question with a pen. None exists today.

## Goal

Add a printable landscape answer slip whose numbered cells always match the walk's real
question count, with an utslagsfråga (tiebreaker) field only when the walk includes one.

## Scope

- New `TalongSheets` component producing the printable slips.
- Print button on SharePage becomes a small dropdown: "Skriv ut" ▾ → "Skriv ut frågor" /
  "Skriv ut talonger". Same change on PreviewPage for consistency.
- New `ChevronIcon`.
- Print CSS for landscape talonger + view toggling.

Out of scope: type changes, data model changes, per-participant counts (user prints the
single page and picks copies in the browser print dialog).

## Layout

One landscape A4 page holding **2 talonger side by side** (paper-efficient). Each talong:

- "Namn: __________" field at top.
- One numbered cell per question, e.g. `1 [ 1  X  2 ]`, for the player to circle/mark.
  Cells are driven by `liveContent(walk).questions` (published snapshot, not draft), so the
  count always matches what players actually answer. Questions sorted by `stationNumber`.
- 1/X/2 always shown regardless of `settings.showQuestionText` (it's an answer card, not a
  question sheet).
- "Utslagsfråga: __________" line at the bottom, rendered **only** when
  `settings.includeTiebreaker` is true.

Mockup:

```
LANDSCAPE A4 — 2 talonger
┌─────────────────┬─────────────────┐
│ Namn: ________  │ Namn: ________  │
│  1 [1 X 2]      │  1 [1 X 2]      │
│  2 [1 X 2]      │  2 [1 X 2]      │
│  3 [1 X 2] ...  │  3 [1 X 2] ...  │
│ Utslag: ______  │ Utslag: ______  │
└─────────────────┴─────────────────┘
```

## Component: `TalongSheets`

`src/components/TalongSheets.tsx`, sibling to `PrintSheets`.

```
export function TalongSheets({ walk }: { walk: Walk })
```

- `const live = liveContent(walk)` — same source-of-truth call as `PrintSheets`.
- Renders a `.talong-only` wrapper → `.talong-page` (the landscape page) → two
  `.talong` slips. Both slips render identical content.
- Each slip maps sorted questions to `.talong-row` cells and conditionally renders the
  tiebreaker line.

Hidden on screen and during the "frågor" print path; shown only when printing talonger
(see CSS toggle).

## Print trigger: dropdown

Current button:

```
<button className="btn ghost sm" onClick={() => window.print()}>
  <PrinterIcon /> Skriv ut frågor
</button>
```

Becomes a dropdown:

- Trigger button: `<PrinterIcon /> Skriv ut <ChevronIcon />`, toggles a local `open` state.
- Popover (anchored under the button) with two `.menu-item`s reusing existing menu styles:
  - **Skriv ut frågor** → `printQuestions()`
  - **Skriv ut talonger** → `printTalonger()`
- Closes on item select and on click-outside / blur.

Print handlers:

```
function printQuestions() { window.print(); }              // unchanged behavior

function printTalonger() {
  document.body.classList.add("print-talonger");
  window.print();
}
// remove class on afterprint:
useEffect(() => {
  const clear = () => document.body.classList.remove("print-talonger");
  window.addEventListener("afterprint", clear);
  return () => window.removeEventListener("afterprint", clear);
}, []);
```

Both SharePage and PreviewPage already gate print UI behind `walk.settings.printable` and
both render `<PrintSheets>`. They will additionally render `<TalongSheets>` and use the new
dropdown. To avoid duplicating the dropdown + handlers across both pages, extract a small
shared `PrintMenu` component (`src/components/PrintMenu.tsx`) that owns the button, popover,
and print handlers; each page renders `<PrintMenu walk={walk} />` plus the two print-only
sheet components.

## CSS

In `src/styles.css`:

- Screen + default: `.talong-only { display: none }`.
- `@media print` additions:
  - Default print path (no body class): keep `.print-only { display: block }`,
    `.talong-only { display: none }` (current behavior preserved).
  - `body.print-talonger`: `.print-only { display: none !important }`,
    `.talong-only { display: block }`.
  - `@page talong { size: A4 landscape; margin: 12mm; }`
  - `.talong-page { page: talong; display: flex; gap: 10mm; ... }` — two `.talong`
    columns, `break-after: page` not needed (single page).
  - `.talong` — column with border, name field, rows, tiebreaker line. Black on white,
    mono/display fonts consistent with existing print styles.
  - `.talong-row` — number + `[ 1  X  2 ]` cells with enough spacing to circle.

Named-page landscape (`@page talong`) is solid in Chromium; weaker in Safari. Acceptable for
this app. Fallback if a browser ignores the named-page orientation: content still prints
upright in portrait (degraded but usable); not blocking v1.

## Files touched

- `src/components/TalongSheets.tsx` — new.
- `src/components/PrintMenu.tsx` — new (shared dropdown + print handlers).
- `src/components/Icons.tsx` — add `ChevronIcon`.
- `src/pages/SharePage.tsx` — swap print button for `<PrintMenu>`, render `<TalongSheets>`.
- `src/pages/PreviewPage.tsx` — same.
- `src/styles.css` — talonger print styles + view toggle.

## Testing

- Unit: `TalongSheets` renders N rows for N questions; renders tiebreaker line only when
  `includeTiebreaker`; uses published snapshot via `liveContent`.
- Manual: print preview on SharePage → "Skriv ut talonger" shows landscape, 2 slips,
  correct numbering; "Skriv ut frågor" still portrait one-per-page. Verify with and without
  tiebreaker, and that `print-talonger` class clears after printing.
```
