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
* **Dedicated Virtual Bank Accounts (USD, EUR, GBP, CAD):** Provisioned instantly via Blaaiz API for client local wire/ACH/SEPA/Interac deposits.
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

### Specific Blaaiz APIs & Concepts Utilized:
| Blaaiz Capability | Endpoint / Mechanism | How EscrowPay Uses It |
| :--- | :--- | :--- |
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

## 🏆 Judge Demo Guide (How to Win in 3 Minutes)

When recording your demo video or pitching to the hackathon judges:

1. **Step 1: The Active Dashboard (0:00 - 0:45)**
   * Show the active TVE metrics, the **Dual-Rail Engine status pill**, and the pre-loaded contracts.
   * Point out the **FX Devaluation Shield** box: show how **₦225,000** was saved for a Nigerian engineer by holding the contract in USDC during currency depreciation.

2. **Step 2: Dedicated Virtual Account & Deposit Simulation (0:45 - 1:30)**
   * Select a contract in `Awaiting Deposit` (or create a new one via the **"New Escrow"** modal).
   * Show the dedicated Blaaiz virtual account details (ClearBank sort code or Community Federal ACH routing).
   * Click **"Launch Judge Live Simulator"** on the top right.
   * Click **"Deposit via Virtual Account"** -> Observe the cryptographic `x-blaaiz-signature` verification and watch confetti trigger as status changes to **"Escrowed & Hedged in USDC"**!

3. **Step 3: Milestone Approval & Instant Multi-Rail Payout (1:30 - 2:30)**
   * Click **"Approve & Release Payout"** on Milestone 2.
   * Watch the real-time call to Blaaiz `/api/external/payout`.
   * Open the **"Blaaiz Logs"** drawer to show the live audit trail of API calls, OAuth token validations, swap executions, and payout dispatches.

4. **Step 4: Architecture Blueprint (2:30 - 3:00)**
   * Click the **"Architecture"** button to display the complete 4-step sequence diagram showcasing deep integration with the Blaaiz platform.

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
