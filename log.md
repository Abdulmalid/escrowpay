# EscrowPay Global — Decision & Event Log

Newest entries first. Dates in UTC.

## 2026-11-06 — P0 build complete, verification green (except HTTP smoke)

- Implemented the full P0 scope: 14 UI pages, 25+ API routes, provider
  abstraction (demo + Blaaiz), double-entry ledger, webhook receivers,
  Guardian (LLM + heuristic), indicative FX desk, disputes, demo seed.
- Verification: `tsc --noEmit` clean, `eslint` clean, Vitest 33/33 green,
  `next build` green. Store-level happy-path test covers fund → confirm →
  submit → approve → release → settle with a balanced ledger.
- Environment limitation: the sandbox denies `listen()` (EACCES on
  127.0.0.1:3000 and 0.0.0.0:3100), so `npm run dev` and the HTTP smoke
  script could not run here. `scripts/demo-smoke.ps1` (22 checks) ships
  for the user to run where binding works. Honest status recorded in
  task.md; no claim of a live smoke run.
- Fixes during verification: added missing `target: ES2022` to tsconfig
  (default ES5 broke bigint/Map iteration); cleared stale
  `tsconfig.tsbuildinfo` that replayed old diagnostics; fixed a
  `Map.set` arity bug in IdempotencyLedger; typed the submit ledger;
  restricted public signup to client/freelancer roles.
- Deferred to user: Vercel deploy + env vars, Supabase project + P1 data
  wiring, Blaaiz dev credentials, live HMAC verification against a real
  event, Playwright pass.
- Build fix: first `next build` failed — `middleware.ts` imported the
  session helper, pulling the server store (`node:crypto`) into the Edge
  bundle. Inlined the cookie name in middleware; rebuild green (31 pages).

## 2026-11-06 — Build session starts, Phase 1 research done

- Workspace root `C:\Users\Hp` is a home directory, not a project.
  Per greenfield-scaffolding rules, all work goes under the dedicated
  child `escrowpay-global/`. Nothing is written outside it.
- No prior docs existed; created the five source-of-truth files from the
  master prompt.
- Ran a 5-agent Phase 1 workflow: Blaaiz docs research (37 fetches),
  architecture design, task planning, critic, synthesis. Status `partial`
  with 12 unresolved items (see below); all P0 design inputs obtained.
- Key Blaaiz findings (all fetched from docs.blaaiz.com, no invented
  endpoints): OAuth2 `client_credentials` on `POST /oauth/token`,
  Bearer on `/api/external/*`, legacy API key deprecated; wallets are
  one-currency (NGN/USD/GBP/EUR/CAD) and all money moves via wallets;
  collections via card/VBA/Interac; payouts via `POST /payout` with
  `wallet_id` + method; no crypto on the Payout API; webhooks on three
  HTTPS URLs with `x-blaaiz-signature` HMAC + `event_id` dedupe;
  120 req/min + 1500/hr limits; dev has no IP whitelist, prod requires it.
- Unresolved (carried into `prd.md` §8): exact HMAC payload construction,
  full currency list (needs live call), Interac money-request paths,
  `/collection/attach-customer` prefix, dev simulation mechanics.
- Stack pinned: Next.js 15 + React 19 + TS strict + Tailwind v3.4 +
  Zod + Supabase JS + Vercel AI SDK + Vitest + Recharts + Lucide.
  Tailwind v3 chosen over v4 for PostCSS-config familiarity and
  Windows-safe setup.
- P0 data decision: server-side demo store (in-memory, seeded) so the
  demo runs with zero credentials; Supabase migration SQL + RLS +
  clients ship as the production path; live Supabase data wiring is P1
  behind the store interface. Rationale: no Supabase credentials exist
  in this environment, and unverifiable integrations must not gate P0.
- Milestone FSM reconciled from prompt + research into 11 states with
  explicit transition map (`design.md` §4).
