# QR Poster Print Option — Design

**Date:** 2026-06-18
**Status:** Approved

## Goal

Add a print option that produces a single A4 poster with the walk's QR code, so
participants arriving at a tipspromenad can scan it and jump straight into the
walk. The poster also shows a typeable fallback (join URL + code) for anyone who
can't scan.

## Context

The app already has:

- **Print system** — `PrintMenu.tsx` dropdown with two options ("Skriv ut
  frågor", "Skriv ut talonger"). Print outputs (`PrintSheets`, `TalongSheets`)
  live in the DOM always; CSS classes toggle which one prints. Talonger uses a
  `print-talonger` body class added before `window.print()` and removed on the
  `afterprint` event.
- **QR library** — `qrcode.react` (`QRCodeSVG`), currently used only on
  `SharePage` UI, not in print.
- **Join-by-code flow** — `JoinSheet` reached from HomePage "Gå med via kod".
  `walk.id` IS the 6-char join code (alphabet `23456789abcdefghjkmnpqrstuvwxyz`,
  no ambiguous chars), e.g. `k4m9px`.
- **URLs** — play link is
  `${window.location.origin}${import.meta.env.BASE_URL}#/p/${walk.id}`.
  Production root: `https://wictorstenseke.github.io/promenadquiz/`.

## Design

### Poster content (A4 portrait, one page)

1. **Walk name** — large, top. `walk.title`, fallback "Namnlös promenad".
2. **Large QR** — ~280px, centered. Encodes the **direct play URL**
   (`…/promenadquiz/#/p/{id}`) so scanning lands the participant straight in the
   walk.
3. **Scan prompt** — "Skanna QR-koden för att starta".
4. **Fallback, two sections** (for those who can't scan):
   - Section 1 — label "Gå till:" + clean root URL
     `wictorstenseke.github.io/promenadquiz` (strip `https://`, strip the
     `#/p/{id}` hash and trailing slash → bare host+base).
   - Section 2 — label "och ange kod:" + the code `walk.id` rendered large,
     monospace, prominent.

### Components & files

- **`src/components/QrPoster.tsx`** (new) — renders the poster markup inside a
  `.qr-only` block (hidden on screen, shown only when body has `print-qr`).
  Mirrors the `TalongSheets` structure. Takes the `walk` (or live content) as
  props, same as the other print components.
- **`src/components/PrintMenu.tsx`** — add a third option "Skriv ut
  QR-affisch". On click: add `print-qr` body class, `window.print()`, remove
  class on `afterprint` (same pattern as `print-talonger`).
  - The questions/talonger options remain gated on `walk.settings.printable`.
  - The QR-affisch option is **always shown** (even when printable is OFF),
    because QR/sharing is meaningful regardless of paper questions. If printable
    is OFF the menu still renders with just the QR-affisch option.
- **`src/pages/SharePage.tsx`** and **`src/pages/PreviewPage.tsx`** — render
  `<QrPoster>` (always, alongside the existing print blocks) so it's present in
  the DOM for printing.
- **`src/styles.css`** — add `.qr-only` (screen-hidden), `@media print` layout
  for the poster, and the `body.print-qr` swap rule (show `.qr-only`, hide
  `.print-only` and `.talong-only`).

### Shared URL helper

Extract URL building out of `SharePage` into a small shared helper (e.g.
`src/lib/shareUrl.ts`) exposing:

- `playUrl(walk)` → full direct play link (used by QR + existing SharePage QR).
- `joinDisplayUrl()` → clean root host+base, no scheme/hash (poster fallback).

`SharePage` is refactored to use `playUrl` so its QR and the poster's QR stay in
sync.

## Out of scope (YAGNI)

- No new short-code/alias system — reuse `walk.id` as the code.
- No multi-poster-per-page or card variants — single full A4 poster only.
- No QR on the existing question sheets.

## Testing

- Visual: print-preview SharePage and PreviewPage, trigger "Skriv ut
  QR-affisch", confirm only the poster prints (one A4 page) with name, QR, prompt
  and both fallback sections.
- Confirm scanning the printed QR opens the correct play page.
- Confirm questions/talonger options still gated on `printable`; QR-affisch
  shows with printable OFF.
- Confirm clean URL has no `https://` / hash, and code matches `walk.id`.
