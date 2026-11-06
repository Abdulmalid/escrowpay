import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/db/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const existing = await getSessionUser();
  if (existing) redirect("/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-abyss-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <ShieldCheck className="size-6 text-mint-400" />
          <span className="font-display text-lg font-bold text-white">EscrowPay Global</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in to the demo</CardTitle>
            <CardDescription>
              Pick a seeded persona. Sessions are demo-only and visibly labeled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-4 text-center text-sm text-slate-500">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-mint-400 hover:text-mint-300">
                Create a demo account
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-600">
          Production sign-in uses Supabase Auth when configured.
        </p>
      </div>
    </div>
  );
}
