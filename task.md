# EscrowPay Global — Task Plan

Priorities: P0 demo-blocking · P1 high value · P2 cut for hackathon.
Check a box only after implementation AND verification.

## Phase 1 — Planning

- [x] Inspect workspace; confirm greenfield; choose `escrowpay-global/` root.
- [x] Research Blaaiz docs (5-agent workflow); record verified endpoints.
- [x] Write `prd.md`, `design.md`, `agents.md`, `task.md`, `log.md`.

## Phase 2 — Foundation (P0)

- [x] Scaffold Next.js + TS + Tailwind; install deps; `npm run dev` serves.
- [x] Base layout, theme, ui primitives, demo banner, auth shell.
- [x] Demo session auth (`/api/auth/demo-login`, middleware gate).
- [x] Supabase clients + migration SQL (schema + RLS) + seed SQL.

## Phase 3 — Core MVP (P0)

- [x] Contract create/read API + pages (milestones sum to total).
- [x] Milestone FSM + submit/review/approve/release API + pages.
- [x] Funding intents + ledger entries + transaction history page.
- [x] Payout request/status API + payouts page.
- [x] Dispute open/resolve API + dispute center.
- [x] Demo store + seed script (1 client, 1 freelancer, 3 milestones,
      1 payout, 1 indicative conversion) + reset endpoint.

## Phase 4 — Integration (P0)

- [x] Provider abstraction + `DemoFinancialProvider`.
- [x] `BlaaizProvider` (OAuth, collections, VBA, payouts, rate, fees)
      behind env; never default.
- [x] Webhook receivers (Blaaiz + demo) with verify + dedupe.
- [x] Funding/payout status reconciliation via provider polling (retry route + webhook apply).

## Phase 5 — AI (P0)

- [x] Guardian schema + prompts + heuristic analyzer.
- [x] LLM path via Vercel AI SDK `generateObject` (env-gated).
- [x] Guardian API route + UI page with advisory labeling.

## Phase 6 — Polish (P0/P1)

- [x] FX module + dashboard (indicative, Recharts).
- [x] Landing page (premium, no slop patterns).
- [x] Responsive pass, loading/empty/error states.
- [x] Settings + admin pages functional.

## Phase 7 — Verification (P0)

- [x] Vitest: money, FSM, ledger, idempotency, provider, FX, guardian (33 tests green).
- [x] `typecheck` + `lint` + full test run green.
- [ ] Auth gate, contract create, fund, submit, approve, release, payout,
      dispute, webhook-dedupe, demo reset — covered by unit/integration tests;
      HTTP smoke (`scripts/demo-smoke.ps1`) written but BLOCKED in this sandbox
      (EACCES on listen). Must be run where binding works.
- [ ] Deployment: Vercel + env vars (needs user credentials).

## P1 backlog (after demo is green)

- [ ] Supabase live data wiring (replace demo store reads/writes).
- [ ] Real Blaaiz dev-key end-to-end test.
- [ ] Payout history UI, Guardian checklist UI, conversion calculator.
- [ ] Webhook retry log UI, rate-limit hardening.

## P2 (explicitly cut)

Real KYC, reconciliation jobs, retry queues, audit export, multi-currency
settlement, split/batch payouts, arbitration, subscriptions, org accounts.
