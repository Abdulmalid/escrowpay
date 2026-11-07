import { Contract, BlaaizLogEntry } from './types';
import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * Storage layer.
 *  - If DATABASE_URL is set  -> Postgres (Supabase). Row-level locking makes read-modify-write atomic.
 *  - Otherwise               -> local JSON files (dev only), serialised through an in-process queue.
 *
 * Every function is async. Use `mutateContract` for any read-modify-write so concurrent
 * requests (double-clicked payout, replayed webhook) cannot clobber each other.
 */

const DATA_FILE = path.join(process.cwd(), '.contracts_data.json');
const LOGS_FILE = path.join(process.cwd(), '.blaaiz_logs.json');
const EVENTS_FILE = path.join(process.cwd(), '.webhook_events.json');
const MAX_LOGS = 200;

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'cnt_8f9a2b1c',
    title: 'Cross-Border Fintech Mobile App Architecture',
    description: 'Design and develop cross-border remittance gateway with Flutter, Node.js and Blaaiz APIs.',
    clientName: 'Apex Global Ventures LLC',
    clientEmail: 'billing@apexventures.io',
    freelancerName: 'Chidi Okonkwo',
    freelancerEmail: 'chidi.dev@protonmail.com',
    freelancerCountry: 'Nigeria',
    totalAmount: 2500,
    currency: 'USD',
    targetPayoutCurrency: 'NGN',
    payoutMethod: 'bank_transfer',
    payoutDetails: {
      bankName: 'Zenith Bank PLC',
      accountNumber: '2109847321',
      bankCode: '057',
    },
    autoHedgeStablecoin: true,
    status: 'ESCROWED_HEDGED',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    virtualAccount: {
      id: 'va_991823ab',
      accountNumber: '8839201948',
      routingNumber: '021000021',
      bankName: 'Community Federal Savings Bank / Blaaiz Clearing',
      accountName: 'EscrowPay / Chidi Okonkwo',
      currency: 'USD',
      merchantReference: 'ESCROW-cnt_8f9a2b1c',
      country: 'USA',
      expiresAt: new Date(Date.now() + 27 * 86400000).toISOString(),
    },
    hedgeDetails: {
      hedgedTo: 'USDC',
      amountHedged: 2500,
      initialFxRate: 1650,
      currentFxRate: 1740,
      valueSavedNgn: 225000, // 2500 * (1740 - 1650) = 225,000 NGN protected!
      swappedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      txHash: '0x7e29a98d3618bf5d9c10427847ef290a38d8f993108ba1c38531a788912efda4',
    },
    milestones: [
      {
        id: 'ms_1',
        title: 'Phase 1: Architecture Blueprint & API Contracts',
        description: 'Complete OpenAPI specs, DB schema and Blaaiz sandbox test flows',
        amount: 1000,
        percentage: 40,
        status: 'DISBURSED',
        submissionUrl: 'https://github.com/apex-global/remit-app/pull/12',
        submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        approvedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        payoutRef: 'blz_disburse_98f12a3c77b1',
      },
      {
        id: 'ms_2',
        title: 'Phase 2: MVP UI & Webhook Automation',
        description: 'Deliver responsive Next.js frontend and automated deposit webhook listener',
        amount: 1500,
        percentage: 60,
        status: 'SUBMITTED',
        submissionUrl: 'https://github.com/apex-global/remit-app/pull/24',
        submittedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
    ],
  },
  {
    id: 'cnt_4a11c89e',
    title: 'Brand Identity & Design System',
    description: 'Full design guidelines, Figma components and marketing deck for UK market entry.',
    clientName: 'Novus Labs UK',
    clientEmail: 'finance@novuslabs.co.uk',
    freelancerName: 'Amina Kimani',
    freelancerEmail: 'amina.ux@creative.co.ke',
    freelancerCountry: 'Kenya',
    totalAmount: 1200,
    currency: 'GBP',
    targetPayoutCurrency: 'KES',
    payoutMethod: 'mobile_money',
    payoutDetails: {
      mobileNumber: '+254712345678',
      networkProvider: 'Safaricom M-Pesa',
    },
    autoHedgeStablecoin: true,
    status: 'AWAITING_DEPOSIT',
    createdAt: new Date().toISOString(),
    virtualAccount: {
      id: 'va_gbp_392019',
      accountNumber: '48201948',
      sortCode: '04-00-04',
      bankName: 'ClearBank UK Ltd / Blaaiz Virtual Account',
      accountName: 'EscrowPay / Amina Kimani',
      currency: 'GBP',
      merchantReference: 'ESCROW-cnt_4a11c89e',
      country: 'United Kingdom',
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    milestones: [
      {
        id: 'ms_gbp_1',
        title: 'Brand Moodboards & Typography Rules',
        description: 'Provide 3 design directions and finalized color tokens',
        amount: 500,
        percentage: 42,
        status: 'PENDING_DEPOSIT',
      },
      {
        id: 'ms_gbp_2',
        title: 'Complete Figma Component Library & Export',
        description: 'Interactive prototypes and dark/light system variables',
        amount: 700,
        percentage: 58,
        status: 'PENDING_DEPOSIT',
      },
    ],
  },
];

