import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/db/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
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
            <CardTitle>Create a demo account</CardTitle>
            <CardDescription>
              Demo-only identity. Choose the role you want to explore.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm />
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have one?{" "}
              <Link href="/login" className="font-semibold text-mint-400 hover:text-mint-300">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
