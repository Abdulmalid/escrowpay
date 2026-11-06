"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DangerZone() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function reset() {
    setPending(true);
    setError(null);
    setDone(false);
    try {
      await api("/api/demo/reset", { method: "POST" });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>
          Reset wipes all demo contracts and restores the seed narrative. Disabled on the live provider.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="danger" onClick={reset} disabled={pending}>
          {pending ? "Resetting…" : "Reset demo data"}
        </Button>
        {done ? <p className="mt-2 text-sm text-mint-300">Demo data restored to seed state.</p> : null}
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
