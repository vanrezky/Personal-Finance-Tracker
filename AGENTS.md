# AGENTS.md — Moni (Personal Finance Tracker)

## Quick start

```bash
cp .env.example .env   # fill Firebase credentials + Firestore database ID
npm install
npm run dev            # vite --port=3000 --host=0.0.0.0
npm run build          # vite build
npm run lint           # tsc --noEmit (type-check only, no linter)
```

## Architecture

- **SPA** — no router; tab state managed in `App.tsx` via `useState` (dashboard, history, reports, settings, shopping, categories).
- **Firestore** — custom database ID (not `(default)`), set via `VITE_FIREBASE_FIRESTORE_DATABASE_ID`.
  - `users/{uid}`, `households/{householdId}`, `households/{householdId}/transactions/{transactionId}`, `households/{householdId}/categories/{categoryId}`, `households/{householdId}/shoppingMonths/{monthKey}/items/{itemId}`
  - Auth via Google + Email/Password.
- **API routes** (`api/`) — Vercel serverless functions. Manually verify Firebase ID tokens (no Admin SDK). In-memory rate limiting.
  - `api/scan-receipt.ts` — POST, gemini-2.5-flash, max 12 req/min, image ≤2MB base64.
  - `api/shopping-ai.ts` — POST, gemini-1.5-flash, max 20 req/min.
  - `GEMINI_API_KEY` is server-side only (set in Vercel env, not `VITE_`-prefixed).
- **PWA** — `vite-plugin-pwa` with Workbox auto-update. SW registered in `src/main.tsx`.
- **Tailwind v4** — import-based (`@import "tailwindcss"`), no config file. Utility `cn()` via `clsx` + `tailwind-merge`.
- **Path alias** — `@/*` maps to root `./*` (not `./src/*`).

## Key conventions

- Dev server on port 3000 bound to 0.0.0.0.
- HMR can be disabled via `DISABLE_HMR=true` env var.
- `.env*` gitignored (except `.env.example`).
- No test framework or test scripts exist.
- Firebase Firestore functions are re-exported from `src/firebase.ts`.
- Currency formatting uses Indonesian locale (`id-ID`, IDR).
- Error handling: `ErrorBoundary` component + `handleFirestoreError()` helper.
