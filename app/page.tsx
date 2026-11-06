import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Landmark,
  Lock,
  ScanSearch,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: "01",
    title: "Fund milestones, not promises",
    body: "The client locks each milestone amount into the tracked workflow. Funds move only through the provider — never on a handshake.",
  },
  {
    n: "02",
    title: "Ship against written requirements",
    body: "The freelancer sees exactly what is funded, what is due, and what evidence each milestone needs.",
  },
  {
    n: "03",
    title: "Guardian checks the delivery",
    body: "The AI Milestone Guardian compares submitted evidence against requirements and flags gaps. Advisory only — it can never release money.",
  },
  {
    n: "04",
    title: "Client approves, payout settles",
    body: "One approval releases the milestone and routes the payout to the freelancer's verified destination.",
  },
];

const TICKER = [
  ["USD → NGN", "1,550.00"],
  ["USD → GHS", "15.80"],
  ["USD → KES", "129.20"],
  ["USD → GBP", "0.79"],
  ["USD → EUR", "0.92"],
];

const FEE_ROWS = [
  ["EscrowPay milestone release", "1.5% all-in", "Minutes to hours"],
  ["International wire", "$25 – $50 flat", "2 – 5 days"],
  ["Legacy freelance platforms", "10 – 20%", "5 – 14 days"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-abyss-950">
      {/* Simulated banner */}
      <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-300">
        SIMULATED DEMO — figures on this page are illustrative. EscrowPay is a demo escrow
        workflow, not regulated escrow or custody.
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-mint-400" />
          <span className="font-display text-lg font-bold text-white">EscrowPay Global</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#fees" className="hover:text-white">Fees</a>
          <a href="#guardian" className="hover:text-white">Guardian</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white">
            Sign in
          </Link>
          <Link href="/login">
            <Button size="sm">Open the demo</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
        <div className="pointer-events-none absolute -top-20 left-1/3 size-[480px] rounded-full bg-mint-500/10 blur-[120px]" />
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Get paid when the work lands.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            EscrowPay coordinates milestone payments for cross-border freelance work.
            Clients fund milestones. Freelancers ship against written requirements.
            Money releases on approval — with a full ledger trail.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg">
                Start the live demo <ArrowRight />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="secondary">How it works</Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Badge variant="success"><Lock /> Milestone-locked funds</Badge>
            <Badge variant="success"><BadgeCheck /> Client-approved releases</Badge>
            <Badge variant="success"><ScanSearch /> AI delivery review</Badge>
          </div>
        </div>

        {/* Live escrow card mock */}
        <div className="rounded-xl border border-slate-800 bg-abyss-900 p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Checkout integration · Milestone 2
            </p>
            <Badge variant="simulated">Simulated</Badge>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-white">$1,800.00</p>
          <p className="mt-1 text-sm text-slate-400">Mobile-money payouts · due in 28 days</p>
          <ol className="mt-6 space-y-0">
            {[
              ["Funded", "Client locked $1,800.00", true],
              ["Submitted", "Freelancer delivered evidence", true],
              ["Guardian: likely ready", "Score 82 · advisory", true],
              ["Awaiting client approval", "Release + payout pending", false],
            ].map(([title, sub, done]) => (
              <li key={title as string} className="flex gap-3 pb-5 last:pb-0">
                <span
                  className={`mt-1 size-2.5 shrink-0 rounded-full ${done ? "bg-mint-400" : "bg-slate-600"}`}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{title}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-lg bg-abyss-950 p-3 text-xs text-slate-400">
            Next: client approval triggers release ledger entries + a payout to the
            freelancer&apos;s verified destination.
          </div>
        </div>
      </section>

      {/* Ticker */}
      <section className="border-y border-slate-800 bg-abyss-900/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Indicative rates
          </span>
          {TICKER.map(([pair, rate]) => (
            <span key={pair} className="text-sm text-slate-300">
              <span className="text-slate-500">{pair}</span> <span className="font-semibold">{rate}</span>
            </span>
          ))}
          <span className="text-xs text-slate-600">Illustrative only — not executable.</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-2xl font-bold text-white">How it works</h2>
        <p className="mt-2 max-w-2xl text-slate-400">
          Four steps, one ledger. Every transition is validated on the server and
          recorded — funding, approval, release, and payout.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 md:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-abyss-900 p-6">
              <p className="font-display text-sm font-bold text-mint-400">{step.n}</p>
              <h3 className="mt-2 font-display text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fees */}
      <section id="fees" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Priced to beat the wire, not the worker.
            </h2>
            <p className="mt-3 text-slate-400">
              A single all-in rate per release, shown before approval. No withdrawal
              maze, no 20% platform cut, no five-day float.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-slate-400">
              <Landmark className="size-5 text-mint-400" />
              Settlement via Blaaiz financial infrastructure where supported.
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
              <Wallet className="size-5 text-mint-400" />
              Bank, Interac, ACH, wire, and mobile money destinations.
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-abyss-900 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Route</th>
                  <th className="px-5 py-3 font-semibold">Cost</th>
                  <th className="px-5 py-3 font-semibold">Speed</th>
                </tr>
              </thead>
              <tbody>
                {FEE_ROWS.map(([route, cost, speed], i) => (
                  <tr key={route} className={i === 0 ? "bg-mint-500/10 text-white" : "bg-abyss-900 text-slate-300"}>
                    <td className="px-5 py-3 font-semibold">{route}</td>
                    <td className="px-5 py-3">{cost}</td>
                    <td className="px-5 py-3 text-slate-400">{speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bg-abyss-900 px-5 py-3 text-xs text-slate-600">
              Illustrative comparison for the demo. Live pricing follows provider quotes.
            </p>
          </div>
        </div>
      </section>

      {/* Guardian */}
      <section id="guardian" className="border-y border-slate-800 bg-abyss-900/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Meet the Milestone Guardian</h2>
            <p className="mt-3 text-slate-400">
              An AI reviewer that reads the requirements, reads the evidence, and tells
              the client what is actually proven — with a readiness score and a
              missing-items list. It advises. The client decides.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li className="flex gap-2"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-mint-400" /> Requirement-by-requirement checklist with cited evidence</li>
              <li className="flex gap-2"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-mint-400" /> Discrepancy flags for vague or unsupported claims</li>
              <li className="flex gap-2"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-mint-400" /> No approval path in code — releases stay human</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-abyss-950 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Guardian assessment</p>
              <Badge variant="info">Advisory</Badge>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["GHS + KES payouts supported", "yes"],
                ["Terminal status polling", "yes"],
                ["Failure + retry documented", "partial"],
              ].map(([req, met]) => (
                <div key={req as string} className="flex items-center justify-between rounded-lg bg-abyss-900 px-4 py-2.5">
                  <span className="text-slate-300">{req}</span>
                  <Badge variant={met === "yes" ? "success" : "warning"}>{met as string}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Sample output. The live Guardian runs on every evidence submission.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-mint-400" />
          <span className="font-semibold text-slate-300">EscrowPay Global</span>
          <span>· Trustless Payments. Trusted Delivery.</span>
        </div>
        <p className="max-w-xl text-xs">
          Demo escrow workflow for illustration. Not a bank, not regulated escrow,
          not custody. Simulated funds are never real money.
        </p>
      </footer>
    </div>
  );
}
