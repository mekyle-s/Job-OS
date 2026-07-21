# E2E verification scripts

Standalone Playwright/Node scripts used by the 2026-07-20/21 audit sessions.
They are not wired into `npm test` (they need a running server and, for the
matching one, real OpenAI calls).

## Setup

```bash
npm run build && npm run start   # serve production build on :3000
# in a separate scratch dir (or here): npm i playwright && npx playwright install chromium
```

## Scripts

- **`app-e2e.mjs`** — 24 checks against `localhost:3000`: sign-up/sign-in/out,
  criteria save + persistence, manual evidence, queue/jobs pages, upload
  validation (bad type / corrupt PDF), cron + API auth guards, dark-mode
  screenshots. No LLM cost beyond one evidence embedding.
- **`matching-e2e.mjs`** — the full user journey: generates a resume PDF via
  Chromium, uploads it, saves criteria (fires the poll), waits for
  poll → extraction → auto-match, asserts the queue shows function-matched
  roles with real X/Y coverage. Makes REAL OpenAI calls — start the server
  with small caps to keep it to a few cents:
  `MAX_EXTRACTIONS_PER_POLL=2 MAX_EVALUATIONS_PER_RUN=6 MAX_AUTO_MATCH_JOBS=2 npm run start`
- **`prod-smoke.mjs`** — read-only production smoke test (health, pages,
  cron/API auth rejections). Safe to run anytime: `node prod-smoke.mjs`.
