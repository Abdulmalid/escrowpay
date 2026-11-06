# EscrowPay Global

Trustless Payments. Trusted Delivery.

Milestone-based payment coordination for cross-border freelance work.
Clients fund milestones, freelancers ship against written requirements, an AI
Guardian advises on delivery evidence, and clients approve releases — with a
balanced double-entry ledger behind every step.

> **Demo escrow workflow.** This build coordinates milestone payments; it is
> not regulated escrow, custody, or a bank. Simulated funds are labeled
> `SIMULATED` everywhere and never represent real money.

## Quickstart (zero credentials)

```powershell
cd escrowpay-global
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then **Open the demo** and
sign in as a seeded persona:

| Persona | Email |
|---|---|
| Client | `client@escrowpay.demo` |
| Freelancer | `freelancer@escrowpay.demo` |
| Admin | `admin@escrowpay.demo` |

The seed narrative (1 contract, 3 milestones: funded / under review /
pending, plus a completed payout) loads on first sign-in. Reset anytime from
Settings → Demo data.

## Demo script (9 steps)

1. Landing → **Open the demo** (note the `SIMULATED DEMO` banner).
2. As client: Contracts → New contract, or open the seeded one.
3. Fund a milestone → **Simulate confirmation** (delivers a provider webhook
   through the real receiver).
4. As freelancer: Start work → Submit evidence.
5. Guardian auto-reviews; read the advisory checklist on the milestone page.
6. FX Desk: estimate the payout in NGN/GHS/KES (indicative only).
7. As client: Approve → Release + create payout → **Simulate settlement**.
8. Open a dispute from any active milestone, then resolve it (resume/refund/release).
9. History page: the full balanced ledger trail.

Automated version: `powershell -File scripts/demo-smoke.ps1` (22 checks).

## Going live (infrastructure)

Copy `.env.example` to `.env.local`:

| Variable | Enables |
|---|---|
| `FINANCIAL_PROVIDER=blaaiz` + `BLAAIZ_CLIENT_ID/SECRET` | Live Blaaiz OAuth, VBA funding, payouts, rates |
| `BLAAIZ_WEBHOOK_SIGNING_SECRET` | HMAC webhook verification |
| `OPENAI_API_KEY` | LLM Guardian assessments (else heuristic) |
| `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auth + P1 data wiring |

Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor, then
`supabase/seed.sql` after creating the auth users. Register the three webhook
URLs (`/api/webhooks/blaaiz`) in the Blaaiz dashboard (API & Webhooks).

## Verification

```powershell
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (33 tests)
npm run build       # production build
```

## Docs (source of truth)

`prd.md` · `design.md` · `agents.md` · `task.md` · `log.md` — the PRD wins conflicts.
