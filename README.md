# EscrowPay Global 🛡️
### Autonomous Cross-Border Milestone Escrow with Blaaiz Dual-Rail Settlement & FX Devaluation Shield

Built for the **Blaaiz Hackathon 2026**.

---

## 🌟 Executive Summary & The Problem

African and emerging-market freelancers, agencies, and cross-border businesses face two massive bottlenecks:

1. **Trust Deficit & Predatory Platform Fees:** Foreign clients in North America and Europe hesitate to pay upfront; remote contractors fear non-payment. Legacy platforms like Upwork and Fiverr charge up to **20% fees** and take **10 to 14 days** to clear payouts to Africa.
2. **Rapid Currency Devaluation:** High inflation and currency depreciation can wipe out 5% to 15% of a contractor's purchasing power while an invoice or milestone is pending.

### The Solution: EscrowPay Global
**EscrowPay Global** is an autonomous cross-border milestone escrow platform engineered entirely on the **Blaaiz Platform (RaaS & BaaS)** architecture:
* **Dedicated deposit accounts per project:** shown at checkout so the client knows where to pay (mock today; maps to Blaaiz virtual bank accounts / collections — see the mapping table below).
* **Cryptographic Inbound Webhook Reconciliation:** Automatic payment detection via signed `collection_url` webhooks with `x-blaaiz-signature` validation.
* **FX Devaluation Shield (Auto-Swap to USDC):** Instantly converts deposited fiat to USDC stablecoin on Polygon rail to freeze purchasing power during project delivery.
* **Multi-Rail Instant Payouts:** Releases funds directly into local African bank accounts (Nigeria NIP, Kenya M-Pesa, Ghana Mobile Money) in **under 15 seconds** at a fraction of legacy fees.

---

## 🏗️ Deep Blaaiz Platform Architecture Integration

```
                         ┌────────────────────────────────────────┐
                         │             Client Entity              │
                         │    (US / UK / Europe / Canada)         │
                         └───────────────────┬────────────────────┘
                                             │ Deposits USD/EUR/GBP/CAD
                                             ▼
                         ┌────────────────────────────────────────┐
                         │   Blaaiz Dedicated Virtual Account     │
                         │   (Community Federal, ClearBank, etc.) │
                         └───────────────────┬────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │ Webhook: collection.successful            │
                       │ Header: x-blaaiz-signature (HMAC-SHA256)  │
                       ▼                                           │
 ┌─────────────────────────────────────────┐                       │
 │      EscrowPay Platform Engine          │                       │
 ├─────────────────────────────────────────┤                       │
 │ 1. OAuth2 Scoped Auth                   │                       │
 │    (wallet:read, payout:create, etc.)   │                       │
 │ 2. Milestone State Transition           │                       │
 └─────────────────────┬───────────────────┘                       │
                       │ Auto-Swap Trigger                         │
                       ▼                                           │
 ┌─────────────────────────────────────────┐                       │
 │ Blaaiz FX & Stablecoin Rails            │                       │
 │ (Swaps to USDC on Polygon Rail)         │                       │
 └─────────────────────┬───────────────────┘                       │
                       │ Milestone Approved                        │
                       ▼                                           │
 ┌─────────────────────────────────────────┐                       │
 │ Blaaiz Payout Engine                    │◄──────────────────────┘
 │ (POST /api/external/payout)             │
 └─────────────────────┬───────────────────┘
                       │ Multi-Rail Instant Settlement (<15s)
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
┌────────────┐   ┌────────────┐   ┌────────────┐
│ Nigeria    │   │ Kenya      │   │ On-Chain   │
│ NIP Banks  │   │ M-PESA     │   │ USDC/USDT  │
└────────────┘   └────────────┘   └────────────┘
```

### How this maps to the Blaaiz API

> **Status: mock flow.** Blaaiz sandbox access is pending, so every call below is simulated.
> The mapping is based on Blaaiz's public SDK documentation ([Python SDK](https://pypi.org/project/blaaiz-python-sdk/)).
> The OAuth call and the webhook verification are implemented to Blaaiz's documented scheme; the money-moving calls
> still need their request bodies adapted to Blaaiz's schema (customer / wallet / currency IDs) once sandbox keys exist.

| Step in the app | Blaaiz capability (per SDK docs) | Today | With sandbox keys |
| :--- | :--- | :--- | :--- |
| Authenticate | OAuth 2.0 client credentials, `POST {base_url}/oauth/token` (dev: `https://api-dev.blaaiz.com`) | **Implemented** in `lib/blaaiz.ts` (token cached, refreshed 60 s early) | Same code, `BLAAIZ_SIMULATION_MODE=false` |
| Know the parties | `customers.create` (first/last name, type, email, country) → `customer_id` | Client & freelancer stored on the project | Create a Blaaiz customer for each, pass `customer_id` |
| Collect the client's payment | Virtual bank accounts (`wallet_id`, `customer_id`, `account_name`) and collections (open banking EUR/GBP, card NGN/USD, Interac CAD, crypto), tagged with `merchant_reference` | Mock account details at checkout | Provision per project; reference = `ESCROW-<id>` |
| Detect the deposit | Webhook to the registered `collection_url`; headers `x-blaaiz-signature` + `x-blaaiz-timestamp`, HMAC-SHA256 over `timestamp.payload` | **Implemented & tested**: signature + 5-min replay window + event de-duplication + amount/currency check | Register the URL with `webhooks.register` |
| Protect against FX swings | `swaps.initiate` between business wallets | Simulated USDC swap | Call swaps between the NGN/USD and USDC wallets |
| Show rate and fees | `rates.list`, `fees.get_breakdown` | Fixed indicative rates | Call both before the client pays |
| Pay the freelancer | `payouts.initiate` with `method` = `bank_transfer` or `mobile_money`, `merchant_reference`, `from_amount`, currency IDs, `customer_id`, `wallet_id` | Simulated `SUCCESSFUL` result; idempotent, one payout per milestone | Real call; the payout reference is used as an idempotency key |
| Follow status | `transactions.get` by `merchant_reference`; payout webhook (`payout_url`) | Status shown in the app | Reconcile via webhook |

