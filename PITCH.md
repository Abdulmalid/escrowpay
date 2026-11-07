# 🎙️ EscrowPay Global — Winning Hackathon Pitch Script (2 Minutes)

Use this script verbatim or adapt it for your hackathon pitch video or live judge presentation.

---

## ⏱️ Pitch Timeline (Total: 2 Minutes)

### 1. The Hook (0:00 - 0:30)
> *"Hello judges! Every single month, hundreds of thousands of African developers, designers, and agencies deliver world-class work for clients in the US, Europe, and the UK. But they face a crippling double tax:*
> 
> *First: Platforms like Upwork and Fiverr take **up to 20%** of their hard-earned money and make them wait **two weeks** for international wire clearance.*
> 
> *Second: While that invoice sits pending, rapid currency devaluation can wipe out 5% to 10% of their actual purchasing power before they ever see the money.*
> 
> *Today, we’re introducing **EscrowPay Global**: an autonomous milestone escrow platform built from the ground up on the **Blaaiz Platform Architecture** to solve both trust and currency volatility once and for all."*

---

### 2. The Solution & Blaaiz Architecture (0:30 - 1:15)
> *"Here is how it works:*
> 
> *When a contract is created, EscrowPay talks to the Blaaiz API using scoped OAuth2 credentials to instantly provision a **dedicated Virtual Bank Account**—whether it’s a US ACH routing number, a European SEPA IBAN, or a UK ClearBank sort code.*
> 
> *The client deposits funds using their ordinary local bank account.*
> 
> *Blaaiz fires a cryptographically signed webhook to our platform. We verify the `x-blaaiz-signature` HMAC-SHA256 header in real-time.*
> 
> *Now comes our secret weapon: **The FX Devaluation Shield**. EscrowPay immediately triggers a Blaaiz swap into **USDC stablecoin**. By holding the escrowed funds in stablecoin on-chain during the 2-week delivery period, our Nigerian contractor here was shielded from a 90 Naira depreciation, saving over **₦225,000** in purchasing power!"*

---

### 3. The Live Demo (1:15 - 1:45)
> *(Show screen)*
> *"Let’s look at a live contract:*
> 
> *Here is our second project with Novus Labs in the UK. The contract is awaiting deposit into this dedicated ClearBank GBP account.*
> 
> *Using our Judge Simulator, let’s simulate the client’s GBP bank transfer.*
> 
> *(Click 'Deposit to Virtual Account')*
> 
> *Boom! The cryptographic webhook is verified, the escrow locks, and the stablecoin hedge activates.*
> 
> *Now, the developer submits their code, the client clicks **'Approve & Release Payout'**, and in **under 15 seconds**, Blaaiz dispatches funds straight to the contractor’s Safaricom M-Pesa wallet or Zenith Bank NIP account at a fraction of legacy fees.*
> 
> *In our Blaaiz Logs drawer, you can inspect the raw audit trail: the OAuth token exchanges, virtual account generation, webhook verification, and instant payout execution."*

---

### 4. Market Impact & The Ask (1:45 - 2:00)
> *"The cross-border gig economy in emerging markets is a \$50B+ opportunity. By leveraging Blaaiz's BaaS virtual accounts, stablecoin rails, and instant African payout network, EscrowPay turns cross-border contracts into frictionless, inflation-proof instant settlements.*
> 
> *Thank you, and we’re ready for your questions!"*

---

## 💡 Key Talking Points for Judge Q&A

1. **"Why use Blaaiz instead of Stripe?"**
   * *Answer:* Stripe doesn't support local African payout rails (Nigeria NIP, Kenya M-Pesa, Ghana Mobile Money) or stablecoin auto-hedging natively for non-US entities. Blaaiz is built specifically for emerging-market remittance and cross-border settlement.

2. **"How do you handle security & fraud?"**
   * *Answer:* We strictly enforce HMAC-SHA256 signature verification on all incoming webhooks (`x-blaaiz-signature`). All API calls adhere to OAuth 2.0 least-privilege scopes (`virtual_account:create`, `payout:create`). Every transaction has a unique `merchant_reference` for idempotency to eliminate double-spending.

3. **"What is the business model?"**
   * *Answer:* Instead of the 10-20% fee charged by legacy freelancing platforms, EscrowPay charges a flat 1.5% escrow fee plus nominal FX spread, saving contractors 85%+ in fees while remaining highly profitable.
