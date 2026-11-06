"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("client");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/demo-signup", {
        method: "POST",
        body: JSON.stringify({ name, email, role }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Wanjiku Mwangi"
          required
          minLength={2}
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-700 bg-abyss-950 px-3 text-sm text-slate-100 focus:border-mint-500 focus:outline-none"
        >
          <option value="client">Client — I pay for work</option>
          <option value="freelancer">Freelancer — I deliver work</option>
        </select>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create demo account"}
      </Button>
    </form>
  );
}