export const INITIAL_LOGS: BlaaizLogEntry[] = [
  {
    id: 'log_01',
    type: 'API_CALL',
    endpoint: 'POST /oauth/token',
    status: 'SUCCESS',
    title: 'OAuth2 Client Credentials Exchanged',
    details: {
      scope: 'wallet:read payout:create virtual_account:create webhook:write',
      expires_in: 3600,
    },
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'log_02',
    type: 'API_CALL',
    endpoint: 'POST /api/external/virtual-account',
    status: 'SUCCESS',
    title: 'USD Dedicated Account Provisioned (Community Federal)',
    details: {
      account_number: '8839201948',
      routing_number: '021000021',
      merchant_reference: 'ESCROW-cnt_8f9a2b1c',
    },
    timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    id: 'log_03',
    type: 'WEBHOOK_RECEIVED',
    endpoint: 'POST /api/webhooks/blaaiz (collection_url)',
    status: 'SUCCESS',
    title: 'Inbound Wire Verified (x-blaaiz-signature matched)',
    details: {
      event: 'collection.successful',
      amount: 2500,
      currency: 'USD',
      method: 'ach_push',
    },
    timestamp: new Date(Date.now() - 13 * 60000).toISOString(),
  },
  {
    id: 'log_04',
    type: 'SWAP_EXECUTED',
    endpoint: 'POST /api/external/swap',
    status: 'SUCCESS',
    title: 'Auto-Hedge Swap: 2,500 USD -> 2,500 USDC',
    details: {
      rail: 'Polygon PoS',
      hedged_token: 'USDC',
      txHash: '0x7e29a98d3618bf5d9c10427847ef290a38d8f993108ba1c38531a788912efda4',
    },
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
  },
];

/* -------------------------------------------------------------------------- */
/*  Postgres (Supabase)                                                        */
/* -------------------------------------------------------------------------- */

const SCHEMA_SQL = `
create table if not exists escrow_contracts (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists escrow_logs (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists escrow_webhook_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);
-- Tables in "public" are exposed by Supabase's REST API. Enabling RLS with no policies
-- blocks the anon/authenticated keys; this server connects as "postgres" which bypasses RLS.
alter table escrow_contracts enable row level security;
alter table escrow_logs enable row level security;
alter table escrow_webhook_events enable row level security;
`;

const g = globalThis as unknown as {
  __escrowPool?: Pool;
  __escrowDbReady?: Promise<void>;
  __escrowFileQueues?: Record<string, Promise<unknown>>;
};

export function usingDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

