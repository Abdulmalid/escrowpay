-- EscrowPay Global initial schema (production path).
-- P0 runs on the demo store; this migration provisions Supabase for P1 wiring.
-- Conventions: uuid PKs, minor-unit bigints, timestamptz, RLS everywhere,
-- money tables writable by service role only, ledger + audit append-only.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_contract_participant(c_id uuid)
returns boolean language sql stable security definer as $$
  select public.is_admin() or exists (
    select 1 from public.contracts c
    where c.id = c_id
      and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('client', 'freelancer', 'admin')),
  blaaiz_customer_id text,
  created_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'blaaiz' check (provider in ('demo', 'blaaiz')),
  provider_wallet_id text not null,
  currency char(3) not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_wallet_id)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) between 10 and 8000),
  currency char(3) not null,
  total_minor bigint not null check (total_minor > 0),
  status text not null default 'active'
    check (status in ('draft', 'active', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled')),
  client_id uuid not null references public.profiles (id),
  freelancer_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id <> freelancer_id)
);
create index contracts_client on public.contracts (client_id);
create index contracts_freelancer on public.contracts (freelancer_id);

create table public.contract_participants (
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('payer', 'payee', 'arbiter')),
  created_at timestamptz not null default now(),
  primary key (contract_id, user_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  seq int not null check (seq > 0),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 4000),
  requirements text not null default '',
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_funding', 'funded', 'in_progress', 'submitted',
      'under_review', 'approved', 'release_pending', 'released',
      'disputed', 'cancelled'
    )),
  funded_minor bigint not null default 0 check (funded_minor >= 0),
  due_at timestamptz,
  evidence_text text,
  evidence_urls text[] not null default '{}',
  pr_reference text,
  test_summary text,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, seq)
);
create index milestones_contract on public.milestones (contract_id);
create index milestones_status on public.milestones (status);

create table public.milestone_deliverables (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  kind text not null check (kind in ('text', 'url', 'pr', 'tests')),
  uri_hash text,
  content text,
  version int not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);
create index deliverables_milestone on public.milestone_deliverables (milestone_id);

create table public.funding_transactions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete set null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  provider text not null check (provider in ('demo', 'blaaiz')),
  provider_ref text not null unique,
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'failed', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funding_contract on public.funding_transactions (contract_id);
create index funding_milestone on public.funding_transactions (milestone_id);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tx_group uuid not null,
  account text not null check (account in ('escrow', 'payable', 'receivable', 'fee', 'refund')),
  dc text not null check (dc in ('debit', 'credit')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  ref_type text not null check (ref_type in ('funding', 'milestone', 'payout', 'dispute', 'fee')),
  ref_id uuid not null,
  memo text,
  created_at timestamptz not null default now()
);
create index ledger_tx_group on public.ledger_entries (tx_group);
create index ledger_ref on public.ledger_entries (ref_type, ref_id);

-- Balance enforcement, deferred to commit so multi-row inserts pass.
create or replace function public.assert_tx_group_balanced()
returns trigger language plpgsql as $$
declare
  net bigint;
begin
  select coalesce(sum(case when dc = 'debit' then amount_minor else -amount_minor end), 0)
    into net
    from public.ledger_entries
   where tx_group = new.tx_group and currency = new.currency;
  if net <> 0 then
    raise exception 'Unbalanced ledger tx_group % (%)', new.tx_group, new.currency;
  end if;
  return new;
end;
$$;

create constraint trigger ledger_balanced
  after insert on public.ledger_entries
  deferrable initially deferred
  for each row execute function public.assert_tx_group_balanced();

create or replace function public.reject_append_only_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Table % is append-only', TG_TABLE_NAME;
end;
$$;

create trigger ledger_no_mutation
  before update or delete on public.ledger_entries
  for each row execute function public.reject_append_only_mutation();

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  rail text not null
    check (rail in ('bank_transfer', 'interac', 'ach', 'wire', 'mobile_money')),
  currency char(3) not null,
  account_hint text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, label, currency)
);

create table public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  beneficiary_id uuid not null references public.beneficiaries (id),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  provider text not null check (provider in ('demo', 'blaaiz')),
  provider_ref text,
  idempotency_key text not null unique,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payouts_milestone on public.payout_requests (milestone_id);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('demo', 'blaaiz')),
  event_id text not null unique,
  event text not null,
  payload jsonb not null default '{}',
  status text not null default 'received'
    check (status in ('received', 'applied', 'duplicate', 'rejected', 'ignored')),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  raised_by uuid not null references public.profiles (id),
  reason text not null check (char_length(reason) between 10 and 4000),
  status text not null default 'open'
    check (status in ('open', 'resolved', 'rejected', 'cancelled')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index disputes_milestone on public.disputes (milestone_id);

create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  uploader uuid not null references public.profiles (id),
  uri text,
  uri_hash text,
  note text,
  created_at timestamptz not null default now()
);

