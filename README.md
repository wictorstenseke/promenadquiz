# Promenadquiz — Tipspromenad-app

Digital tipspromenad. Admin bygger frågor i 1 · X · 2-format, kör digitalt
och/eller skriver ut en fråga per A4, och delar via länk + QR. Deltagare svarar
en fråga i taget. Allt autosparas i localStorage.

**Live:** https://wictorstenseke.github.io/promenadquiz/

## Stack

Vite + React + TypeScript + React Router (HashRouter).

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktion (tsc + vite)
npm test         # vitest
```

## Arkitektur

| Modul | Roll |
|---|---|
| `src/storage/Storage.ts` | Stabilt persistens-kontrakt (deep module). |
| `src/storage/LocalStorageStorage.ts` | v1-implementation. |
| `src/storage/index.ts` | **Enda stället** backend väljs — byt hit till Firebase. |
| `src/storage/progress.ts` | Deltagarens pågående svar, alltid i localStorage. |
| `src/lib/scoring.ts` | Ren poängfunktion, sidoeffektfri. |

### Routes

- `/` — admins lista + skapa
- `/walk/:id/edit` — bygg & publicera (autospar)
- `/walk/:id/preview` — förhandsgranskning
- `/walk/:id/share` — länk + QR
- `/walk/:id/leaderboard` — topplista
- `/p/:id` — deltagarvy (en fråga i taget, pilar, autospar)
- `/p/:id/result/:submissionId` — egen poäng

Utskrift (en fråga per A4, `@media print`) sker via utskriftsmenyn på
share-sidan, inte en egen route.

## Deploy

GitHub Pages via GitHub Actions. Varje push till `main` bygger och publicerar
automatiskt (`.github/workflows/deploy.yml`).

- Vite `base` är satt till `/promenadquiz/` (projektets subpath).
- HashRouter används så att djuplänkar och delade QR-länkar överlever en
  kallstart på Pages, som saknar server-rewrites.

Manuell körning: `gh workflow run deploy.yml`.

## Medvetet utanför nuvarande version

Cross-device-delning & gemensam topplista (kräver Firebase), utslagsfrågans
avgörandelogik (bara svaret sparas), inloggning, bilder i frågor.

## Tester

Poängberäkning, lagringskontraktet (återanvändbart mot Firebase senare) och
progress-autosave. Kör `npm test`.