function getPool(): Pool {
  if (!g.__escrowPool) {
    g.__escrowPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase presents a certificate that isn't in Node's default CA store.
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
    g.__escrowPool.on('error', (e) => console.error('Postgres pool error:', e.message));
  }
  return g.__escrowPool;
}

function ensureDb(): Promise<void> {
  if (!g.__escrowDbReady) {
    g.__escrowDbReady = (async () => {
      const pool = getPool();
      await pool.query(SCHEMA_SQL);
      const { rows } = await pool.query('select count(*)::int as n from escrow_contracts');
      if (rows[0].n === 0) {
        for (const c of INITIAL_CONTRACTS) {
          await pool.query(
            'insert into escrow_contracts (id, data, created_at) values ($1, $2, $3) on conflict (id) do nothing',
            [c.id, c, c.createdAt]
          );
        }
        for (const l of INITIAL_LOGS) {
          await pool.query(
            'insert into escrow_logs (id, data, created_at) values ($1, $2, $3) on conflict (id) do nothing',
            [l.id, l, l.timestamp]
          );
        }
      }
    })().catch((e) => {
      g.__escrowDbReady = undefined; // allow retry on next request
      throw e;
    });
  }
  return g.__escrowDbReady;
}

/* -------------------------------------------------------------------------- */
/*  File fallback (dev)                                                        */
/* -------------------------------------------------------------------------- */

let memoryContracts: Contract[] = [...INITIAL_CONTRACTS];
let memoryLogs: BlaaizLogEntry[] = [...INITIAL_LOGS];
let memoryEvents: string[] = [];

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.error(`Failed to read ${path.basename(file)}, using memory:`, e);
  }
  return fallback;
}

function writeJson(file: string, value: unknown) {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch (e) {
    console.error(`Failed to write ${path.basename(file)}:`, e);
  }
}

/**
 * Serialise file-mode critical sections per resource ('contracts' | 'logs' | 'events').
 * Separate queues matter: a contract mutation may write a log entry while holding its lock.
 */
function fileLock<T>(name: 'contracts' | 'logs' | 'events', fn: () => Promise<T>): Promise<T> {
  const queues = (g.__escrowFileQueues ??= {});
  const prev = queues[name] ?? Promise.resolve();
  const run = prev.then(fn, fn);
  queues[name] = run.catch(() => undefined);
  return run;
}

/* -------------------------------------------------------------------------- */
/*  Contracts                                                                  */
/* -------------------------------------------------------------------------- */

export async function getContracts(): Promise<Contract[]> {
  if (usingDatabase()) {
    await ensureDb();
    const { rows } = await getPool().query(
      `select data from escrow_contracts order by data->>'createdAt' desc, id desc`
    );
    return rows.map((r) => r.data as Contract);
  }
  memoryContracts = readJson(DATA_FILE, memoryContracts);
  return memoryContracts;
}

export async function getContractById(id: string): Promise<Contract | undefined> {
  if (usingDatabase()) {
    await ensureDb();
    const { rows } = await getPool().query('select data from escrow_contracts where id = $1', [id]);
    return rows[0]?.data as Contract | undefined;
  }
  return (await getContracts()).find((c) => c.id === id);
}

export async function addContract(contract: Contract): Promise<Contract> {
  if (usingDatabase()) {
    await ensureDb();
    await getPool().query(
      'insert into escrow_contracts (id, data, created_at) values ($1, $2, $3)',
      [contract.id, contract, contract.createdAt]
    );
    return contract;
  }
  return fileLock('contracts', async () => {
    const all = await getContracts();
    memoryContracts = [contract, ...all];
    writeJson(DATA_FILE, memoryContracts);
    return contract;
  });
}

/**
 * Atomic read-modify-write. `fn` receives the current contract and returns the new one.
 * Throwing inside `fn` aborts the write. Returns undefined if the contract doesn't exist.
 */
