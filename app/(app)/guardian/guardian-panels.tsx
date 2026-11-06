"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function GuardianRunButton({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      await api("/api/ai/guardian-review", {
        method: "POST",
        body: JSON.stringify({ milestoneId }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <Button size="sm" variant="secondary" onClick={run} disabled={pending}>
        {pending ? "Reviewing…" : "Run review"}
      </Button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </span>
  );
}
