# EscrowPay Global — Product Requirements Document

- Product: EscrowPay Global
- Tagline: Trustless Payments. Trusted Delivery.
- Category: Cross-border milestone payment coordination (NOT a regulated escrow or custody service).
- Source of truth rank: this PRD resolves conflicts between docs.
- Last updated: 2026-11-06 (Phase 1 research complete).

## 1. Problem

1. Clients hesitate to pay large amounts upfront to unknown remote contractors.
2. Freelancers fear completing work without receiving payment.
3. Cross-border rails are slow and expensive.
4. FX volatility erodes contractor purchasing power.
5. Existing rails are not structured around project milestones.
6. Clients lack transparent delivery verification.

## 2. Solution

Milestone-based payment coordination: clients create contracts, define
milestones, fund them through supported financial infrastructure, and release
payment after reviewing delivery. Freelancers see funded milestones,
requirements, approval state, and payout progress. Blaaiz provides financial
infrastructure where supported. The AI Milestone Guardian gives advisory
delivery assessments only.

### Hard product boundaries (non-negotiable)

- The app is a coordination workflow. It is NOT regulated escrow or custody.
- Never represent simulated funds as real money. Every demo-mode money surface
  is labeled `SIMULATED`.
- The AI Guardian never approves releases or moves money. Only the client
  (payer) approves a release.
- FX figures are INDICATIVE unless a provider confirms execution.
- Never claim a GitHub inspection without a real integration.

## 3. Users and roles

- `client` — creates contracts, funds milestones, approves/releases.
- `freelancer` — views funded work, submits evidence, requests payouts.
- `admin` — reviews disputes, views platform activity.

## 4. Scope

### P0 — must work for the demo

- Demo session auth with visible role (Supabase Auth wired when configured).
- Contract CRUD with milestones summing to the contract total.
- Milestone lifecycle with server-enforced transitions.
- Funding intents + double-entry ledger in integer minor units.
- Financial provider abstraction with `DemoFinancialProvider` default.
- Blaaiz provider implemented against verified docs, enabled by env only.
- Idempotent webhook receiver (`event_id` dedupe, signature verify when
  `BLAAIZ_SIGNING_SECRET` is set).
- Payout requests with status tracking.
- Dispute open/view/resolve (basic).
- AI Guardian advisory review (LLM when key present, heuristic fallback).
- Indicative FX dashboard.
- Demo seed: 1 client, 1 freelancer, 3 milestones
  (funded / submitted / pending), 1 payout, 1 indicative conversion.
- Landing, dashboards, contract/milestone pages, funding, payouts, FX,
  Guardian, disputes, history, settings, admin (core demo pages polished;
  the rest functional).

### P1 — high value, after P0

Supabase live data wiring, real Blaaiz end-to-end with dev keys, payout
history UI, Guardian checklist UI, conversion calculator, webhook retry log.

### P2 — cut for the hackathon

Real KYC, reconciliation jobs, retry queues, audit export, multi-currency
settlement, split/batch payouts, arbitration flow, subscriptions, org accounts.

## 5. Demo narrative (9 steps)

1. Landing shows the value prop with a `SIMULATED DEMO` banner.
2. Client creates a contract with milestones.
3. Client funds a milestone; webhook confirms `funded`.
4. Freelancer submits deliverables.
5. Guardian returns an advisory assessment.
6. FX dashboard shows indicative payout.
7. Client approves; release executes and payout is requested.
8. Dispute branch pauses a milestone, then resolves.
9. Ledger/audit timeline shows the full trail.

## 6. Acceptance criteria

- Milestone amounts must sum to the contract total (server-validated).
- All money is integer minor units; no float arithmetic.
- Every balance change has balanced ledger entries in one atomic write.
- Duplicate webhook `event_id` is ignored; duplicate idempotency key returns
  the original result without double-applying.
- Illegal milestone transitions are rejected by the server.
- Non-participants cannot read contracts; only payers approve.
- `npm run typecheck`, `npm run lint`, `npm test` pass; `npm run dev`
  serves the landing and demo flow with zero credentials.

## 7. Environment variables

See [.env.example](/.env.example). Required for live paths only:
Supabase URL/keys, Blaaiz OAuth creds, webhook signing secret, LLM key.
Demo mode needs none of these.

## 8. Known blockers / open questions

- No Blaaiz dev credentials yet → demo provider is the default path.
- Exact `x-blaaiz-signature` HMAC construction is undocumented on fetched
  pages → verify-then-trust: verify when secret is set, always dedupe.
- Full currency list needs a live `GET /api/external/currency` call.
- Dispute SLA, arbitrator role, KYC source, sanctions/AML screening are
  undecided (P2 commercialization items).