export async function mutateContract(
  id: string,
  fn: (current: Contract) => Contract | Promise<Contract>
): Promise<Contract | undefined> {
  if (usingDatabase()) {
    await ensureDb();
    const client: PoolClient = await getPool().connect();
    try {
      await client.query('begin');
      const { rows } = await client.query('select data from escrow_contracts where id = $1 for update', [id]);
      if (!rows[0]) {
        await client.query('rollback');
        return undefined;
      }
      const next = await fn(rows[0].data as Contract);
      await client.query('update escrow_contracts set data = $2 where id = $1', [id, next]);
      await client.query('commit');
      return next;
    } catch (e) {
      await client.query('rollback').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }
  return fileLock('contracts', async () => {
    const all = await getContracts();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    const next = await fn(all[index]);
    const updated = [...all];
    updated[index] = next;
    memoryContracts = updated;
    writeJson(DATA_FILE, updated);
    return next;
  });
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract | undefined> {
  return mutateContract(id, (c) => ({ ...c, ...updates }));
}

/* -------------------------------------------------------------------------- */
/*  Logs                                                                       */
/* -------------------------------------------------------------------------- */

export async function getLogs(limit = 50): Promise<BlaaizLogEntry[]> {
  if (usingDatabase()) {
    await ensureDb();
    const { rows } = await getPool().query(
      'select data from escrow_logs order by created_at desc, id desc limit $1',
      [limit]
    );
    return rows.map((r) => r.data as BlaaizLogEntry);
  }
  memoryLogs = readJson(LOGS_FILE, memoryLogs);
  return memoryLogs.slice(0, limit);
}

export async function addLog(log: Omit<BlaaizLogEntry, 'id' | 'timestamp'>): Promise<BlaaizLogEntry> {
  const entry: BlaaizLogEntry = {
    id: `log_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  try {
    if (usingDatabase()) {
      await ensureDb();
      const pool = getPool();
      await pool.query('insert into escrow_logs (id, data, created_at) values ($1, $2, $3)', [
        entry.id,
        entry,
        entry.timestamp,
      ]);
      await pool.query(
        `delete from escrow_logs where id in (
           select id from escrow_logs order by created_at desc, id desc offset $1
         )`,
        [MAX_LOGS]
      );
    } else {
      await fileLock('logs', async () => {
        const all = await getLogs(MAX_LOGS);
        memoryLogs = [entry, ...all].slice(0, MAX_LOGS);
        writeJson(LOGS_FILE, memoryLogs);
      });
    }
  } catch (e) {
    // An audit-log failure must never abort a payment or webhook flow.
    console.error('Failed to write log entry:', e);
  }
  return entry;
}

/* -------------------------------------------------------------------------- */
/*  Webhook idempotency                                                        */
/* -------------------------------------------------------------------------- */

/** Returns true if this event id is new (and records it), false if it was already processed. */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  if (usingDatabase()) {
    await ensureDb();
    const res = await getPool().query(
      'insert into escrow_webhook_events (event_id) values ($1) on conflict (event_id) do nothing',
      [eventId]
    );
    return (res.rowCount ?? 0) > 0;
  }
  return fileLock('events', async () => {
    memoryEvents = readJson(EVENTS_FILE, memoryEvents);
    if (memoryEvents.includes(eventId)) return false;
    memoryEvents = [...memoryEvents, eventId].slice(-1000);
    writeJson(EVENTS_FILE, memoryEvents);
    return true;
  });
}

/** Release a claimed event (used when processing failed so the sender's retry can succeed). */
export async function releaseWebhookEvent(eventId: string): Promise<void> {
  if (usingDatabase()) {
    await ensureDb();
    await getPool().query('delete from escrow_webhook_events where event_id = $1', [eventId]);
    return;
  }
  await fileLock('events', async () => {
    memoryEvents = readJson(EVENTS_FILE, memoryEvents).filter((e) => e !== eventId);
    writeJson(EVENTS_FILE, memoryEvents);
  });
}
