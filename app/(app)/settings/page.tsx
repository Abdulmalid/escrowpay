import {
  financialProviderKind,
  isBlaaizConfigured,
  isLlmConfigured,
  isSupabaseConfigured,
} from "@/lib/config";
import { getSessionUser } from "@/lib/db/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { DangerZone } from "./settings-panels";

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  const provider = financialProviderKind();
  const rows: [string, boolean, string][] = [
    ["Financial provider", true, provider === "demo" ? "Demo (simulated)" : "Blaaiz (live)"],
    ["Blaaiz credentials", isBlaaizConfigured(), isBlaaizConfigured() ? "Configured" : "Not set — demo provider active"],
    ["AI Guardian LLM", isLlmConfigured(), isLlmConfigured() ? "LLM assessments" : "Heuristic fallback active"],
    ["Supabase", isSupabaseConfigured(), isSupabaseConfigured() ? "Configured (P1 wiring)" : "Not set — demo store active"],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Identity, infrastructure status, and demo controls.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <StatusPill status={user.role} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Infrastructure</CardTitle>
          <CardDescription>What this deployment is actually connected to.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-800">
            {rows.map(([label, good, detail]) => (
              <li key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{detail}</span>
                  <Badge variant={good ? "success" : "warning"}>{good ? "ok" : "demo"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {provider === "demo" ? <DangerZone /> : null}
    </div>
  );
}
