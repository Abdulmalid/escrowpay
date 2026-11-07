'use client';

import { useCallback, useEffect, useState } from 'react';

export type Role = 'client' | 'freelancer';
export interface Session {
  role: Role;
  name: string;
  email: string;
}

const KEY = 'escrowpay.session.v1';

/**
 * Test-mode session. There are no passwords: anyone can "sign in" as any email so that
 * a reviewer can play both sides of a project (client and freelancer) in two tabs.
 */
export function useSession() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && (s.role === 'client' || s.role === 'freelancer') && s.email && s.name) setSessionState(s);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s);
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable — session lives in memory only */
    }
  }, []);

  return { session, setSession, ready };
}

export const TEST_ACCOUNTS: (Session & { blurb: string })[] = [
  { role: 'client', name: 'Apex Global Ventures', email: 'billing@apexventures.io', blurb: 'Hiring Chidi · funded project, work to review' },
  { role: 'client', name: 'Novus Labs UK', email: 'finance@novuslabs.co.uk', blurb: 'Hiring Amina · deposit not paid yet' },
  { role: 'freelancer', name: 'Chidi Okonkwo', email: 'chidi.dev@protonmail.com', blurb: 'Developer in Lagos · already got one payout' },
  { role: 'freelancer', name: 'Amina Kimani', email: 'amina.ux@creative.co.ke', blurb: 'Designer in Nairobi · M-Pesa payouts' },
];

export const sameEmail = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
