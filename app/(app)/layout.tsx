import { redirect } from "next/navigation";
import { financialProviderKind } from "@/lib/config";
import { getSessionUser } from "@/lib/db/session";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} simulated={financialProviderKind() === "demo"}>
      {children}
    </AppShell>
  );
}
