"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Code2, ShieldAlert } from "lucide-react";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

const PERSONAS = [
  { email: "client@escrowpay.demo", name: "Ada Okafor", role: "Client", icon: Briefcase },
  { email: "freelancer@escrowpay.demo", name: "Kwame Mensah", role: "Freelancer", icon: Code2 },
  { email: "admin@escrowpay.demo", name: "Platform Admin", role: "Admin", icon: ShieldAlert },
];

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string) {
    setPending(email);
    setError(null);
    try {
      await api("/api/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {PERSONAS.map((persona) => (
        <button
          key={persona.email}
          onClick={() => signIn(persona.email)}
          disabled={pending !== null}
          className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-abyss-950 px-4 py-3 text-left transition-colors hover:border-mint-500 disabled:opacity-50"
        >
          <persona.icon className="size-5 shrink-0 text-mint-400" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-white">{persona.name}</span>
            <span className="block text-xs text-slate-500">{persona.email}</span>
          </span>
          <span className="text-xs font-semibold text-slate-400">{persona.role}</span>
        </button>
      ))}
      {pending ? <p className="text-center text-sm text-slate-500">Signing in…</p> : null}
      {error ? <p className="text-center text-sm text-red-300">{error}</p> : null}
      <Button variant="ghost" className="w-full" onClick={() => router.push("/")}>
        Back to site
      </Button>
    </div>
  );
}