--- | :--- | :--- |
| **OAuth 2.0 Auth** | `POST /oauth/token` | Implements scoped client credentials (`virtual_account:create`, `payout:create`, `wallet:read`, `webhook:write`) with in-memory token caching. |
| **BaaS Virtual Accounts** | `POST /api/external/virtual-account` | Generates localized virtual account details for US ACH, EU SEPA IBAN, UK Sort Codes, and CAD Interac tied to a unique `merchant_reference`. |
| **Cryptographic Webhooks** | `POST /api/webhooks/blaaiz` | Validates HMAC-SHA256 `x-blaaiz-signature` against `signing_secret` to automatically detect deposits and trigger milestone states. |
| **Stablecoin Swap** | `POST /api/external/swap` | Powers the **FX Devaluation Shield**, instantly swapping fiat deposits into USDC to hedge against inflation. |
| **Multi-Rail Payouts** | `POST /api/external/payout` | Disburses instant payments to Nigerian NIP bank accounts, Kenyan M-Pesa wallets, and Ghanaian mobile money. |

---

## 🚀 Quickstart & Local Setup

### 1. Requirements
* Node.js v18+ (tested on Node v20/v26)
* npm or pnpm

### 2. Installation
```bash
# Clone and enter directory
cd newproject

# Install dependencies (already completed)
npm install

# Start development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Try it (test mode — no real money, no password)

**Live:** https://escrowpay-global.vercel.app

> **MOCK FLOW:** Blaaiz sandbox access is pending, so virtual accounts, FX swaps and payouts are simulated.
> The code calls the real Blaaiz endpoints (`/oauth/token`, `/virtual-account`, `/payout`) and switches to them
> when `BLAAIZ_SIMULATION_MODE=false` and sandbox keys are set.

It behaves like a normal two-sided product. Use two browser tabs (or switch accounts from the avatar menu):

1. **Sign in as a client** — e.g. the *Apex Global Ventures* test user, or join with any name + email.
2. **Start a new project** — add a freelancer name **and email**, a payout bank / M-Pesa number, and milestones.
3. **Pay at checkout** — the client sends a (test) bank transfer to the dedicated virtual account. The money is held in the vault and swapped to USDC to protect against currency swings.
4. **Sign in as the freelancer** with the *same email the client typed* (or the *Chidi* / *Amina* test users). The project is there, funded.
5. **Hand in the work** (a link), then switch back to the client.
6. **Approve & pay** — the freelancer is paid out; open their **wallet** to see the payment and payout destination.

Behind the scenes (see **Avatar menu → Blaaiz API activity**): OAuth token, virtual-account provisioning, a signed `collection.successful` webhook (HMAC-SHA256), the USDC swap, and the payout call.

```bash
npm install
npm run dev          # http://localhost:3000
node scripts/test-e2e.mjs   # API regression suite (needs `npm run build` first)
```

Set `DATABASE_URL` (Supabase Postgres, transaction pooler) for persistence; without it the app uses local JSON files.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── blaaiz/
│   │   │   ├── payout/route.ts      # Blaaiz multi-rail payout trigger
│   │   │   └── rates/route.ts       # FX and stablecoin rates
│   │   ├── contracts/
│   │   │   ├── route.ts             # Contract CRUD + Virtual Account generator
│   │   │   └── [id]/route.ts        # Contract state management
│   │   ├── logs/route.ts            # Live Blaaiz activity feed
│   │   ├── simulate/webhook/route.ts# Judge simulation harness with HMAC signing
│   │   └── webhooks/blaaiz/route.ts # Production Blaaiz webhook receiver
│   ├── globals.css                  # Modern dark fintech styles & glassmorphism
│   ├── layout.tsx                   # App root layout
│   └── page.tsx                     # Main dashboard command center
├── components/
│   ├── ActivityLogDrawer.tsx        # Real-time Blaaiz API audit stream
│   ├── ArchitectureModal.tsx        # Hackathon judge architecture breakdown
│   ├── ContractCard.tsx             # Milestone card, virtual account & FX widget
│   ├── Metrics.tsx                  # Live TVE & FX protection statistics
│   ├── Navbar.tsx                   # Top navigation with live rail status
│   ├── NewContractModal.tsx         # Escrow contract creation wizard
│   └── SimulatorDrawer.tsx          # Interactive demo drawer for judges
├── lib/
│   ├── blaaiz.ts                    # Blaaiz OAuth, Virtual Accounts, FX & Payouts
│   ├── storage.ts                   # In-memory & JSON file persistence
│   └── types.ts                     # TypeScript schemas & API types
├── .env.example                     # Blaaiz configuration template
└── package.json
```

---

## 🔒 Security & Idempotency
* **Signature Verification:** Rejects unauthenticated webhooks without valid `x-blaaiz-signature` HMAC-SHA256 headers.
* **Idempotency:** Generates distinct `merchant_reference` identifiers (`ESCROW-cnt_...` and `PAYOUT-cnt_...`) to protect against duplicate disbursements.
* **Token Caching:** Automatically refreshes Bearer tokens with 60-second early renewal buffers.

---

*Built with ❤️ for global contractors and cross-border innovation.*