create table public.milestone_verifications (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  source text not null check (source in ('llm', 'heuristic')),
  verdict text not null check (verdict in ('READY', 'NEEDS_WORK', 'UNCERTAIN')),
  score int not null check (score >= 0 and score <= 100),
  assessment jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index verifications_milestone on public.milestone_verifications (milestone_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id uuid not null,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_entity on public.audit_logs (entity, entity_id);

create trigger audit_no_mutation
  before update or delete on public.audit_logs
  for each row execute function public.reject_append_only_mutation();

-- updated_at triggers
create trigger contracts_updated before update on public.contracts
  for each row execute function public.set_updated_at();
create trigger milestones_updated before update on public.milestones
  for each row execute function public.set_updated_at();
create trigger funding_updated before update on public.funding_transactions
  for each row execute function public.set_updated_at();
create trigger payouts_updated before update on public.payout_requests
  for each row execute function public.set_updated_at();
create trigger disputes_updated before update on public.disputes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_participants enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_deliverables enable row level security;
alter table public.funding_transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.payout_requests enable row level security;
alter table public.webhook_events enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.milestone_verifications enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Least privilege: start from nothing, then grant per table below.
revoke all on all tables in schema public from anon, authenticated;

-- profiles: read self + counterparties, update self
grant select, update on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.contracts c
      where (c.client_id = auth.uid() or c.freelancer_id = auth.uid())
        and (c.client_id = profiles.id or c.freelancer_id = profiles.id)
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- wallets: admin only (service role bypasses RLS for server writes)
grant select on public.wallets to authenticated;
create policy wallets_select on public.wallets for select to authenticated
  using (public.is_admin());

-- contracts: participants read; owners create/update
grant select, insert, update on public.contracts to authenticated;
create policy contracts_select on public.contracts for select to authenticated
  using (public.is_contract_participant(id));
create policy contracts_insert on public.contracts for insert to authenticated
  with check (client_id = auth.uid());
create policy contracts_update on public.contracts for update to authenticated
  using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

-- participants: participant-scoped reads
grant select on public.contract_participants to authenticated;
create policy participants_select on public.contract_participants for select to authenticated
  using (public.is_contract_participant(contract_id));

-- milestones: participant reads; writes via service role only
grant select on public.milestones to authenticated;
create policy milestones_select on public.milestones for select to authenticated
  using (public.is_contract_participant(contract_id));

grant select on public.milestone_deliverables to authenticated;
create policy deliverables_select on public.milestone_deliverables for select to authenticated
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_contract_participant(m.contract_id)
    )
  );

-- money tables: participant reads; service-role writes only
grant select on public.funding_transactions to authenticated;
create policy funding_select on public.funding_transactions for select to authenticated
  using (public.is_contract_participant(contract_id));

grant select on public.ledger_entries to authenticated;
create policy ledger_select on public.ledger_entries for select to authenticated
  using (
    public.is_admin()
    or (ref_type = 'milestone' and exists (
      select 1 from public.milestones m
      where m.id = ref_id and public.is_contract_participant(m.contract_id)))
    or (ref_type = 'funding' and exists (
      select 1 from public.funding_transactions f
      where f.id = ref_id and public.is_contract_participant(f.contract_id)))
    or (ref_type in ('payout', 'fee') and exists (
      select 1 from public.payout_requests p
      join public.milestones m on m.id = p.milestone_id
      where (p.id = ref_id or m.id = ref_id)
        and public.is_contract_participant(m.contract_id)))
    or (ref_type = 'dispute' and exists (
      select 1 from public.disputes d
      join public.milestones m on m.id = d.milestone_id
      where d.id = ref_id and public.is_contract_participant(m.contract_id)))
  );

grant select on public.payout_requests to authenticated;
create policy payouts_select on public.payout_requests for select to authenticated
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_contract_participant(m.contract_id)
    )
  );

-- beneficiaries: owners only
grant select, insert, update on public.beneficiaries to authenticated;
create policy beneficiaries_all on public.beneficiaries for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- webhooks + audit: admin reads; service-role writes
grant select on public.webhook_events to authenticated;
create policy webhooks_select on public.webhook_events for select to authenticated
  using (public.is_admin());
grant select on public.audit_logs to authenticated;
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin());

-- disputes: participants read/open
grant select, insert on public.disputes to authenticated;
create policy disputes_select on public.disputes for select to authenticated
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_contract_participant(m.contract_id)
    )
  );
create policy disputes_insert on public.disputes for insert to authenticated
  with check (
    raised_by = auth.uid() and exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_contract_participant(m.contract_id)
    )
  );

grant select, insert on public.dispute_evidence to authenticated;
create policy dispute_evidence_select on public.dispute_evidence for select to authenticated
  using (
    exists (
      select 1 from public.disputes d
      join public.milestones m on m.id = d.milestone_id
      where d.id = dispute_id and public.is_contract_participant(m.contract_id)
    )
  );
create policy dispute_evidence_insert on public.dispute_evidence for insert to authenticated
  with check (uploader = auth.uid());

-- verifications: participant reads
grant select on public.milestone_verifications to authenticated;
create policy verifications_select on public.milestone_verifications for select to authenticated
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_contract_participant(m.contract_id)
    )
  );

-- notifications: owner only
grant select, update on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
