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

## Backend (Firestore)

POC-modell, inga konton:

- **Utkast** sparas bara i `localStorage` på skaparens enhet.
- **Publicerade** promenader speglas till Firestore → andra enheter kan hämta
  via id (QR/länk fungerar mellan enheter).
- **Bidrag & topplista** ligger i Firestore → gemensam topplista. Deltagare
  anger bara namn; namnet valideras mjukt mot dubbletter per promenad.

Allt detta lever i `HybridStorage` (`src/storage/`). Utan Firebase-config kör
appen ren `localStorage` — inget kraschar, delning mellan enheter är bara av.

⚠️ Reglerna (`firestore.rules`) är öppna: vem som helst med ett id kan skriva
över en publicerad promenad. Medveten POC-risk — lägg till ägar-skydd (Firebase
Auth + `ownerId`) före skarp användning.

### Sätt upp Firebase

1. Skapa ett projekt i [Firebase Console](https://console.firebase.google.com/)
   och en **Web app**. Aktivera **Firestore** (production mode).
2. Kopiera webb-konfigen till `.env.local` (se `.env.example`).
3. Publicera reglerna: `firebase deploy --only firestore:rules`.
4. För Pages-deploy: lägg samma `VITE_FIREBASE_*` som **repo secrets** (Actions
   bygger med dem, se `.github/workflows/deploy.yml`).

## Medvetet utanför nuvarande version

Utslagsfrågans avgörandelogik (bara svaret sparas), inloggning/ägar-skydd,
bilder i frågor.

## Tester

Poängberäkning, lagringskontraktet (återanvändbart mot Firebase senare) och
progress-autosave. Kör `npm test`.
