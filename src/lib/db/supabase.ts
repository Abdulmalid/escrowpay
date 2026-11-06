// Supabase clients for the production path (P1 data wiring).
// P0 runs on the demo store; these clients ship so Auth + RLS can be
// enabled without restructuring once credentials exist.

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function publicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)");
  }
  return { url, anonKey };
}

export function supabaseBrowser(): SupabaseClient {
  const { url, anonKey } = publicEnv();
  return createBrowserClient(url, anonKey);
}

export async function supabaseServer(): Promise<SupabaseClient> {
  const { url, anonKey } = publicEnv();
  const jar = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) => jar.set(name, value, options));
      },
    },
  });
}

/** Service-role client. Server-only. Never expose to the browser. */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
