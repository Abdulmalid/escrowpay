# EscrowPay Global — Agent Rules

All contributors (human or agent) follow these rules. Violations block merge.

## 1. Money

- Integer minor units + currency. No `float`/`number` arithmetic on money;
  use `src/lib/money.ts` (`bigint` inside).
- Every balance change ships balanced ledger entries in ONE atomic store
  transaction. No direct balance edits.
- Never trust client-provided amounts, balances, or payment statuses.

## 2. State & idempotency

- Milestone transitions go through `src/lib/fsm.ts canTransition`.
- Funding, release, payout, and webhook handlers require idempotency:
  same key → return the original result, apply once.
- Webhooks: verify signature when a secret is configured, dedupe by
  `event_id`, store unknown events without applying them.

## 3. Server boundaries

- All mutations are server-side (Route Handlers / server actions only).
- Every handler: authenticate → authorize (participant / payer-only) →
  Zod-validate → act → audit log.
- Safe errors to clients; details to server logs only.

## 4. Honesty guardrails

- Demo/simulated money is labeled `SIMULATED` in UI and API responses.
- Copy says "demo escrow workflow" — never regulated escrow, custody,
  licensed, or guaranteed.
- FX is "indicative" unless provider-confirmed. The Guardian is "advisory".
- Never invent Blaaiz endpoints. Only call endpoints listed in
  [design.md](design.md) §6. New endpoints need a docs URL in `log.md`.

## 5. Code conventions

- TypeScript strict, no `any` without justification. Zod schemas live in
  `src/lib/validations.ts` and are shared by routes.
- Provider code in `src/lib/blaaiz/`; nothing else imports Blaaiz HTTP.
- UI: Tailwind + local `src/components/ui/*`; Lucide icons; Recharts for
  charts. Dark navy + emerald theme.
- Small focused modules; no duplicated business logic; no new deps without
  a `log.md` entry.

## 6. Docs & tasks

- `prd.md` wins conflicts. Keep `design.md` synced with real code.
- Update `task.md` as work completes; check a box only after verification.
- Log decisions, failures, and fixes in `log.md`.

## 7. Verification

- `npm run typecheck`, `npm run lint`, `npm test` must pass.
- Touching money/FSM/webhooks requires a Vitest test.
- Never claim a feature works without running it; never claim deploy
  success without confirmation.
