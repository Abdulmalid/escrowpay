# EscrowPay Global — Architecture & Design

Last updated: 2026-11-06. Implements [prd.md](prd.md).

## 1. Stack

- Next.js App Router + TypeScript (strict) + Tailwind CSS v3.
- Server: Route Handlers + server-only lib. Zod validation at every boundary.
- Data P0: server-side demo store (in-memory, seeded, `SIMULATED`-labeled).
- Data production path: Supabase Postgres + Auth + RLS; see
  `supabase/migrations/`. Live Supabase data wiring is P1; the store
  interface is the seam.
- AI: Vercel AI SDK (`generateObject`, Zod schema) with heuristic fallback.
- Tests: Vitest for lib modules.

## 2. Repository layout

```text
escrowpay-global/
  app/
    page.tsx                    landing
    (auth)/login|signup         auth pages
    (app)/...                   authed shell: dashboard, contracts, payouts,
                                fx, guardian, disputes, history, settings, admin
    api/
      contracts[/[id][/milestones|fund]]
      milestones/[id]/submit|approve|release|dispute
      payouts/request  payouts (GET history)
      fx/quote  ai/guardian-review
      webhooks/blaaiz  webhooks/demo
      auth/demo-login  auth/logout
      demo/seed  demo/reset  health
  src/lib/
    money.ts fsm.ts validations.ts idempotency.ts ledger.ts
    blaaiz/{types,provider,demo-provider,blaaiz-provider,client,webhooks}.ts
    fx/{quotes,convert}.ts  ai/{guardian,schema,prompts}.ts
    db/{types,store,seed,session,supabase}.ts
  src/components/{ui/*,shell,widgets}
  supabase/{migrations,seed.sql}
  tests/
```

## 3. Money

- Integer minor units (`amountMinor`) + ISO currency everywhere.
- `src/lib/money.ts`: parse/format/convert with `bigint` math, no floats.
- FX quotes are immutable records `{pair, rateBps, fetchedAt, indicative:true}`.

## 4. Milestone state machine (`src/lib/fsm.ts`)

```text
draft -> pending_funding -> funded -> in_progress -> submitted -> under_review
  -> approved -> release_pending -> released
submitted -> in_progress (rework)            under_review -> in_progress
funded|in_progress|submitted|under_review -> disputed -> in_progress|released|cancelled
any pre-release -> cancelled
```

Enforced in TS (`canTransition`) and mirrored by a Postgres `CHECK`.
Terminal: `released`, `cancelled`.

## 5. Ledger (`src/lib/ledger.ts`)

Double-entry `ledger_entries`: `(txGroup, account, dc, amountMinor, currency,
refType, refId)`. Accounts: `escrow|payable|receivable|fee|refund`.
Rules: debits equal credits per `txGroup`; amounts > 0; append-only
(application + `REVOKE UPDATE,DELETE` + immutable trigger in SQL).
Funding: Dr receivable / Cr escrow. Release: Dr escrow / Cr payable.
Fee: Dr escrow / Cr fee. Refund: Dr escrow / Cr refund.

## 6. Financial providers (`src/lib/blaaiz/`)

`FinancialProvider` interface: `createFundingIntent`, `getFundingStatus`,
`createPayout`, `getPayoutStatus`, `getRate`, `verifyWebhook`.
Implementations: `DemoFinancialProvider` (explicit `provider:"demo"`,
in-memory lifecycle, never real) and `BlaaizProvider` (real HTTP, env-gated).

Verified Blaaiz facts (docs.blaaiz.com, fetched 2026-11-06):

- Base: `https://api-prod.blaaiz.com`, dev `https://api-dev.blaaiz.com`.
  Envs fully isolated. No IP whitelist in dev; required in prod.
- Auth: OAuth2 `client_credentials`, `POST /oauth/token` as
  `application/x-www-form-urlencoded` (`grant_type, client_id,
  client_secret, scope`); short-lived Bearer (~900s, no refresh) on
  `/api/external/*`. Legacy `x-blaaiz-api-key` is deprecated.
- Wallets: `GET /api/external/wallet[/{id}]` (`wallet:read`). One currency
  per wallet: NGN/USD/GBP/EUR/CAD. All money moves via wallets.
- Funding: `POST /api/external/collection` (card, `collection:create`);
  `POST|GET /api/external/virtual-bank-account`
  (`virtual-account:create/read`); `POST /api/external/swap`
  (`swap:create`, same-business wallets). Internal
  `createFundingIntent` is OUR interface name, not a Blaaiz endpoint.
- VBA: NGN/GBP/EUR/USD; NGN instant `SUCCESSFUL`, others async `PENDING`
  then `virtual_account.ready/failed/rejected` webhooks.
- Payouts: `POST /api/external/payout` (`payout:create`; `wallet_id`,
  `customer_id`, `method`, `from_amount` XOR `to_amount`). Methods:
  `bank_transfer|interac|ach|wire|mobile_money`. No crypto via Payout API.
- FX/fees: `GET /api/external/rate?search_term=USD/NGN`;
  `POST /api/external/fees/breakdown` (`fees:read`);
  `GET /api/external/currency` (`currency:read`).
- Webhooks: `collection_url|payout_url|kyc_url` (HTTPS only);
  `POST|GET /api/external/webhook`; payload
  `{event, data, timestamp, signature}`; verify `x-blaaiz-signature`
  HMAC with `signing_secret`; return 2xx or Blaaiz retries; dedupe by
  `event_id`; 90-day logs.
- Limits: 120 req/min + 1500/hr, `429` + `X-RateLimit-*` headers.

## 7. Webhooks (`app/api/webhooks/*`, `src/lib/blaaiz/webhooks.ts`)

Verify signature when secret configured → upsert `webhook_events` by
`event_id` (duplicate → 200, no-op) → apply transition via FSM guard +
balanced ledger write → audit log. Unknown events are stored and ignored.

## 8. Auth & access control

- P0: demo session cookie (`epg_demo_role`, httpOnly) set via
  `POST /api/auth/demo-login`. Every page/route shows the demo identity.
- Production path: Supabase Auth + `profiles` + RLS (migration SQL ships).
- Server rules: authenticate → participant check → payer-only approve →
  never trust client amounts/statuses/roles.

## 9. AI Guardian (`src/lib/ai/`)

Input: requirements + evidence (+ optional PR/test/doc text).
Output (Zod): checklist, assessment, missing items, discrepancies,
readiness score 0–100, explanation. Advisory text only; no approval path
exists in code. LLM via `generateObject` when `OPENAI_API_KEY` is set,
else deterministic heuristic. Never claims repo access.

## 10. FX (`src/lib/fx/`)

Indicative quotes (static table P0, Blaaiz `/rate` when live) →
`convert()` with minor-unit math → dashboard shows rate, fee estimate,
exposure vs contract currency, estimated payout. Always labeled indicative.

## 11. Security checklist

Zod everywhere, RLS + service-role-only money writes, idempotency keys,
webhook verify+dedupe, rate-limit sensitive routes (in-memory P0),
audit logs, safe error messages, no secrets client-side, upload validation
(P1 for real file uploads; P0 evidence is URL/text).
